#!/bin/bash

################################################################################
# GitLab Runner Kubernetes Deployment - Main Orchestrator
################################################################################
# Description: Main script to orchestrate GitLab Runner deployment on K8s
# Author: DevOps Team
# Version: 1.0.0
# License: MIT
################################################################################

set -euo pipefail

################################################################################
# Global Variables
################################################################################
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="${SCRIPT_DIR}/scripts"
LOGS_DIR="${SCRIPT_DIR}/logs"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="${LOGS_DIR}/deployment-${TIMESTAMP}.log"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

################################################################################
# Functions
################################################################################

# Initialize logging
init_logging() {
    mkdir -p "${LOGS_DIR}"
    touch "${LOG_FILE}"
    log "INFO" "=== GitLab Runner Deployment Started ==="
    log "INFO" "Timestamp: ${TIMESTAMP}"
    log "INFO" "Log file: ${LOG_FILE}"
}

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo "[${timestamp}] [${level}] ${message}" | tee -a "${LOG_FILE}"
    
    # Also print to console with colors
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
        *)
            echo "[${level}] ${message}"
            ;;
    esac
}

# Error handler
error_exit() {
    log "ERROR" "$1"
    log "ERROR" "Deployment failed. Check logs at: ${LOG_FILE}"
    exit 1
}

# Load environment variables
load_env() {
    local env_file="${SCRIPT_DIR}/.env.gitlab-runner"
    
    if [[ ! -f "${env_file}" ]]; then
        error_exit "Environment file not found: ${env_file}. Please copy .env.gitlab-runner.example to .env.gitlab-runner and configure it."
    fi
    
    log "INFO" "Loading environment variables from ${env_file}"
    
    # Source the environment file
    set -a
    source "${env_file}"
    set +a
    
    log "SUCCESS" "Environment variables loaded successfully"
}

# Validate required environment variables
validate_env() {
    log "INFO" "Validating required environment variables..."
    
    local required_vars=(
        "NAMESPACE"
        "REGISTRY_HOST"
        "REGISTRY_USER"
        "REGISTRY_PASSWORD"
        "HELM_RELEASE"
        "HELM_CHART_VERSION"
        "GITLAB_URL"
        "RUNNER_REGISTRATION_TOKEN"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            missing_vars+=("${var}")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        error_exit "Missing required environment variables: ${missing_vars[*]}"
    fi
    
    log "SUCCESS" "All required environment variables are set"
}

# Print deployment summary
print_summary() {
    log "INFO" "=== Deployment Configuration Summary ==="
    log "INFO" "Namespace: ${NAMESPACE}"
    log "INFO" "Registry: ${REGISTRY_HOST}"
    log "INFO" "Helm Release: ${HELM_RELEASE}"
    log "INFO" "Helm Chart Version: ${HELM_CHART_VERSION}"
    log "INFO" "GitLab URL: ${GITLAB_URL}"
    log "INFO" "Runner Tags: ${RUNNER_TAGS:-none}"
    log "INFO" "Max Concurrent: ${RUNNER_MAX_CONCURRENT:-10}"
    log "INFO" "Azure Storage Account: ${AZURE_ACCOUNT_NAME:-not configured}"
    log "INFO" "Proxy Enabled: ${USE_PROXY:-false}"
    log "INFO" "Dry Run: ${DRY_RUN:-false}"
    log "INFO" "Debug Mode: ${DEBUG:-false}"
    log "INFO" "========================================"
}

# Check if running in dry run mode
check_dry_run() {
    if [[ "${DRY_RUN:-false}" == "true" ]]; then
        log "WARN" "Running in DRY RUN mode - no actual changes will be made"
        return 0
    fi
    return 1
}

# Execute script with error handling
execute_script() {
    local script_name=$1
    local script_path="${SCRIPTS_DIR}/${script_name}"
    
    if [[ ! -f "${script_path}" ]]; then
        error_exit "Script not found: ${script_path}"
    fi
    
    if [[ ! -x "${script_path}" ]]; then
        log "WARN" "Script not executable, making it executable: ${script_path}"
        chmod +x "${script_path}"
    fi
    
    log "INFO" "Executing: ${script_name}"
    
    if check_dry_run; then
        log "INFO" "[DRY RUN] Would execute: ${script_path}"
        return 0
    fi
    
    if bash "${script_path}" 2>&1 | tee -a "${LOG_FILE}"; then
        log "SUCCESS" "Completed: ${script_name}"
        return 0
    else
        error_exit "Failed to execute: ${script_name}"
    fi
}

# Create namespace if it doesn't exist
create_namespace() {
    log "INFO" "Checking if namespace '${NAMESPACE}' exists..."
    
    if check_dry_run; then
        log "INFO" "[DRY RUN] Would create namespace: ${NAMESPACE}"
        return 0
    fi
    
    if kubectl get namespace "${NAMESPACE}" &>/dev/null; then
        log "INFO" "Namespace '${NAMESPACE}' already exists"
    else
        log "INFO" "Creating namespace '${NAMESPACE}'..."
        kubectl create namespace "${NAMESPACE}" || error_exit "Failed to create namespace"
        log "SUCCESS" "Namespace '${NAMESPACE}' created successfully"
    fi
}

# Main deployment flow
main() {
    log "INFO" "Starting GitLab Runner deployment process..."
    
    # Initialize
    init_logging
    load_env
    validate_env
    print_summary
    
    # Step 1: Check prerequisites
    if [[ "${SKIP_PREREQ_CHECK:-false}" != "true" ]]; then
        log "INFO" "Step 1: Checking prerequisites..."
        execute_script "check-prerequisites.sh"
    else
        log "WARN" "Skipping prerequisites check (SKIP_PREREQ_CHECK=true)"
    fi
    
    # Step 2: Create namespace
    log "INFO" "Step 2: Setting up Kubernetes namespace..."
    create_namespace
    
    # Step 3: Mirror images to private registry
    if [[ "${SKIP_IMAGE_MIRROR:-false}" != "true" ]]; then
        log "INFO" "Step 3: Mirroring images to private registry..."
        execute_script "image-mirroring.sh"
    else
        log "WARN" "Skipping image mirroring (SKIP_IMAGE_MIRROR=true)"
    fi
    
    # Step 4: Configure Azure Blob cache
    log "INFO" "Step 4: Configuring Azure Blob cache..."
    execute_script "azure-blob-cache.sh"
    
    # Step 5: Generate custom values.yaml
    log "INFO" "Step 5: Generating custom Helm values..."
    execute_script "generate-values.sh"
    
    # Step 6: Deploy GitLab Runner
    log "INFO" "Step 6: Deploying GitLab Runner..."
    execute_script "gitlab-runner-deployment.sh"
    
    # Deployment complete
    log "SUCCESS" "=== GitLab Runner Deployment Completed Successfully ==="
    log "INFO" "Deployment logs saved to: ${LOG_FILE}"
    
    # Print post-deployment information
    print_post_deployment_info
}

# Print post-deployment information
print_post_deployment_info() {
    log "INFO" "=== Post-Deployment Information ==="
    
    if check_dry_run; then
        log "INFO" "[DRY RUN] Skipping post-deployment checks"
        return 0
    fi
    
    log "INFO" "Checking deployment status..."
    
    # Check pods
    log "INFO" "Runner pods:"
    kubectl get pods -n "${NAMESPACE}" -l app=gitlab-runner 2>&1 | tee -a "${LOG_FILE}" || true
    
    # Check services
    log "INFO" "Services:"
    kubectl get svc -n "${NAMESPACE}" 2>&1 | tee -a "${LOG_FILE}" || true
    
    # Check secrets
    log "INFO" "Secrets:"
    kubectl get secrets -n "${NAMESPACE}" 2>&1 | tee -a "${LOG_FILE}" || true
    
    log "INFO" ""
    log "INFO" "Useful commands:"
    log "INFO" "  View runner logs:    kubectl logs -n ${NAMESPACE} -l app=gitlab-runner -f"
    log "INFO" "  Check runner status: kubectl get pods -n ${NAMESPACE} -l app=gitlab-runner"
    log "INFO" "  Describe deployment: kubectl describe deployment -n ${NAMESPACE} ${HELM_RELEASE}-gitlab-runner"
    log "INFO" "  Uninstall runner:    helm uninstall ${HELM_RELEASE} -n ${NAMESPACE}"
    log "INFO" ""
    log "INFO" "Next steps:"
    log "INFO" "  1. Verify runner appears in GitLab Admin Area > Runners"
    log "INFO" "  2. Test runner with a simple CI/CD job"
    log "INFO" "  3. Monitor runner logs for any issues"
    log "INFO" "  4. Configure additional runners if needed"
    log "INFO" "========================================"
}

# Trap errors
trap 'error_exit "An unexpected error occurred at line $LINENO"' ERR

################################################################################
# Script Entry Point
################################################################################

# Check if help is requested
if [[ "${1:-}" == "-h" ]] || [[ "${1:-}" == "--help" ]]; then
    cat << EOF
GitLab Runner Kubernetes Deployment Script

Usage: $0 [OPTIONS]

Options:
  -h, --help     Show this help message

Environment Variables:
  DRY_RUN              Set to 'true' to run without making changes
  DEBUG                Set to 'true' for verbose logging
  SKIP_IMAGE_MIRROR    Set to 'true' to skip image mirroring
  SKIP_PREREQ_CHECK    Set to 'true' to skip prerequisites check

Configuration:
  Edit .env.gitlab-runner to configure deployment settings

Examples:
  # Normal deployment
  ./deploy-gitlab-runner.sh

  # Dry run
  DRY_RUN=true ./deploy-gitlab-runner.sh

  # Debug mode
  DEBUG=true ./deploy-gitlab-runner.sh

  # Skip image mirroring
  SKIP_IMAGE_MIRROR=true ./deploy-gitlab-runner.sh

For more information, see README.md
EOF
    exit 0
fi

# Run main function
main "$@"
