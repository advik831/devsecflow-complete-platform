#!/bin/bash

################################################################################
# Azure Blob Cache Configuration Script
################################################################################
# Description: Configures Azure Blob Storage as GitLab Runner cache
# Dependencies: kubectl
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

# Validate Azure configuration
validate_azure_config() {
    log "INFO" "Validating Azure Blob Storage configuration..."
    
    local required_vars=(
        "AZURE_ACCOUNT_NAME"
        "AZURE_CONTAINER_NAME"
        "AZURE_STORAGE_DOMAIN"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            missing_vars+=("${var}")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log "ERROR" "Missing required Azure configuration: ${missing_vars[*]}"
        return 1
    fi
    
    # Check authentication method
    if [[ "${AZURE_USE_ACCOUNT_KEY:-true}" == "true" ]]; then
        if [[ -z "${AZURE_ACCOUNT_KEY:-}" ]]; then
            log "ERROR" "AZURE_ACCOUNT_KEY is required when AZURE_USE_ACCOUNT_KEY=true"
            return 1
        fi
        log "INFO" "Using Azure Account Key authentication"
    else
        if [[ -z "${AZURE_SAS_TOKEN:-}" ]]; then
            log "ERROR" "AZURE_SAS_TOKEN is required when AZURE_USE_ACCOUNT_KEY=false"
            return 1
        fi
        log "INFO" "Using Azure SAS Token authentication"
    fi
    
    log "SUCCESS" "Azure configuration validated"
    return 0
}

# Test Azure connectivity (optional)
test_azure_connectivity() {
    log "INFO" "Testing Azure Blob Storage connectivity..."
    
    # Check if az CLI is available
    if ! command -v az &>/dev/null; then
        log "WARN" "Azure CLI not found, skipping connectivity test"
        return 0
    fi
    
    # Try to list containers
    if [[ "${AZURE_USE_ACCOUNT_KEY:-true}" == "true" ]]; then
        if az storage container exists \
            --name "${AZURE_CONTAINER_NAME}" \
            --account-name "${AZURE_ACCOUNT_NAME}" \
            --account-key "${AZURE_ACCOUNT_KEY}" \
            --output none 2>/dev/null; then
            log "SUCCESS" "Successfully connected to Azure Blob Storage"
            log "INFO" "Container '${AZURE_CONTAINER_NAME}' exists"
            return 0
        else
            log "WARN" "Could not verify Azure container (may not exist yet)"
            log "INFO" "Container will be created automatically by GitLab Runner"
            return 0
        fi
    else
        log "INFO" "Skipping connectivity test with SAS token"
        return 0
    fi
}

# Create Kubernetes secret for Azure credentials
create_azure_secret() {
    log "INFO" "Creating Kubernetes secret for Azure credentials..."
    
    local secret_name="azure-cache-credentials"
    
    # Check if secret already exists
    if kubectl get secret "${secret_name}" -n "${NAMESPACE}" &>/dev/null; then
        log "INFO" "Secret '${secret_name}' already exists, updating..."
        kubectl delete secret "${secret_name}" -n "${NAMESPACE}" || true
    fi
    
    # Prepare secret data
    local secret_data=""
    
    if [[ "${AZURE_USE_ACCOUNT_KEY:-true}" == "true" ]]; then
        secret_data="--from-literal=accountName=${AZURE_ACCOUNT_NAME} \
                     --from-literal=accountKey=${AZURE_ACCOUNT_KEY}"
    else
        secret_data="--from-literal=accountName=${AZURE_ACCOUNT_NAME} \
                     --from-literal=sasToken=${AZURE_SAS_TOKEN}"
    fi
    
    # Create secret
    if kubectl create secret generic "${secret_name}" \
        -n "${NAMESPACE}" \
        ${secret_data} \
        --dry-run=client -o yaml | kubectl apply -f -; then
        log "SUCCESS" "Azure credentials secret created successfully"
        return 0
    else
        log "ERROR" "Failed to create Azure credentials secret"
        return 1
    fi
}

# Generate cache configuration for values.yaml
generate_cache_config() {
    log "INFO" "Generating cache configuration..."
    
    local cache_config_file="${PARENT_DIR}/cache-config.yaml"
    
    cat > "${cache_config_file}" << EOF
# Azure Blob Storage Cache Configuration
# Generated by azure-blob-cache.sh

cache:
  type: azure
  azure:
    accountName: ${AZURE_ACCOUNT_NAME}
    containerName: ${AZURE_CONTAINER_NAME}
    storageDomain: ${AZURE_STORAGE_DOMAIN}
EOF

    # Add authentication method
    if [[ "${AZURE_USE_ACCOUNT_KEY:-true}" == "true" ]]; then
        cat >> "${cache_config_file}" << EOF
    credentials:
      accountKey: ${AZURE_ACCOUNT_KEY}
EOF
    else
        cat >> "${cache_config_file}" << EOF
    credentials:
      sasToken: ${AZURE_SAS_TOKEN}
EOF
    fi
    
    log "SUCCESS" "Cache configuration generated: ${cache_config_file}"
    log "INFO" "This configuration will be merged into Helm values"
    
    return 0
}

# Create ConfigMap with cache configuration
create_cache_configmap() {
    log "INFO" "Creating ConfigMap with cache configuration..."
    
    local configmap_name="gitlab-runner-cache-config"
    
    # Check if ConfigMap already exists
    if kubectl get configmap "${configmap_name}" -n "${NAMESPACE}" &>/dev/null; then
        log "INFO" "ConfigMap '${configmap_name}' already exists, updating..."
        kubectl delete configmap "${configmap_name}" -n "${NAMESPACE}" || true
    fi
    
    # Create ConfigMap with cache settings
    if kubectl create configmap "${configmap_name}" \
        -n "${NAMESPACE}" \
        --from-literal=cache-type=azure \
        --from-literal=azure-account-name="${AZURE_ACCOUNT_NAME}" \
        --from-literal=azure-container-name="${AZURE_CONTAINER_NAME}" \
        --from-literal=azure-storage-domain="${AZURE_STORAGE_DOMAIN}" \
        --dry-run=client -o yaml | kubectl apply -f -; then
        log "SUCCESS" "Cache ConfigMap created successfully"
        return 0
    else
        log "ERROR" "Failed to create cache ConfigMap"
        return 1
    fi
}

# Print cache configuration summary
print_cache_summary() {
    log "INFO" ""
    log "INFO" "=== Azure Blob Cache Configuration Summary ==="
    log "INFO" "Storage Account: ${AZURE_ACCOUNT_NAME}"
    log "INFO" "Container Name: ${AZURE_CONTAINER_NAME}"
    log "INFO" "Storage Domain: ${AZURE_STORAGE_DOMAIN}"
    log "INFO" "Authentication: $([ "${AZURE_USE_ACCOUNT_KEY:-true}" == "true" ] && echo "Account Key" || echo "SAS Token")"
    log "INFO" "Namespace: ${NAMESPACE}"
    log "INFO" "=============================================="
    log "INFO" ""
}

# Validate environment variables
validate_env() {
    local required_vars=(
        "NAMESPACE"
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
    log "INFO" "=== Azure Blob Cache Configuration ==="
    log "INFO" ""
    
    # Validate environment
    if ! validate_env; then
        log "ERROR" "Environment validation failed"
        return 1
    fi
    
    # Validate Azure configuration
    if ! validate_azure_config; then
        log "ERROR" "Azure configuration validation failed"
        return 1
    fi
    
    # Test connectivity (optional)
    test_azure_connectivity
    
    log "INFO" ""
    
    # Create Kubernetes resources
    if ! create_azure_secret; then
        log "ERROR" "Failed to create Azure secret"
        return 1
    fi
    
    if ! create_cache_configmap; then
        log "ERROR" "Failed to create cache ConfigMap"
        return 1
    fi
    
    # Generate cache configuration
    if ! generate_cache_config; then
        log "ERROR" "Failed to generate cache configuration"
        return 1
    fi
    
    # Print summary
    print_cache_summary
    
    log "SUCCESS" "Azure Blob cache configuration completed successfully!"
    log "INFO" ""
    log "INFO" "Next steps:"
    log "INFO" "  1. The cache configuration will be applied during Helm deployment"
    log "INFO" "  2. GitLab Runner will automatically create the container if it doesn't exist"
    log "INFO" "  3. Monitor cache usage in Azure Portal"
    log "INFO" ""
    
    return 0
}

################################################################################
# Script Entry Point
################################################################################

main "$@"
