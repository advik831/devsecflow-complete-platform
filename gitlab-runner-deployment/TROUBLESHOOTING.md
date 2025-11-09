# Troubleshooting Guide

Common issues and solutions for GitLab Runner deployment on Kubernetes.

## Table of Contents

- [Prerequisites Issues](#prerequisites-issues)
- [Registry Issues](#registry-issues)
- [Deployment Issues](#deployment-issues)
- [Runner Registration Issues](#runner-registration-issues)
- [Cache Issues](#cache-issues)
- [Network Issues](#network-issues)
- [Performance Issues](#performance-issues)

---

## Prerequisites Issues

### kubectl not found

**Symptom**: `kubectl: command not found`

**Solution**:
```bash
# Download kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"

# Make executable and move to PATH
chmod +x kubectl
sudo mv kubectl /usr/local/bin/

# Verify installation
kubectl version --client
```

### helm not found

**Symptom**: `helm: command not found`

**Solution**:
```bash
# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Verify installation
helm version
```

### skopeo not found

**Symptom**: `skopeo: command not found`

**Solution**:
```bash
# Amazon Linux 2023
sudo dnf install -y skopeo

# Ubuntu/Debian
sudo apt-get update && sudo apt-get install -y skopeo

# Verify installation
skopeo --version
```

### Cannot connect to Kubernetes cluster

**Symptom**: `The connection to the server localhost:8080 was refused`

**Solution**:
```bash
# Check kubeconfig
echo $KUBECONFIG
cat ~/.kube/config

# Test connection
kubectl cluster-info

# Check current context
kubectl config current-context

# List available contexts
kubectl config get-contexts

# Switch context if needed
kubectl config use-context <context-name>
```

---

## Registry Issues

### Registry authentication failed

**Symptom**: `unauthorized: authentication required`

**Solution**:
```bash
# Test registry login manually
docker login ${REGISTRY_HOST} -u ${REGISTRY_USER} -p ${REGISTRY_PASSWORD}

# Check credentials in environment file
cat .env.gitlab-runner | grep REGISTRY

# Verify secret in Kubernetes
kubectl get secret registry-credentials -n ${NAMESPACE} -o yaml

# Recreate secret if needed
kubectl delete secret registry-credentials -n ${NAMESPACE}
./scripts/gitlab-runner-deployment.sh
```

### Self-signed certificate issues

**Symptom**: `x509: certificate signed by unknown authority`

**Solution**:
```bash
# Provide CA certificate
export CA_CERT_FILE=/path/to/ca.crt

# Or skip TLS verification (not recommended for production)
export SKOPEO_INSECURE=true

# Update .env.gitlab-runner
CA_CERT_FILE=/path/to/ca.crt
```

### Image pull errors

**Symptom**: `Failed to pull image: rpc error: code = Unknown`

**Solution**:
```bash
# Check image exists in registry
skopeo inspect docker://${REGISTRY_HOST}/gitlab/gitlab-runner:alpine-v16.5.0

# Verify image pull secret
kubectl get secret registry-credentials -n ${NAMESPACE} -o jsonpath='{.data.\.dockerconfigjson}' | base64 -d

# Check pod events
kubectl describe pod <pod-name> -n ${NAMESPACE}

# Manually pull image to test
docker pull ${REGISTRY_HOST}/gitlab/gitlab-runner:alpine-v16.5.0
```

---

## Deployment Issues

### Namespace already exists

**Symptom**: `Error: namespace already exists`

**Solution**:
This is normal and handled by the script. The script is idempotent.

### Helm chart not found

**Symptom**: `Error: failed to download "gitlab/gitlab-runner"`

**Solution**:
```bash
# Add GitLab Helm repository
helm repo add gitlab https://charts.gitlab.io

# Update repositories
helm repo update

# Search for chart
helm search repo gitlab-runner

# Verify repository
helm repo list
```

### Deployment timeout

**Symptom**: `Error: timed out waiting for the condition`

**Solution**:
```bash
# Check pod status
kubectl get pods -n ${NAMESPACE}

# Check pod logs
kubectl logs -n ${NAMESPACE} -l app=gitlab-runner

# Check events
kubectl get events -n ${NAMESPACE} --sort-by='.lastTimestamp'

# Describe deployment
kubectl describe deployment -n ${NAMESPACE} -l app=gitlab-runner

# Increase timeout
helm upgrade ${HELM_RELEASE} gitlab/gitlab-runner \
  -n ${NAMESPACE} \
  -f custom-values.yaml \
  --timeout 15m
```

### Pods in CrashLoopBackOff

**Symptom**: `CrashLoopBackOff` status

**Solution**:
```bash
# Check pod logs
kubectl logs -n ${NAMESPACE} <pod-name> --previous

# Check pod events
kubectl describe pod <pod-name> -n ${NAMESPACE}

# Common causes:
# 1. Invalid registration token
# 2. Cannot reach GitLab URL
# 3. Resource limits too low
# 4. Missing secrets

# Verify configuration
kubectl get configmap -n ${NAMESPACE} -o yaml
```

---

## Runner Registration Issues

### Runner not appearing in GitLab

**Symptom**: Runner doesn't show up in GitLab Admin Area

**Solution**:
```bash
# Check runner logs for registration
kubectl logs -n ${NAMESPACE} -l app=gitlab-runner | grep -i register

# Verify GitLab URL is accessible from pod
kubectl exec -n ${NAMESPACE} <pod-name> -- wget -O- ${GITLAB_URL}

# Check registration token
echo ${RUNNER_REGISTRATION_TOKEN}

# Get new token from GitLab:
# Admin Area > Runners > Register an instance runner

# Update token in .env.gitlab-runner and redeploy
./deploy-gitlab-runner.sh
```

### Invalid registration token

**Symptom**: `ERROR: Registering runner... failed runner=xxx status=403`

**Solution**:
```bash
# Get new registration token from GitLab
# Admin Area > Runners > Register an instance runner

# Update .env.gitlab-runner
RUNNER_REGISTRATION_TOKEN=new-token-here

# Redeploy
./deploy-gitlab-runner.sh
```

### Runner registered but offline

**Symptom**: Runner shows as offline in GitLab

**Solution**:
```bash
# Check if pods are running
kubectl get pods -n ${NAMESPACE} -l app=gitlab-runner

# Check runner logs
kubectl logs -n ${NAMESPACE} -l app=gitlab-runner -f

# Verify network connectivity to GitLab
kubectl exec -n ${NAMESPACE} <pod-name> -- ping -c 3 gitlab.example.com

# Check if runner is checking for jobs
kubectl logs -n ${NAMESPACE} -l app=gitlab-runner | grep -i "checking for jobs"
```

---

## Cache Issues

### Azure Blob cache not working

**Symptom**: Cache not being saved or restored

**Solution**:
```bash
# Verify Azure credentials
kubectl get secret azure-cache-credentials -n ${NAMESPACE} -o yaml

# Test Azure connectivity
az storage container list \
  --account-name ${AZURE_ACCOUNT_NAME} \
  --account-key ${AZURE_ACCOUNT_KEY}

# Check runner cache configuration
kubectl logs -n ${NAMESPACE} -l app=gitlab-runner | grep -i cache

# Verify cache configuration in values
cat custom-values.yaml | grep -A 10 cache

# Check if container exists
az storage container show \
  --name ${AZURE_CONTAINER_NAME} \
  --account-name ${AZURE_ACCOUNT_NAME} \
  --account-key ${AZURE_ACCOUNT_KEY}
```

### Cache permission denied

**Symptom**: `ERROR: Failed to save cache: access denied`

**Solution**:
```bash
# Verify Azure credentials have write permissions
# Check account key or SAS token permissions

# Regenerate account key if needed
az storage account keys list \
  --account-name ${AZURE_ACCOUNT_NAME} \
  --resource-group ${RESOURCE_GROUP}

# Update credentials
kubectl delete secret azure-cache-credentials -n ${NAMESPACE}
./scripts/azure-blob-cache.sh
```

---

## Network Issues

### Cannot reach GitLab from runner

**Symptom**: `dial tcp: lookup gitlab.example.com: no such host`

**Solution**:
```bash
# Check DNS resolution from pod
kubectl exec -n ${NAMESPACE} <pod-name> -- nslookup gitlab.example.com

# Check network policies
kubectl get networkpolicies -n ${NAMESPACE}

# Verify GitLab URL
echo ${GITLAB_URL}

# Test connectivity
kubectl exec -n ${NAMESPACE} <pod-name> -- curl -I ${GITLAB_URL}
```

### Proxy configuration issues

**Symptom**: Connection timeout when proxy is required

**Solution**:
```bash
# Verify proxy settings in .env.gitlab-runner
cat .env.gitlab-runner | grep PROXY

# Check proxy environment variables in pod
kubectl exec -n ${NAMESPACE} <pod-name> -- env | grep -i proxy

# Test proxy connectivity
kubectl exec -n ${NAMESPACE} <pod-name> -- curl -x ${HTTP_PROXY} https://gitlab.example.com

# Update NO_PROXY if needed
NO_PROXY=localhost,127.0.0.1,.example.com,.svc,.cluster.local
```

---

## Performance Issues

### Jobs taking too long

**Symptom**: CI/CD jobs are slow

**Solution**:
```bash
# Check resource limits
kubectl describe pod <pod-name> -n ${NAMESPACE} | grep -A 5 Limits

# Increase resource limits in .env.gitlab-runner
BUILD_CPU_LIMIT=4000m
BUILD_MEMORY_LIMIT=8Gi

# Increase concurrent jobs
RUNNER_MAX_CONCURRENT=20

# Redeploy
./deploy-gitlab-runner.sh

# Enable cache to speed up builds
# Verify cache is working in job logs
```

### Too many pending jobs

**Symptom**: Jobs stuck in pending state

**Solution**:
```bash
# Check runner capacity
kubectl logs -n ${NAMESPACE} -l app=gitlab-runner | grep concurrent

# Increase concurrent jobs
RUNNER_MAX_CONCURRENT=20

# Scale runner replicas
RUNNER_REPLICAS=3

# Check cluster resources
kubectl top nodes
kubectl top pods -n ${NAMESPACE}

# Redeploy with new settings
./deploy-gitlab-runner.sh
```

### Out of memory errors

**Symptom**: `OOMKilled` status

**Solution**:
```bash
# Check memory usage
kubectl top pod <pod-name> -n ${NAMESPACE}

# Increase memory limits
BUILD_MEMORY_LIMIT=8Gi
RUNNER_MEMORY_LIMIT=1Gi

# Update .env.gitlab-runner and redeploy
./deploy-gitlab-runner.sh

# Monitor memory usage
kubectl logs -n ${NAMESPACE} <pod-name> | grep -i memory
```

---

## Debug Commands

### Comprehensive debugging

```bash
# Get all resources
kubectl get all -n ${NAMESPACE}

# Get events
kubectl get events -n ${NAMESPACE} --sort-by='.lastTimestamp'

# Describe deployment
kubectl describe deployment -n ${NAMESPACE} -l app=gitlab-runner

# Get pod logs
kubectl logs -n ${NAMESPACE} -l app=gitlab-runner --tail=100

# Get previous pod logs (if crashed)
kubectl logs -n ${NAMESPACE} <pod-name> --previous

# Execute commands in pod
kubectl exec -it -n ${NAMESPACE} <pod-name> -- /bin/sh

# Check secrets
kubectl get secrets -n ${NAMESPACE}

# Check configmaps
kubectl get configmaps -n ${NAMESPACE}

# Port forward for debugging
kubectl port-forward -n ${NAMESPACE} <pod-name> 9252:9252

# Check Helm release
helm list -n ${NAMESPACE}
helm history ${HELM_RELEASE} -n ${NAMESPACE}

# Get Helm values
helm get values ${HELM_RELEASE} -n ${NAMESPACE}
```

### Enable debug logging

```bash
# Run deployment with debug mode
DEBUG=true ./deploy-gitlab-runner.sh

# Check deployment logs
tail -f logs/deployment-*.log

# Increase runner log level
LOG_LEVEL=debug
./deploy-gitlab-runner.sh
```

---

## Getting Help

If you're still experiencing issues:

1. **Check deployment logs**: `tail -f logs/deployment-*.log`
2. **Review pod logs**: `kubectl logs -n ${NAMESPACE} -l app=gitlab-runner -f`
3. **Check events**: `kubectl get events -n ${NAMESPACE} --sort-by='.lastTimestamp'`
4. **Review configuration**: Ensure all environment variables are set correctly
5. **Test components individually**: Run each script separately to isolate issues
6. **Consult documentation**: 
   - [GitLab Runner Docs](https://docs.gitlab.com/runner/)
   - [Kubernetes Docs](https://kubernetes.io/docs/)
   - [Helm Docs](https://helm.sh/docs/)

---

## Rollback

If deployment fails and you need to rollback:

```bash
# Rollback Helm release
helm rollback ${HELM_RELEASE} -n ${NAMESPACE}

# Or uninstall completely
helm uninstall ${HELM_RELEASE} -n ${NAMESPACE}

# Delete namespace
kubectl delete namespace ${NAMESPACE}

# Start fresh
./deploy-gitlab-runner.sh
```
