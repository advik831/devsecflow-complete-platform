#!/bin/bash

################################################################################
# GitLab Runner Deployment Script
################################################################################
# Description: Deploys GitLab Runner to Kubernetes using Helm
# Dependencies: kubectl, helm
################################################################################

set -euo pipefail

################################################################################
# Global Variables
################################################################################
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PARENT_DIR="$(dirname "${SCRIPT_DIR}")"
VALUES_FILE="${PARENT_DIR}/custom-values.yaml"

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

# Validate environment variables
validate_env() {
    log "INFO" "Validating environment variables..."
    
    local required_vars=(
        "NAMESPACE"
        "HELM_RELEASE"
        "HELM_CHART_VERSION"
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
    
    log "SUCCESS" "Environment variables validated"
    return 0
}

# Add Helm repository
add_helm_repo() {
    log "INFO" "Adding GitLab Helm repository..."
    
    local repo_url="${HELM_REPO_URL:-https://charts.gitlab.io}"
    
    # Check if repo already exists
    if helm repo list 2>/dev/null | grep -q "^gitlab"; then
        log "INFO" "GitLab Helm repository already exists"
    else
        if helm repo add gitlab "${repo_url}"; then
            log "SUCCESS" "GitLab Helm repository added"
        else
            log "ERROR" "Failed to add GitLab Helm repository"
            return 1
        fi
    fi
    
    # Update repositories
    log "INFO" "Updating Helm repositories..."
    if helm repo update; then
        log "SUCCESS" "Helm repositories updated"
    else
        log "WARN" "Failed to update Helm repositories (non-critical)"
    fi
    
    return 0
}

# Create registry credentials secret
create_registry_secret() {
    log "INFO" "Creating Docker registry credentials secret..."
    
    local secret_name="${RUNNER_IMAGE_PULL_SECRETS:-registry-credentials}"
    
    # Check if secret already exists
    if kubectl get secret "${secret_name}" -n "${NAMESPACE}" &>/dev/null; then
        log "INFO" "Secret '${secret_name}' already exists, updating..."
        kubectl delete secret "${secret_name}" -n "${NAMESPACE}" || true
    fi
    
    # Create docker-registry secret
    if kubectl create secret docker-registry "${secret_name}" \
        --namespace="${NAMESPACE}" \
        --docker-server="${REGISTRY_HOST}" \
        --docker-username="${REGISTRY_USER}" \
        --docker-password="${REGISTRY_PASSWORD}" \
        --dry-run=client -o yaml | kubectl apply -f -; then
        log "SUCCESS" "Registry credentials secret created"
        return 0
    else
        log "ERROR" "Failed to create registry credentials secret"
        return 1
    fi
}

# Create CA certificate secret if provided
create_ca_cert_secret() {
    if [[ -z "${CA_CERT_FILE:-}" ]] || [[ ! -f "${CA_CERT_FILE}" ]]; then
        log "INFO" "No CA certificate provided, skipping..."
        return 0
    fi
    
    log "INFO" "Creating CA certificate secret..."
    
    local secret_name="registry-ca-cert"
    
    # Check if secret already exists
    if kubectl get secret "${secret_name}" -n "${NAMESPACE}" &>/dev/null; then
        log "INFO" "Secret '${secret_name}' already exists, updating..."
        kubectl delete secret "${secret_name}" -n "${NAMESPACE}" || true
    fi
    
    # Create secret from file
    if kubectl create secret generic "${secret_name}" \
        --namespace="${NAMESPACE}" \
        --from-file=ca.crt="${CA_CERT_FILE}" \
        --dry-run=client -o yaml | kubectl apply -f -; then
        log "SUCCESS" "CA certificate secret created"
        return 0
    else
        log "ERROR" "Failed to create CA certificate secret"
        return 1
    fi
}

# Check if Helm release exists
helm_release_exists() {
    helm list -n "${NAMESPACE}" 2>/dev/null | grep -q "^${HELM_RELEASE}"
}

# Deploy or upgrade GitLab Runner
deploy_runner() {
    log "INFO" "Deploying GitLab Runner..."
    
    # Check if custom values file exists
    if [[ ! -f "${VALUES_FILE}" ]]; then
        log "ERROR" "Custom values file not found: ${VALUES_FILE}"
        log "ERROR" "Please run generate-values.sh first"
        return 1
    fi
    
    # Use custom values file if provided
    local values_arg="-f ${VALUES_FILE}"
    if [[ -n "${CUSTOM_VALUES_FILE:-}" ]] && [[ -f "${CUSTOM_VALUES_FILE}" ]]; then
        log "INFO" "Using additional custom values file: ${CUSTOM_VALUES_FILE}"
        values_arg="${values_arg} -f ${CUSTOM_VALUES_FILE}"
    fi
    
    # Determine if this is an install or upgrade
    local helm_action="install"
    if helm_release_exists; then
        helm_action="upgrade"
        log "INFO" "Existing release found, performing upgrade..."
    else
        log "INFO" "No existing release found, performing fresh install..."
    fi
    
    # Build Helm command
    local helm_cmd="helm ${helm_action} ${HELM_RELEASE} gitlab/gitlab-runner \
        --namespace ${NAMESPACE} \
        --version ${HELM_CHART_VERSION} \
        ${values_arg} \
        --wait \
        --timeout 10m"
    
    # Add atomic flag for install
    if [[ "${helm_action}" == "install" ]]; then
        helm_cmd="${helm_cmd} --atomic"
    fi
    
    # Execute Helm command
    log "INFO" "Executing: ${helm_cmd}"
    
    if eval "${helm_cmd}"; then
        log "SUCCESS" "GitLab Runner ${helm_action} completed successfully"
        return 0
    else
        log "ERROR" "GitLab Runner ${helm_action} failed"
        log "ERROR" "Check Helm and Kubernetes logs for details"
        return 1
    fi
}

# Verify deployment
verify_deployment() {
    log "INFO" "Verifying deployment..."
    
    # Wait for deployment to be ready
    log "INFO" "Waiting for deployment to be ready (timeout: 5 minutes)..."
    
    if kubectl wait --for=condition=available \
        --timeout=300s \
        deployment -l app=gitlab-runner \
        -n "${NAMESPACE}" 2>/dev/null; then
        log "SUCCESS" "Deployment is ready"
    else
        log "WARN" "Deployment readiness check timed out or failed"
        log "INFO" "This may be normal if pods are still starting"
    fi
    
    # Check pod status
    log "INFO" "Checking pod status..."
    local pod_count=$(kubectl get pods -n "${NAMESPACE}" -l app=gitlab-runner --no-headers 2>/dev/null | wc -l)
    
    if [[ ${pod_count} -gt 0 ]]; then
        log "SUCCESS" "Found ${pod_count} runner pod(s)"
        kubectl get pods -n "${NAMESPACE}" -l app=gitlab-runner
    else
        log "ERROR" "No runner pods found"
        return 1
    fi
    
    # Check for running pods
    local running_pods=$(kubectl get pods -n "${NAMESPACE}" -l app=gitlab-runner --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l)
    
    if [[ ${running_pods} -gt 0 ]]; then
        log "SUCCESS" "${running_pods} pod(s) are running"
    else
        log "WARN" "No pods are in Running state yet"
        log "INFO" "Check pod logs for startup issues"
    fi
    
    return 0
}

# Print deployment information
print_deployment_info() {
    log "INFO" ""
    log "INFO" "=== Deployment Information ==="
    
    # Helm release info
    log "INFO" "Helm Release:"
    helm list -n "${NAMESPACE}" | grep "${HELM_RELEASE}" || true
    
    log "INFO" ""
    log "INFO" "Pods:"
    kubectl get pods -n "${NAMESPACE}" -l app=gitlab-runner || true
    
    log "INFO" ""
    log "INFO" "Services:"
    kubectl get svc -n "${NAMESPACE}" -l app=gitlab-runner || true
    
    log "INFO" ""
    log "INFO" "Secrets:"
    kubectl get secrets -n "${NAMESPACE}" | grep -E "(registry|azure|gitlab)" || true
    
    log "INFO" ""
    log "INFO" "ConfigMaps:"
    kubectl get configmaps -n "${NAMESPACE}" | grep -E "(gitlab|runner|cache)" || true
    
    log "INFO" "=============================="
}

# Print useful commands
print_useful_commands() {
    log "INFO" ""
    log "INFO" "=== Useful Commands ==="
    log "INFO" ""
    log "INFO" "View runner logs:"
    log "INFO" "  kubectl logs -n ${NAMESPACE} -l app=gitlab-runner -f"
    log "INFO" ""
    log "INFO" "Check runner status:"
    log "INFO" "  kubectl get pods -n ${NAMESPACE} -l app=gitlab-runner"
    log "INFO" ""
    log "INFO" "Describe runner deployment:"
    log "INFO" "  kubectl describe deployment -n ${NAMESPACE} -l app=gitlab-runner"
    log "INFO" ""
    log "INFO" "Get runner events:"
    log "INFO" "  kubectl get events -n ${NAMESPACE} --sort-by='.lastTimestamp'"
    log "INFO" ""
    log "INFO" "Upgrade runner:"
    log "INFO" "  helm upgrade ${HELM_RELEASE} gitlab/gitlab-runner -n ${NAMESPACE} -f ${VALUES_FILE}"
    log "INFO" ""
    log "INFO" "Uninstall runner:"
    log "INFO" "  helm uninstall ${HELM_RELEASE} -n ${NAMESPACE}"
    log "INFO" ""
    log "INFO" "======================="
}

# Rollback on failure
rollback_on_failure() {
    log "ERROR" "Deployment failed, checking if rollback is needed..."
    
    if helm_release_exists; then
        local revision=$(helm history ${HELM_RELEASE} -n ${NAMESPACE} --max 1 -o json 2>/dev/null | jq -r '.[0].revision' || echo "0")
        
        if [[ ${revision} -gt 1 ]]; then
            log "WARN" "Rolling back to previous revision..."
            
            if helm rollback ${HELM_RELEASE} -n ${NAMESPACE} --wait; then
                log "SUCCESS" "Rollback completed successfully"
            else
                log "ERROR" "Rollback failed"
            fi
        else
            log "INFO" "No previous revision to rollback to"
        fi
    fi
}

# Main function
main() {
    log "INFO" "=== GitLab Runner Deployment ==="
    log "INFO" ""
    
    # Validate environment
    if ! validate_env; then
        log "ERROR" "Environment validation failed"
        return 1
    fi
    
    # Add Helm repository
    if ! add_helm_repo; then
        log "ERROR" "Failed to add Helm repository"
        return 1
    fi
    
    # Create secrets
    if ! create_registry_secret; then
        log "ERROR" "Failed to create registry secret"
        return 1
    fi
    
    create_ca_cert_secret || true
    
    log "INFO" ""
    
    # Deploy runner
    if ! deploy_runner; then
        log "ERROR" "Deployment failed"
        rollback_on_failure
        return 1
    fi
    
    log "INFO" ""
    
    # Verify deployment
    verify_deployment || true
    
    # Print information
    print_deployment_info
    print_useful_commands
    
    log "INFO" ""
    log "SUCCESS" "GitLab Runner deployment completed successfully!"
    log "INFO" ""
    log "INFO" "Next steps:"
    log "INFO" "  1. Verify runner appears in GitLab: Admin Area > Runners"
    log "INFO" "  2. Check runner logs for any issues"
    log "INFO" "  3. Test with a simple CI/CD pipeline"
    log "INFO" ""
    
    return 0
}

################################################################################
# Script Entry Point
################################################################################

main "$@"
