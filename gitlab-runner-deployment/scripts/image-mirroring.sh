#!/usr/bin/env bash
set -euo pipefail

# Docker Image Mirroring Script
# Mirror public Docker images to private registry with vulnerability scanning
# Supports skopeo, crane, and docker with tool detection and fallback

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration - using EXACT environment variables as specified
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REGISTRY_HOST="${REGISTRY_HOST:-}"
REGISTRY_USER="${REGISTRY_USER:-}"
REGISTRY_PASSWORD="${REGISTRY_PASSWORD:-}"
CA_CERT_FILE="${CA_CERT_FILE:-}"
SCAN_IMAGES="${SCAN_IMAGES:-true}" 
SIGN_IMAGES="${SIGN_IMAGES:-false}"
COSIGN_KEY="${COSIGN_KEY:-}"

# Proxy configuration
USE_PROXY="${USE_PROXY:-false}"
HTTP_PROXY="${HTTP_PROXY:-}"
HTTPS_PROXY="${HTTPS_PROXY:-}"
NO_PROXY="${NO_PROXY:-}"

# Image mirroring configuration
SRC_IMAGE="${SRC_IMAGE:-}"
DEST_REGISTRY_PATH="${DEST_REGISTRY_PATH:-}"
DEST_TAG="${DEST_TAG:-}"
PUSH_LATEST="${PUSH_LATEST:-false}"

# Default images to mirror (if SRC_IMAGE not set)
DEFAULT_IMAGES=(
  "alpine:3.19"
  "docker:24-dind"
  "gitlab/gitlab-runner:alpine"
  "ubuntu:22.04"
  "node:20-alpine"
  "python:3.11-slim"
)

# Tool selection (set by detection)
MIRROR_TOOL=""

# Logging functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $*"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $*"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $*" >&2
}

# Check if command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Setup proxy if enabled
setup_proxy() {
  if [ "$USE_PROXY" = "true" ]; then
    log_info "Configuring proxy settings..."
    [ -n "$HTTP_PROXY" ] && export HTTP_PROXY
    [ -n "$HTTPS_PROXY" ] && export HTTPS_PROXY
    [ -n "$NO_PROXY" ] && export NO_PROXY
    log_success "Proxy configured"
  fi
}

# Detect available mirroring tool
detect_mirror_tool() {
  log_info "Detecting available image mirroring tools..."
  
  if command_exists skopeo; then
    MIRROR_TOOL="skopeo"
    log_success "Using skopeo for image mirroring"
  elif command_exists crane; then
    MIRROR_TOOL="crane"
    log_success "Using crane for image mirroring"
  elif command_exists docker; then
    MIRROR_TOOL="docker"
    log_success "Using docker for image mirroring"
  else
    log_error "No image mirroring tool found (skopeo, crane, or docker)"
    log_info "Please install one of: skopeo (preferred), crane, or docker"
    exit 1
  fi
}

# Validate prerequisites
validate_prerequisites() {
  log_info "Validating prerequisites..."
  
  detect_mirror_tool
  
  if [ "$SCAN_IMAGES" = "true" ] && ! command_exists trivy; then
    log_warning "Trivy not found, image scanning will be skipped"
    SCAN_IMAGES="false"
  fi
  
  if [ "$SIGN_IMAGES" = "true" ]; then
    if ! command_exists cosign; then
      log_warning "Cosign not found, image signing will be skipped"
      SIGN_IMAGES="false"
    elif [ -z "$COSIGN_KEY" ]; then
      log_warning "COSIGN_KEY not set, image signing will be skipped"
      SIGN_IMAGES="false"
    fi
  fi
  
  log_success "Prerequisites validated"
}

# Validate environment
validate_environment() {
  log_info "Validating environment..."
  
  if [ -z "$REGISTRY_HOST" ]; then
    log_error "REGISTRY_HOST is not set"
    exit 1
  fi
  
  if [ -z "$REGISTRY_USER" ] || [ -z "$REGISTRY_PASSWORD" ]; then
    log_error "Registry credentials not set (REGISTRY_USER, REGISTRY_PASSWORD)"
    exit 1
  fi
  
  log_success "Environment validated"
}

# Login to registry using detected tool
registry_login() {
  log_info "Logging in to registry: $REGISTRY_HOST..."
  
  local login_success=false
  
  case "$MIRROR_TOOL" in
    skopeo)
      if [ -n "$CA_CERT_FILE" ]; then
        skopeo login --authfile="${HOME}/.docker/config.json" \
          --cert-dir="$(dirname "$CA_CERT_FILE")" \
          --username="$REGISTRY_USER" \
          --password="$REGISTRY_PASSWORD" \
          "$REGISTRY_HOST" && login_success=true
      else
        skopeo login --authfile="${HOME}/.docker/config.json" \
          --username="$REGISTRY_USER" \
          --password="$REGISTRY_PASSWORD" \
          "$REGISTRY_HOST" && login_success=true
      fi
      ;;
    crane)
      echo "$REGISTRY_PASSWORD" | crane auth login "$REGISTRY_HOST" \
        --username "$REGISTRY_USER" \
        --password-stdin && login_success=true
      ;;
    docker)
      echo "$REGISTRY_PASSWORD" | docker login "$REGISTRY_HOST" \
        --username "$REGISTRY_USER" \
        --password-stdin && login_success=true
      ;;
  esac
  
  if [ "$login_success" = true ]; then
    log_success "Logged in to registry"
  else
    log_error "Failed to login to registry"
    exit 1
  fi
}

# Scan image with Trivy
scan_image() {
  local image="$1"
  
  log_info "Scanning image: $image"
  
  trivy image \
    --severity HIGH,CRITICAL \
    --exit-code 0 \
    --no-progress \
    "$image"
  
  local exit_code=$?
  
  if [ $exit_code -eq 0 ]; then
    log_success "Image scan passed: $image"
    return 0
  else
    log_error "Image scan found vulnerabilities: $image"
    return 1
  fi
}

# Sign image with Cosign
sign_image() {
  local image="$1"
  
  if [ -z "$COSIGN_KEY" ]; then
    log_warning "COSIGN_KEY not set, skipping signing"
    return 0
  fi
  
  log_info "Signing image: $image"
  
  cosign sign --key "$COSIGN_KEY" "$image"
  
  log_success "Image signed: $image"
}

# Mirror image using skopeo
mirror_with_skopeo() {
  local source="$1"
  local target="$2"
  
  local skopeo_opts=()
  [ -n "$CA_CERT_FILE" ] && skopeo_opts+=(--src-cert-dir="$(dirname "$CA_CERT_FILE")" --dest-cert-dir="$(dirname "$CA_CERT_FILE")")
  
  skopeo copy "${skopeo_opts[@]}" \
    "docker://$source" \
    "docker://$target"
}

# Mirror image using crane
mirror_with_crane() {
  local source="$1"
  local target="$2"
  
  crane copy "$source" "$target"
}

# Mirror image using docker
mirror_with_docker() {
  local source="$1"
  local target="$2"
  
  docker pull "$source"
  docker tag "$source" "$target"
  docker push "$target"
  docker rmi "$source" "$target" >/dev/null 2>&1 || true
}

# Extract image name without registry and tag
extract_image_name() {
  local image="$1"
  
  # Remove registry prefix (everything before the first slash, if it contains a dot or colon)
  local name="$image"
  if [[ "$name" =~ ^[^/]*[.:][^/]*/(.+)$ ]]; then
    name="${BASH_REMATCH[1]}"
  elif [[ "$name" =~ ^[^/]+/(.+)$ ]]; then
    # Handle cases like gitlab.com/ubuntu:22.04
    name="${BASH_REMATCH[1]}"
  fi
  
  # Extract just the image name without tag
  name="${name%%:*}"
  
  echo "$name"
}

# Extract tag from image
extract_image_tag() {
  local image="$1"
  
  if [[ "$image" =~ :([^:]+)$ ]]; then
    echo "${BASH_REMATCH[1]}"
  else
    echo "latest"
  fi
}

# Mirror single image
mirror_image() {
  local source_image="$1"
  local dest_registry_path="${2:-}"
  local dest_tag="${3:-}"
  
  # Extract image name (without registry and without tag)
  local image_name
  image_name=$(extract_image_name "$source_image")
  
  # Extract original tag if dest_tag not specified
  if [ -z "$dest_tag" ]; then
    dest_tag=$(extract_image_tag "$source_image")
  fi
  
  # Build destination path: REGISTRY_HOST/DEST_REGISTRY_PATH/image_name:tag
  local target_image
  if [ -n "$dest_registry_path" ]; then
    # Remove trailing slash from dest_registry_path if present
    dest_registry_path="${dest_registry_path%/}"
    target_image="$REGISTRY_HOST/$dest_registry_path/$image_name:$dest_tag"
  else
    target_image="$REGISTRY_HOST/$image_name:$dest_tag"
  fi
  
  log_info "Mirroring: $source_image -> $target_image"
  
  # Scan if enabled (only for docker, as we need local image)
  if [ "$SCAN_IMAGES" = "true" ] && [ "$MIRROR_TOOL" = "docker" ]; then
    docker pull "$source_image"
    if ! scan_image "$source_image"; then
      log_error "Scan failed for $source_image, skipping mirror"
      return 1
    fi
  fi
  
  # Mirror based on tool
  case "$MIRROR_TOOL" in
    skopeo)
      mirror_with_skopeo "$source_image" "$target_image"
      ;;
    crane)
      mirror_with_crane "$source_image" "$target_image"
      ;;
    docker)
      mirror_with_docker "$source_image" "$target_image"
      ;;
  esac
  
  # Push as :latest if requested
  if [ "$PUSH_LATEST" = "true" ]; then
    local latest_target
    if [ -n "$dest_registry_path" ]; then
      latest_target="$REGISTRY_HOST/$dest_registry_path/$image_name:latest"
    else
      latest_target="$REGISTRY_HOST/$image_name:latest"
    fi
    
    log_info "Tagging as latest: $latest_target"
    
    case "$MIRROR_TOOL" in
      skopeo)
        skopeo copy "docker://$target_image" "docker://$latest_target"
        ;;
      crane)
        crane copy "$target_image" "$latest_target"
        ;;
      docker)
        docker pull "$target_image"
        docker tag "$target_image" "$latest_target"
        docker push "$latest_target"
        docker rmi "$latest_target" >/dev/null 2>&1 || true
        ;;
    esac
  fi
  
  # Sign if enabled
  if [ "$SIGN_IMAGES" = "true" ]; then
    sign_image "$target_image"
  fi
  
  log_success "Successfully mirrored: $source_image"
}

# Mirror all images
mirror_all_images() {
  log_info "Starting image mirroring process..."
  
  local images_to_process=()
  
  # Determine images to mirror
  if [ -n "$SRC_IMAGE" ]; then
    log_info "Mirroring single image: $SRC_IMAGE"
    images_to_process=("$SRC_IMAGE")
  else
    log_info "Mirroring default image set (${#DEFAULT_IMAGES[@]} images)"
    images_to_process=("${DEFAULT_IMAGES[@]}")
  fi
  
  local success_count=0
  local failed_count=0
  local failed_images=()
  
  for image in "${images_to_process[@]}"; do
    if mirror_image "$image" "$DEST_REGISTRY_PATH" "$DEST_TAG"; then
      ((success_count++))
    else
      ((failed_count++))
      failed_images+=("$image")
    fi
    log_info ""
  done
  
  # Display summary
  log_info "============================================"
  log_info "Mirroring Summary"
  log_info "============================================"
  log_success "Successful: $success_count"
  
  if [ $failed_count -gt 0 ]; then
    log_error "Failed: $failed_count"
    log_error "Failed images:"
    for img in "${failed_images[@]}"; do
      log_error "  - $img"
    done
  fi
  
  return $failed_count
}

# Generate mirror configuration
generate_mirror_config() {
  log_info "Generating mirror configuration..."
  
  cat > "${SCRIPT_DIR}/image-mirrors.yaml" <<EOF
# Image Mirror Configuration
# Generated on: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
# Tool used: ${MIRROR_TOOL}
# Registry: ${REGISTRY_HOST}
# Destination Path: ${DEST_REGISTRY_PATH}

mirrors:
EOF
  
  local images_to_doc=()
  if [ -n "$SRC_IMAGE" ]; then
    images_to_doc=("$SRC_IMAGE")
  else
    images_to_doc=("${DEFAULT_IMAGES[@]}")
  fi
  
  for image in "${images_to_doc[@]}"; do
    local image_name
    image_name=$(extract_image_name "$image")
    local image_tag
    image_tag=$(extract_image_tag "$image")
    
    local target_path
    if [ -n "$DEST_REGISTRY_PATH" ]; then
      target_path="${REGISTRY_HOST}/${DEST_REGISTRY_PATH%/}/${image_name}:${image_tag}"
    else
      target_path="${REGISTRY_HOST}/${image_name}:${image_tag}"
    fi
    
    cat >> "${SCRIPT_DIR}/image-mirrors.yaml" <<EOF
  - source: ${image}
    target: ${target_path}
EOF
  done
  
  log_success "Configuration saved to: ${SCRIPT_DIR}/image-mirrors.yaml"
}

# Main execution
main() {
  log_info "Docker Image Mirroring Tool"
  log_info "Registry: $REGISTRY_HOST"
  log_info "Destination Path: $DEST_REGISTRY_PATH"
  log_info "Scan enabled: $SCAN_IMAGES"
  log_info "Sign enabled: $SIGN_IMAGES"
  log_info "Proxy enabled: $USE_PROXY"
  log_info ""
  
  setup_proxy
  validate_prerequisites
  validate_environment
  registry_login
  
  if mirror_all_images; then
    generate_mirror_config
    log_success "All images mirrored successfully!"
    exit 0
  else
    log_warning "Some images failed to mirror"
    exit 1
  fi
}

# Run main function
main "$@"
