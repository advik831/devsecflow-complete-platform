# Security Best Practices

Security guidelines and best practices for GitLab Runner deployment on Kubernetes.

## Table of Contents

- [Credential Management](#credential-management)
- [Network Security](#network-security)
- [Container Security](#container-security)
- [Access Control](#access-control)
- [Monitoring and Auditing](#monitoring-and-auditing)
- [Compliance](#compliance)

---

## Credential Management

### Environment Variables

**DO:**
- ✅ Store credentials in `.env.gitlab-runner` (gitignored)
- ✅ Use Kubernetes Secrets for sensitive data
- ✅ Rotate credentials regularly (every 90 days)
- ✅ Use strong, unique passwords
- ✅ Limit credential access to necessary personnel

**DON'T:**
- ❌ Commit `.env.gitlab-runner` to version control
- ❌ Share credentials via email or chat
- ❌ Use default or weak passwords
- ❌ Store credentials in plain text files
- ❌ Reuse credentials across environments

### Kubernetes Secrets

```bash
# Create secrets securely
kubectl create secret generic my-secret \
  --from-literal=password=$(openssl rand -base64 32) \
  -n ${NAMESPACE}

# Encrypt secrets at rest
# Enable encryption in Kubernetes API server
# https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/

# Use external secret management (recommended)
# - HashiCorp Vault
# - AWS Secrets Manager
# - Azure Key Vault
# - Google Secret Manager
```

### GitLab Runner Registration Token

```bash
# Protect registration token
# 1. Use project-specific tokens instead of instance-wide
# 2. Rotate tokens regularly
# 3. Disable unused runners
# 4. Monitor runner registration events

# Lock runners to specific projects
RUNNER_LOCKED=true

# Disable running untagged jobs
RUNNER_RUN_UNTAGGED=false
```

### Azure Storage Credentials

```bash
# Use SAS tokens with limited permissions
AZURE_USE_ACCOUNT_KEY=false
AZURE_SAS_TOKEN=your-sas-token

# SAS token best practices:
# - Set expiration date
# - Limit to specific container
# - Grant minimum required permissions (read, write)
# - Use IP restrictions if possible
# - Rotate regularly

# Generate SAS token with Azure CLI
az storage container generate-sas \
  --account-name ${AZURE_ACCOUNT_NAME} \
  --name ${AZURE_CONTAINER_NAME} \
  --permissions rwl \
  --expiry $(date -u -d "90 days" '+%Y-%m-%dT%H:%MZ') \
  --https-only
```

---

## Network Security

### TLS/SSL Configuration

```bash
# Always use HTTPS
GITLAB_URL=https://gitlab.example.com
REGISTRY_HOST=registry.example.com  # Use HTTPS

# Provide CA certificates for self-signed certs
CA_CERT_FILE=/path/to/ca.crt

# Verify TLS certificates
# Don't disable certificate verification in production
```

### Network Policies

Create network policies to restrict traffic:

```yaml
# network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: gitlab-runner-netpol
  namespace: gitlab-runner
spec:
  podSelector:
    matchLabels:
      app: gitlab-runner
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: monitoring
      ports:
        - protocol: TCP
          port: 9252  # Metrics
  egress:
    # Allow DNS
    - to:
        - namespaceSelector:
            matchLabels:
              name: kube-system
      ports:
        - protocol: UDP
          port: 53
    # Allow GitLab
    - to:
        - podSelector: {}
      ports:
        - protocol: TCP
          port: 443
    # Allow Docker registry
    - to:
        - podSelector: {}
      ports:
        - protocol: TCP
          port: 443
```

Apply network policy:
```bash
kubectl apply -f network-policy.yaml
```

### Proxy Configuration

```bash
# Use corporate proxy for internet access
USE_PROXY=true
HTTP_PROXY=http://proxy.example.com:8080
HTTPS_PROXY=https://proxy.example.com:8443

# Configure NO_PROXY for internal services
NO_PROXY=localhost,127.0.0.1,.example.com,.svc,.cluster.local

# Proxy authentication (if required)
HTTP_PROXY=http://user:pass@proxy.example.com:8080
```

### Private Endpoints

```bash
# Use private endpoints for Azure Blob Storage
AZURE_STORAGE_DOMAIN=blob.core.windows.net

# Or use private link
AZURE_STORAGE_DOMAIN=privatelink.blob.core.windows.net

# Configure firewall rules
# - Restrict access to specific IP ranges
# - Use service endpoints
# - Enable private endpoints
```

---

## Container Security

### Image Security

```bash
# Use specific image tags (not latest)
RUNNER_DEFAULT_IMAGE=alpine:3.18

# Pull images from trusted registries only
REGISTRY_HOST=registry.example.com

# Scan images for vulnerabilities
trivy image ${REGISTRY_HOST}/gitlab/gitlab-runner:alpine-v16.5.0

# Sign and verify images
# Use Docker Content Trust or Notary
export DOCKER_CONTENT_TRUST=1
```

### Pod Security

```yaml
# Pod Security Standards
# Apply restricted policy

apiVersion: v1
kind: Namespace
metadata:
  name: gitlab-runner
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

### Security Context

The deployment uses secure defaults:

```yaml
securityContext:
  runAsUser: 999
  runAsNonRoot: true
  fsGroup: 999
  allowPrivilegeEscalation: false
  capabilities:
    drop:
      - ALL
  seccompProfile:
    type: RuntimeDefault
```

### Privileged Mode

```bash
# Avoid privileged mode if possible
RUNNER_PRIVILEGED=false

# If Docker-in-Docker is required:
# - Use rootless Docker
# - Implement additional security controls
# - Monitor container activities
# - Use separate runner for privileged jobs
```

---

## Access Control

### RBAC Configuration

The deployment creates minimal RBAC permissions:

```yaml
rbac:
  create: true
  rules:
    - apiGroups: [""]
      resources: ["pods", "pods/exec", "pods/attach", "pods/log"]
      verbs: ["get", "list", "watch", "create", "delete", "update", "patch"]
    - apiGroups: [""]
      resources: ["secrets", "configmaps"]
      verbs: ["get", "list", "watch", "create", "update", "patch"]
```

**Best Practices:**
- ✅ Use least privilege principle
- ✅ Create separate service accounts per runner
- ✅ Limit namespace access
- ✅ Audit RBAC permissions regularly
- ✅ Use RoleBindings instead of ClusterRoleBindings

### Service Account

```bash
# Use dedicated service account
SERVICE_ACCOUNT_NAME=gitlab-runner

# Don't use default service account
# Don't mount service account token if not needed

# Disable automounting (if not needed)
automountServiceAccountToken: false
```

### Runner Tags

```bash
# Use tags to control job execution
RUNNER_TAGS=docker,kubernetes,production

# Lock runners to specific projects
RUNNER_LOCKED=true

# Disable untagged jobs
RUNNER_RUN_UNTAGGED=false

# Create separate runners for different security zones
# - Development runner (less restrictive)
# - Production runner (highly restrictive)
```

---

## Monitoring and Auditing

### Logging

```bash
# Enable comprehensive logging
LOG_LEVEL=info
LOG_FORMAT=json

# Collect logs centrally
# - ELK Stack (Elasticsearch, Logstash, Kibana)
# - Splunk
# - CloudWatch
# - Azure Monitor

# Monitor for suspicious activities:
# - Failed authentication attempts
# - Unusual job patterns
# - Resource exhaustion
# - Network anomalies
```

### Metrics

```bash
# Enable Prometheus metrics
ENABLE_METRICS=true
METRICS_PORT=9252

# Monitor key metrics:
# - Job success/failure rates
# - Job duration
# - Resource utilization
# - Queue length
# - Runner availability
```

### Audit Trail

```bash
# Enable Kubernetes audit logging
# Configure audit policy for runner namespace

# Monitor events
kubectl get events -n ${NAMESPACE} --watch

# Track changes
kubectl get events -n ${NAMESPACE} \
  --field-selector involvedObject.kind=Secret \
  --watch

# Use admission controllers
# - OPA (Open Policy Agent)
# - Kyverno
# - Gatekeeper
```

### Security Scanning

```bash
# Scan images regularly
trivy image ${REGISTRY_HOST}/gitlab/gitlab-runner:alpine-v16.5.0

# Scan Kubernetes manifests
trivy config custom-values.yaml

# Runtime security
# - Falco
# - Sysdig
# - Aqua Security

# Vulnerability management
# - Regular patching
# - Automated updates
# - Security advisories monitoring
```

---

## Compliance

### Data Protection

```bash
# Encrypt data at rest
# - Kubernetes secrets encryption
# - Azure Blob Storage encryption

# Encrypt data in transit
# - TLS for all connections
# - Mutual TLS (mTLS) where possible

# Data residency
# - Use appropriate Azure regions
# - Configure data retention policies
# - Implement data classification
```

### Compliance Standards

**GDPR:**
- Implement data minimization
- Enable data deletion capabilities
- Maintain audit logs
- Document data processing

**SOC 2:**
- Access controls
- Change management
- Monitoring and alerting
- Incident response

**PCI DSS:**
- Network segmentation
- Encryption
- Access logging
- Regular security testing

### Security Policies

```bash
# Implement security policies
# 1. Password policy
# 2. Access control policy
# 3. Incident response policy
# 4. Change management policy
# 5. Data retention policy

# Document procedures
# 1. Deployment procedure
# 2. Rollback procedure
# 3. Incident response procedure
# 4. Disaster recovery procedure
```

---

## Security Checklist

### Pre-Deployment

- [ ] Review and update all credentials
- [ ] Configure TLS/SSL certificates
- [ ] Set up network policies
- [ ] Configure RBAC with least privilege
- [ ] Enable pod security policies
- [ ] Scan container images
- [ ] Review security context settings
- [ ] Configure audit logging
- [ ] Set up monitoring and alerting
- [ ] Document security procedures

### Post-Deployment

- [ ] Verify runner registration
- [ ] Test network connectivity
- [ ] Verify secret encryption
- [ ] Check RBAC permissions
- [ ] Review pod security
- [ ] Test backup and recovery
- [ ] Verify monitoring is working
- [ ] Conduct security assessment
- [ ] Train team on security procedures
- [ ] Schedule regular security reviews

### Ongoing

- [ ] Rotate credentials (90 days)
- [ ] Update container images (monthly)
- [ ] Review access logs (weekly)
- [ ] Scan for vulnerabilities (weekly)
- [ ] Update security policies (quarterly)
- [ ] Conduct security audits (quarterly)
- [ ] Review and update documentation (quarterly)
- [ ] Security training (annually)

---

## Incident Response

### Security Incident Procedure

1. **Detect**: Monitor logs and alerts
2. **Contain**: Isolate affected resources
3. **Investigate**: Analyze logs and events
4. **Remediate**: Fix vulnerabilities
5. **Recover**: Restore normal operations
6. **Document**: Record incident details
7. **Review**: Conduct post-mortem

### Emergency Contacts

```bash
# Maintain list of contacts
# - Security team
# - DevOps team
# - Management
# - Vendors (GitLab, Azure, etc.)
```

### Rollback Procedure

```bash
# Quick rollback
helm rollback ${HELM_RELEASE} -n ${NAMESPACE}

# Complete removal
helm uninstall ${HELM_RELEASE} -n ${NAMESPACE}
kubectl delete namespace ${NAMESPACE}

# Restore from backup
# Follow documented recovery procedure
```

---

## Resources

- [Kubernetes Security Best Practices](https://kubernetes.io/docs/concepts/security/)
- [GitLab Runner Security](https://docs.gitlab.com/runner/security/)
- [CIS Kubernetes Benchmark](https://www.cisecurity.org/benchmark/kubernetes)
- [OWASP Container Security](https://owasp.org/www-project-docker-top-10/)
- [Azure Security Best Practices](https://docs.microsoft.com/en-us/azure/security/)

---

## Contact

For security concerns or to report vulnerabilities:
- Email: security@example.com
- Do not use public issue trackers for security issues
