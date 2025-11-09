#!/bin/bash

################################################################################
# Generate Helm Values Script
################################################################################
# Description: Generates custom values.yaml for GitLab Runner Helm chart
# Dependencies: None
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

# Validate required environment variables
validate_env() {
    log "INFO" "Validating environment variables..."
    
    local required_vars=(
        "GITLAB_URL"
        "RUNNER_REGISTRATION_TOKEN"
        "NAMESPACE"
        "REGISTRY_HOST"
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

# Generate runner configuration section
generate_runner_config() {
    cat << EOF
# GitLab Runner Configuration
gitlabUrl: ${GITLAB_URL}
runnerRegistrationToken: "${RUNNER_REGISTRATION_TOKEN}"

# Runner behavior
concurrent: ${RUNNER_MAX_CONCURRENT:-10}
checkInterval: ${CHECK_INTERVAL:-30}
logLevel: ${LOG_LEVEL:-info}
logFormat: ${LOG_FORMAT:-runner}

# Runner tags and settings
runners:
  config: |
    [[runners]]
      [runners.kubernetes]
        namespace = "${NAMESPACE}"
        image = "${RUNNER_DEFAULT_IMAGE:-alpine:latest}"
        privileged = ${RUNNER_PRIVILEGED:-true}
        cpu_request = "${BUILD_CPU_REQUEST:-500m}"
        cpu_limit = "${BUILD_CPU_LIMIT:-2000m}"
        memory_request = "${BUILD_MEMORY_REQUEST:-512Mi}"
        memory_limit = "${BUILD_MEMORY_LIMIT:-4Gi}"
        service_cpu_request = "${RUNNER_CPU_REQUEST:-100m}"
        service_cpu_limit = "${RUNNER_CPU_LIMIT:-1000m}"
        service_memory_request = "${RUNNER_MEMORY_REQUEST:-128Mi}"
        service_memory_limit = "${RUNNER_MEMORY_LIMIT:-512Mi}"
        helper_cpu_request = "${RUNNER_CPU_REQUEST:-100m}"
        helper_cpu_limit = "${RUNNER_CPU_LIMIT:-500m}"
        helper_memory_request = "${RUNNER_MEMORY_REQUEST:-128Mi}"
        helper_memory_limit = "${RUNNER_MEMORY_LIMIT:-256Mi}"
        image_pull_secrets = ["${RUNNER_IMAGE_PULL_SECRETS:-registry-credentials}"]
        pull_policy = "${IMAGE_PULL_POLICY:-IfNotPresent}"
EOF

    # Add cache configuration if Azure is configured
    if [[ -n "${AZURE_ACCOUNT_NAME:-}" ]]; then
        cat << EOF
      [runners.cache]
        Type = "azure"
        Shared = true
        [runners.cache.azure]
          AccountName = "${AZURE_ACCOUNT_NAME}"
          ContainerName = "${AZURE_CONTAINER_NAME}"
          StorageDomain = "${AZURE_STORAGE_DOMAIN}"
EOF
        
        if [[ "${AZURE_USE_ACCOUNT_KEY:-true}" == "true" ]]; then
            cat << EOF
          AccountKey = "${AZURE_ACCOUNT_KEY}"
EOF
        else
            cat << EOF
          SASToken = "${AZURE_SAS_TOKEN}"
EOF
        fi
    fi

    # Add proxy configuration if enabled
    if [[ "${USE_PROXY:-false}" == "true" ]]; then
        cat << EOF
        [runners.kubernetes.pod_annotations]
          "proxy.enabled" = "true"
EOF
    fi

    cat << EOF
  tags: "${RUNNER_TAGS:-docker,kubernetes}"
  runUntagged: ${RUNNER_RUN_UNTAGGED:-true}
  locked: ${RUNNER_LOCKED:-false}
EOF
}

# Generate image configuration
generate_image_config() {
    local dest_path="${DEST_REGISTRY_PATH:-gitlab}"
    local runner_image="${REGISTRY_HOST}/${dest_path}/gitlab-runner:alpine-v16.5.0"
    
    cat << EOF

# Container images
image:
  registry: ${REGISTRY_HOST}
  image: ${dest_path}/gitlab-runner
  tag: alpine-v16.5.0

imagePullPolicy: ${IMAGE_PULL_POLICY:-IfNotPresent}

# Image pull secrets
imagePullSecrets:
  - name: ${RUNNER_IMAGE_PULL_SECRETS:-registry-credentials}
EOF
}

# Generate RBAC configuration
generate_rbac_config() {
    cat << EOF

# RBAC Configuration
rbac:
  create: ${RBAC_ENABLED:-true}
  rules:
    - apiGroups: [""]
      resources: ["pods", "pods/exec", "pods/attach", "pods/log"]
      verbs: ["get", "list", "watch", "create", "delete", "update", "patch"]
    - apiGroups: [""]
      resources: ["secrets", "configmaps"]
      verbs: ["get", "list", "watch", "create", "update", "patch"]
    - apiGroups: [""]
      resources: ["services"]
      verbs: ["get", "list", "watch", "create", "delete"]

serviceAccount:
  create: true
  name: ${SERVICE_ACCOUNT_NAME:-gitlab-runner}
EOF
}

# Generate resource limits
generate_resources_config() {
    cat << EOF

# Resource limits for runner manager pod
resources:
  limits:
    cpu: ${RUNNER_CPU_LIMIT:-1000m}
    memory: ${RUNNER_MEMORY_LIMIT:-512Mi}
  requests:
    cpu: ${RUNNER_CPU_REQUEST:-100m}
    memory: ${RUNNER_MEMORY_REQUEST:-128Mi}
EOF
}

# Generate security context
generate_security_config() {
    cat << EOF

# Security context
securityContext:
  runAsUser: ${RUN_AS_USER:-999}
  fsGroup: ${FS_GROUP:-999}
  runAsNonRoot: true
  allowPrivilegeEscalation: false
  capabilities:
    drop:
      - ALL
  seccompProfile:
    type: RuntimeDefault
EOF
}

# Generate metrics configuration
generate_metrics_config() {
    if [[ "${ENABLE_METRICS:-true}" == "true" ]]; then
        cat << EOF

# Metrics configuration
metrics:
  enabled: true
  port: ${METRICS_PORT:-9252}
  serviceMonitor:
    enabled: false
EOF
    fi
}

# Generate pod annotations
generate_pod_annotations() {
    cat << EOF

# Pod annotations
podAnnotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "${METRICS_PORT:-9252}"
  prometheus.io/path: "/metrics"
EOF

    if [[ "${USE_PROXY:-false}" == "true" ]]; then
        cat << EOF
  proxy.enabled: "true"
  proxy.http: "${HTTP_PROXY:-}"
  proxy.https: "${HTTPS_PROXY:-}"
  proxy.no_proxy: "${NO_PROXY:-}"
EOF
    fi
}

# Generate environment variables
generate_env_vars() {
    cat << EOF

# Environment variables
envVars:
  - name: RUNNER_EXECUTOR
    value: kubernetes
  - name: KUBERNETES_NAMESPACE
    value: ${NAMESPACE}
  - name: RUNNER_TAG_LIST
    value: "${RUNNER_TAGS:-docker,kubernetes}"
EOF

    if [[ "${USE_PROXY:-false}" == "true" ]]; then
        cat << EOF
  - name: HTTP_PROXY
    value: "${HTTP_PROXY:-}"
  - name: HTTPS_PROXY
    value: "${HTTPS_PROXY:-}"
  - name: NO_PROXY
    value: "${NO_PROXY:-}"
  - name: http_proxy
    value: "${HTTP_PROXY:-}"
  - name: https_proxy
    value: "${HTTPS_PROXY:-}"
  - name: no_proxy
    value: "${NO_PROXY:-}"
EOF
    fi
}

# Generate deployment configuration
generate_deployment_config() {
    cat << EOF

# Deployment configuration
replicas: ${RUNNER_REPLICAS:-1}

# Update strategy
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1
    maxUnavailable: 0
EOF
}

# Generate affinity and tolerations
generate_affinity_config() {
    cat << EOF

# Affinity and tolerations
affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchExpressions:
              - key: app
                operator: In
                values:
                  - gitlab-runner
          topologyKey: kubernetes.io/hostname

tolerations: []
EOF
}

# Generate complete values.yaml
generate_values_yaml() {
    log "INFO" "Generating custom values.yaml..."
    
    cat > "${VALUES_FILE}" << 'EOF'
################################################################################
# GitLab Runner Helm Chart Custom Values
################################################################################
# Generated automatically by generate-values.sh
# DO NOT EDIT MANUALLY - Changes will be overwritten
################################################################################

EOF

    # Generate each section
    generate_runner_config >> "${VALUES_FILE}"
    generate_image_config >> "${VALUES_FILE}"
    generate_rbac_config >> "${VALUES_FILE}"
    generate_resources_config >> "${VALUES_FILE}"
    generate_security_config >> "${VALUES_FILE}"
    generate_metrics_config >> "${VALUES_FILE}"
    generate_pod_annotations >> "${VALUES_FILE}"
    generate_env_vars >> "${VALUES_FILE}"
    generate_deployment_config >> "${VALUES_FILE}"
    generate_affinity_config >> "${VALUES_FILE}"
    
    log "SUCCESS" "Custom values.yaml generated: ${VALUES_FILE}"
}

# Validate generated values.yaml
validate_values_yaml() {
    log "INFO" "Validating generated values.yaml..."
    
    if [[ ! -f "${VALUES_FILE}" ]]; then
        log "ERROR" "Values file not found: ${VALUES_FILE}"
        return 1
    fi
    
    # Check if file is not empty
    if [[ ! -s "${VALUES_FILE}" ]]; then
        log "ERROR" "Values file is empty: ${VALUES_FILE}"
        return 1
    fi
    
    # Validate YAML syntax using Python (if available)
    if command -v python3 &>/dev/null; then
        if python3 -c "import yaml; yaml.safe_load(open('${VALUES_FILE}'))" 2>/dev/null; then
            log "SUCCESS" "Values file YAML syntax is valid"
        else
            log "WARN" "Could not validate YAML syntax (non-critical)"
        fi
    fi
    
    log "SUCCESS" "Values file validated"
    return 0
}

# Print values summary
print_values_summary() {
    log "INFO" ""
    log "INFO" "=== Generated Values Summary ==="
    log "INFO" "File: ${VALUES_FILE}"
    log "INFO" "GitLab URL: ${GITLAB_URL}"
    log "INFO" "Namespace: ${NAMESPACE}"
    log "INFO" "Registry: ${REGISTRY_HOST}"
    log "INFO" "Concurrent Jobs: ${RUNNER_MAX_CONCURRENT:-10}"
    log "INFO" "Runner Tags: ${RUNNER_TAGS:-docker,kubernetes}"
    log "INFO" "Cache Type: $([ -n "${AZURE_ACCOUNT_NAME:-}" ] && echo "Azure Blob" || echo "None")"
    log "INFO" "Proxy Enabled: ${USE_PROXY:-false}"
    log "INFO" "Metrics Enabled: ${ENABLE_METRICS:-true}"
    log "INFO" "==============================="
    log "INFO" ""
}

# Main function
main() {
    log "INFO" "=== Generate Helm Values ==="
    log "INFO" ""
    
    # Validate environment
    if ! validate_env; then
        log "ERROR" "Environment validation failed"
        return 1
    fi
    
    # Generate values.yaml
    if ! generate_values_yaml; then
        log "ERROR" "Failed to generate values.yaml"
        return 1
    fi
    
    # Validate generated file
    if ! validate_values_yaml; then
        log "ERROR" "Values file validation failed"
        return 1
    fi
    
    # Print summary
    print_values_summary
    
    log "SUCCESS" "Helm values generation completed successfully!"
    log "INFO" "You can review the generated file at: ${VALUES_FILE}"
    log "INFO" ""
    
    return 0
}

################################################################################
# Script Entry Point
################################################################################

main "$@"
