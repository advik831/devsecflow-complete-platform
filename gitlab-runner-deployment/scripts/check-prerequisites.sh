#!/bin/bash

################################################################################
# Check Prerequisites Script
################################################################################
# Description: Validates that all required tools are installed and accessible
# Dependencies: None
################################################################################

set -euo pipefail

################################################################################
# Global Variables
################################################################################
REQUIRED_TOOLS=("kubectl" "helm" "docker" "skopeo" "jq")
OPTIONAL_TOOLS=("az")
MISSING_TOOLS=()
MISSING_OPTIONAL=()

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

# Check if a command exists
command_exists() {
    command -v "$1" &>/dev/null
}

# Get version of a tool
get_version() {
    local tool=$1
    local version=""
    
    case ${tool} in
        kubectl)
            version=$(kubectl version --client --short 2>/dev/null | grep -oP 'v\d+\.\d+\.\d+' | head -1 || echo "unknown")
            ;;
        helm)
            version=$(helm version --short 2>/dev/null | grep -oP 'v\d+\.\d+\.\d+' || echo "unknown")
            ;;
        docker)
            version=$(docker --version 2>/dev/null | grep -oP '\d+\.\d+\.\d+' || echo "unknown")
            ;;
        skopeo)
            version=$(skopeo --version 2>/dev/null | grep -oP '\d+\.\d+\.\d+' || echo "unknown")
            ;;
        jq)
            version=$(jq --version 2>/dev/null | grep -oP '\d+\.\d+' || echo "unknown")
            ;;
        az)
            version=$(az --version 2>/dev/null | grep -oP 'azure-cli\s+\d+\.\d+\.\d+' | grep -oP '\d+\.\d+\.\d+' || echo "unknown")
            ;;
        *)
            version="unknown"
            ;;
    esac
    
    echo "${version}"
}

# Check required tools
check_required_tools() {
    log "INFO" "Checking required tools..."
    
    for tool in "${REQUIRED_TOOLS[@]}"; do
        if command_exists "${tool}"; then
            local version=$(get_version "${tool}")
            log "SUCCESS" "✓ ${tool} is installed (version: ${version})"
        else
            log "ERROR" "✗ ${tool} is NOT installed"
            MISSING_TOOLS+=("${tool}")
        fi
    done
}

# Check optional tools
check_optional_tools() {
    log "INFO" "Checking optional tools..."
    
    for tool in "${OPTIONAL_TOOLS[@]}"; do
        if command_exists "${tool}"; then
            local version=$(get_version "${tool}")
            log "SUCCESS" "✓ ${tool} is installed (version: ${version})"
        else
            log "WARN" "○ ${tool} is NOT installed (optional)"
            MISSING_OPTIONAL+=("${tool}")
        fi
    done
}

# Check Kubernetes connectivity
check_kubernetes_connectivity() {
    log "INFO" "Checking Kubernetes connectivity..."
    
    if ! command_exists kubectl; then
        log "WARN" "Skipping Kubernetes connectivity check (kubectl not found)"
        return 0
    fi
    
    if kubectl cluster-info &>/dev/null; then
        log "SUCCESS" "✓ Successfully connected to Kubernetes cluster"
        
        # Get cluster info
        local cluster_version=$(kubectl version --short 2>/dev/null | grep "Server Version" | grep -oP 'v\d+\.\d+\.\d+' || echo "unknown")
        log "INFO" "  Cluster version: ${cluster_version}"
        
        local current_context=$(kubectl config current-context 2>/dev/null || echo "unknown")
        log "INFO" "  Current context: ${current_context}"
        
        # Check permissions
        if kubectl auth can-i create namespace &>/dev/null; then
            log "SUCCESS" "✓ Have permission to create namespaces"
        else
            log "WARN" "○ May not have permission to create namespaces"
        fi
        
        if kubectl auth can-i create secret &>/dev/null; then
            log "SUCCESS" "✓ Have permission to create secrets"
        else
            log "WARN" "○ May not have permission to create secrets"
        fi
        
    else
        log "ERROR" "✗ Cannot connect to Kubernetes cluster"
        log "ERROR" "  Please check your kubeconfig and cluster connectivity"
        return 1
    fi
}

# Check Helm repositories
check_helm_repos() {
    log "INFO" "Checking Helm repositories..."
    
    if ! command_exists helm; then
        log "WARN" "Skipping Helm repository check (helm not found)"
        return 0
    fi
    
    local gitlab_repo="https://charts.gitlab.io"
    
    if helm repo list 2>/dev/null | grep -q "gitlab"; then
        log "SUCCESS" "✓ GitLab Helm repository is configured"
    else
        log "WARN" "○ GitLab Helm repository not found"
        log "INFO" "  Adding GitLab Helm repository..."
        
        if helm repo add gitlab "${gitlab_repo}" &>/dev/null; then
            log "SUCCESS" "✓ GitLab Helm repository added successfully"
        else
            log "ERROR" "✗ Failed to add GitLab Helm repository"
            return 1
        fi
    fi
    
    log "INFO" "Updating Helm repositories..."
    if helm repo update &>/dev/null; then
        log "SUCCESS" "✓ Helm repositories updated successfully"
    else
        log "WARN" "○ Failed to update Helm repositories"
    fi
}

# Check Docker daemon
check_docker_daemon() {
    log "INFO" "Checking Docker daemon..."
    
    if ! command_exists docker; then
        log "WARN" "Skipping Docker daemon check (docker not found)"
        return 0
    fi
    
    if docker info &>/dev/null; then
        log "SUCCESS" "✓ Docker daemon is running"
        
        local docker_version=$(docker version --format '{{.Server.Version}}' 2>/dev/null || echo "unknown")
        log "INFO" "  Docker server version: ${docker_version}"
    else
        log "WARN" "○ Docker daemon is not running or not accessible"
        log "INFO" "  Note: Docker is only required for local image operations"
    fi
}

# Print installation instructions
print_installation_instructions() {
    if [[ ${#MISSING_TOOLS[@]} -eq 0 ]]; then
        return 0
    fi
    
    log "INFO" ""
    log "INFO" "=== Installation Instructions ==="
    
    for tool in "${MISSING_TOOLS[@]}"; do
        case ${tool} in
            kubectl)
                log "INFO" ""
                log "INFO" "Install kubectl:"
                log "INFO" "  curl -LO \"https://dl.k8s.io/release/\$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl\""
                log "INFO" "  chmod +x kubectl"
                log "INFO" "  sudo mv kubectl /usr/local/bin/"
                ;;
            helm)
                log "INFO" ""
                log "INFO" "Install helm:"
                log "INFO" "  curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash"
                ;;
            docker)
                log "INFO" ""
                log "INFO" "Install docker:"
                log "INFO" "  Amazon Linux 2023:"
                log "INFO" "    sudo dnf install -y docker"
                log "INFO" "    sudo systemctl start docker"
                log "INFO" "    sudo systemctl enable docker"
                log "INFO" "    sudo usermod -aG docker \$USER"
                ;;
            skopeo)
                log "INFO" ""
                log "INFO" "Install skopeo:"
                log "INFO" "  Amazon Linux 2023:"
                log "INFO" "    sudo dnf install -y skopeo"
                log "INFO" "  Ubuntu/Debian:"
                log "INFO" "    sudo apt-get install -y skopeo"
                ;;
            jq)
                log "INFO" ""
                log "INFO" "Install jq:"
                log "INFO" "  Amazon Linux 2023:"
                log "INFO" "    sudo dnf install -y jq"
                log "INFO" "  Ubuntu/Debian:"
                log "INFO" "    sudo apt-get install -y jq"
                ;;
        esac
    done
    
    log "INFO" ""
    log "INFO" "================================="
}

# Main function
main() {
    log "INFO" "=== Prerequisites Check ==="
    log "INFO" ""
    
    check_required_tools
    check_optional_tools
    
    log "INFO" ""
    
    check_kubernetes_connectivity
    check_helm_repos
    check_docker_daemon
    
    log "INFO" ""
    log "INFO" "=== Prerequisites Check Summary ==="
    
    if [[ ${#MISSING_TOOLS[@]} -eq 0 ]]; then
        log "SUCCESS" "✓ All required tools are installed"
        log "INFO" ""
        
        if [[ ${#MISSING_OPTIONAL[@]} -gt 0 ]]; then
            log "INFO" "Optional tools not installed: ${MISSING_OPTIONAL[*]}"
            log "INFO" "These are not required but may be useful for certain operations"
        fi
        
        log "INFO" ""
        log "SUCCESS" "Prerequisites check passed!"
        return 0
    else
        log "ERROR" "✗ Missing required tools: ${MISSING_TOOLS[*]}"
        print_installation_instructions
        log "INFO" ""
        log "ERROR" "Prerequisites check failed!"
        return 1
    fi
}

################################################################################
# Script Entry Point
################################################################################

main "$@"
