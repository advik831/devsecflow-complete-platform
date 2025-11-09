#!/bin/bash

################################################################################
# Image Mirroring Script
################################################################################
# Description: Mirrors container images from public registries to private registry
# Dependencies: skopeo, docker (optional)
################################################################################

set -euo pipefail

################################################################################
# Global Variables
################################################################################
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PARENT_DIR="$(dirname "${SCRIPT_DIR}")"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
TOTAL_IMAGES=0
SUCCESSFUL_MIRRORS=0
FAILED_MIRRORS=0

################################################################################
# Functions
################################################################################

log() {
    local level=$1
    shift
    local message="$*"
    
    case ${level} in
        ERROR)
            echo -e "${RED}[${level}]${NC} ${message}" >&2
            ;;
        WARN)
            echo -e "${YELLOW}[${level}]${NC} ${message}"
            ;;
        SUCCESS)
            echo -e "${GREEN}[${level}]${NC} ${message}"
            ;;
        INFO)
            echo -e "${BLUE}[${level}]${NC} ${message}"
            ;;
    esac
}

# Check if skopeo is available
check_skopeo() {
    if ! command -v skopeo &>/dev/null; then
        log "ERROR" "skopeo is not installed. Please install it first."
        log "INFO" "Amazon Linux 2023: sudo dnf install -y skopeo"
        log "INFO" "Ubuntu/Debian: sudo apt-get install -y skopeo"
        return 1
    fi
    
    local version=$(skopeo --version 2>/dev/null | grep -oP '\d+\.\d+\.\d+' || echo "unknown")
    log "INFO" "Using skopeo version: ${version}"
    return 0
}

# Login to private registry
registry_login() {
    log "INFO" "Logging in to private registry: ${REGISTRY_HOST}"
    
    # Try skopeo login
    if command -v skopeo &>/dev/null; then
        if echo "${REGISTRY_PASSWORD}" | skopeo login \
            --username "${REGISTRY_USER}" \
            --password-stdin \
            "${REGISTRY_HOST}" &>/dev/null; then
            log "SUCCESS" "Successfully logged in to registry (skopeo)"
            return 0
        fi
    fi
    
    # Try docker login as fallback
    if command -v docker &>/dev/null; then
        if echo "${REGISTRY_PASSWORD}" | docker login \
            --username "${REGISTRY_USER}" \
            --password-stdin \
            "${REGISTRY_HOST}" &>/dev/null; then
            log "SUCCESS" "Successfully logged in to registry (docker)"
            return 0
        fi
    fi
    
    log "ERROR" "Failed to login to registry"
    return 1
}

# Check if image exists in destination registry
image_exists() {
    local dest_image=$1
    
    if skopeo inspect "docker://${dest_image}" &>/dev/null; then
        return 0
    else
        return 1
    fi
}

# Mirror a single image
mirror_image() {
    local src_image=$1
    local dest_image=$2
    local push_latest=${3:-false}
    
    log "INFO" "Mirroring: ${src_image} -> ${dest_image}"
    
    # Check if destination image already exists
    if image_exists "${dest_image}"; then
        log "WARN" "Image already exists in destination: ${dest_image}"
        log "INFO" "Skipping (idempotent operation)"
        return 0
    fi
    
    # Copy image using skopeo
    local copy_cmd="skopeo copy"
    
    # Add CA cert if provided
    if [[ -n "${CA_CERT_FILE:-}" ]] && [[ -f "${CA_CERT_FILE}" ]]; then
        copy_cmd="${copy_cmd} --dest-cert-dir=$(dirname ${CA_CERT_FILE})"
    fi
    
    # Add proxy settings if enabled
    if [[ "${USE_PROXY:-false}" == "true" ]]; then
        if [[ -n "${HTTPS_PROXY:-}" ]]; then
            export HTTPS_PROXY="${HTTPS_PROXY}"
        fi
        if [[ -n "${HTTP_PROXY:-}" ]]; then
            export HTTP_PROXY="${HTTP_PROXY}"
        fi
        if [[ -n "${NO_PROXY:-}" ]]; then
            export NO_PROXY="${NO_PROXY}"
        fi
    fi
    
    # Perform the copy
    if ${copy_cmd} \
        --dest-creds "${REGISTRY_USER}:${REGISTRY_PASSWORD}" \
        "docker://${src_image}" \
        "docker://${dest_image}"; then
        log "SUCCESS" "Successfully mirrored: ${dest_image}"
        
        # Push latest tag if requested
        if [[ "${push_latest}" == "true" ]]; then
            local dest_latest="${dest_image%:*}:latest"
            log "INFO" "Tagging as latest: ${dest_latest}"
            
            if ${copy_cmd} \
                --dest-creds "${REGISTRY_USER}:${REGISTRY_PASSWORD}" \
                "docker://${src_image}" \
                "docker://${dest_latest}"; then
                log "SUCCESS" "Successfully tagged as latest: ${dest_latest}"
            else
                log "WARN" "Failed to tag as latest (non-critical)"
            fi
        fi
        
        return 0
    else
        log "ERROR" "Failed to mirror: ${src_image}"
        return 1
    fi
}

# Parse image name and generate destination
parse_and_mirror() {
    local src_image=$1
    
    # Extract image name and tag
    local image_name="${src_image%:*}"
    local image_tag="${src_image##*:}"
    
    # If no tag specified, use latest
    if [[ "${image_name}" == "${image_tag}" ]]; then
        image_tag="latest"
    fi
    
    # Extract just the image name without registry
    local short_name="${image_name##*/}"
    
    # Build destination image path
    local dest_path="${DEST_REGISTRY_PATH:-gitlab}"
    local dest_image="${REGISTRY_HOST}/${dest_path}/${short_name}:${image_tag}"
    
    # Mirror the image
    if mirror_image "${src_image}" "${dest_image}" "${PUSH_LATEST:-false}"; then
        ((SUCCESSFUL_MIRRORS++))
    else
        ((FAILED_MIRRORS++))
    fi
}

# Mirror all configured images
mirror_all_images() {
    log "INFO" "Starting image mirroring process..."
    
    # Check if IMAGES_TO_MIRROR is defined
    if [[ -z "${IMAGES_TO_MIRROR:-}" ]]; then
        log "WARN" "No images configured for mirroring (IMAGES_TO_MIRROR is empty)"
        return 0
    fi
    
    # Count total images
    TOTAL_IMAGES=${#IMAGES_TO_MIRROR[@]}
    log "INFO" "Total images to mirror: ${TOTAL_IMAGES}"
    
    # Mirror each image
    for image in "${IMAGES_TO_MIRROR[@]}"; do
        log "INFO" "Processing: ${image}"
        parse_and_mirror "${image}"
        log "INFO" ""
    done
}

# Mirror custom images from environment variables
mirror_custom_images() {
    # Check for custom image mirroring configuration
    if [[ -n "${SRC_IMAGE:-}" ]] && [[ -n "${DEST_REPO_PATH:-}" ]]; then
        log "INFO" "Mirroring custom image configuration..."
        
        local src="${SRC_IMAGE}"
        local dest_path="${DEST_REPO_PATH}"
        local dest_tag="${DEST_TAG:-latest}"
        local push_latest="${PUSH_LATEST:-false}"
        
        # Extract image name
        local image_name="${src##*/}"
        image_name="${image_name%:*}"
        
        local dest_image="${dest_path}:${dest_tag}"
        
        if mirror_image "${src}" "${dest_image}" "${push_latest}"; then
            ((SUCCESSFUL_MIRRORS++))
        else
            ((FAILED_MIRRORS++))
        fi
        
        ((TOTAL_IMAGES++))
    fi
}

# Print summary
print_summary() {
    log "INFO" ""
    log "INFO" "=== Image Mirroring Summary ==="
    log "INFO" "Total images: ${TOTAL_IMAGES}"
    log "SUCCESS" "Successful: ${SUCCESSFUL_MIRRORS}"
    
    if [[ ${FAILED_MIRRORS} -gt 0 ]]; then
        log "ERROR" "Failed: ${FAILED_MIRRORS}"
    else
        log "INFO" "Failed: ${FAILED_MIRRORS}"
    fi
    
    log "INFO" "==============================="
    
    if [[ ${FAILED_MIRRORS} -gt 0 ]]; then
        log "WARN" "Some images failed to mirror. Check logs above for details."
        return 1
    else
        log "SUCCESS" "All images mirrored successfully!"
        return 0
    fi
}

# Validate environment variables
validate_env() {
    local required_vars=(
        "REGISTRY_HOST"
        "REGISTRY_USER"
        "REGISTRY_PASSWORD"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            missing_vars+=("${var}")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log "ERROR" "Missing required environment variables: ${missing_vars[*]}"
        return 1
    fi
    
    return 0
}

# Main function
main() {
    log "INFO" "=== Image Mirroring Script ==="
    log "INFO" ""
    
    # Validate environment
    if ! validate_env; then
        log "ERROR" "Environment validation failed"
        return 1
    fi
    
    # Check prerequisites
    if ! check_skopeo; then
        return 1
    fi
    
    # Login to registry
    if ! registry_login; then
        return 1
    fi
    
    log "INFO" ""
    
    # Mirror images
    mirror_all_images
    mirror_custom_images
    
    # Print summary
    print_summary
}

################################################################################
# Script Entry Point
################################################################################

main "$@"
