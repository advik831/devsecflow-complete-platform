# GitLab Runner Kubernetes Deployment Automation

A comprehensive, production-ready automation script to deploy GitLab Runner on Kubernetes with private Docker registry, image mirroring, and Azure Blob cache storage.

## 🚀 Features

- **Private Docker Registry Integration**: Pull and push images from/to private registries
- **Automated Image Mirroring**: Pull required images from public registries and mirror to private registry
- **Azure Blob Cache Storage**: Configure distributed cache using Azure Blob Storage
- **DevOps/DevSecOps Best Practices**: 
  - Secure credential handling
  - Comprehensive logging
  - Error handling and rollback capabilities
  - Idempotent operations
- **Modular Architecture**: Organized into separate, maintainable modules
- **Prerequisite Validation**: Automatic checking for required tools
- **Custom Values Generation**: Dynamic Helm values.yaml creation

## 📋 Prerequisites

### Required Tools

The script will automatically check for these tools:

- `kubectl` - Kubernetes CLI (v1.20+)
- `helm` - Kubernetes package manager (v3.0+)
- `docker` - Container runtime (v20.0+)
- `skopeo` - Container image operations (v1.0+)
- `jq` - JSON processor (v1.6+)

### Kubernetes Cluster

- Access to a running Kubernetes cluster
- Valid kubeconfig with appropriate permissions
- Ability to create namespaces, secrets, and deployments

### Azure Account (for cache)

- Azure Storage Account
- Container/Blob storage created
- Access credentials (Account Key or SAS Token)

### GitLab Instance

- GitLab instance URL
- Runner registration token (from GitLab Admin Area > Runners)

## 🔧 Installation

### 1. Clone or Download the Scripts

```bash
# Create deployment directory
mkdir -p gitlab-runner-deployment
cd gitlab-runner-deployment

# Copy all scripts to this directory
```

### 2. Make Scripts Executable

```bash
chmod +x *.sh
chmod +x scripts/*.sh
```

### 3. Configure Environment Variables

Copy the example environment file and customize it:

```bash
cp .env.gitlab-runner.example .env.gitlab-runner
```

Edit `.env.gitlab-runner` with your specific values:

```bash
nano .env.gitlab-runner
```

## ⚙️ Configuration

### Required Environment Variables

#### Kubernetes Configuration
```bash
NAMESPACE=gitlab-runner              # Kubernetes namespace for runner
```

#### Private Docker Registry
```bash
REGISTRY_HOST=registry.example.com   # Private registry hostname
REGISTRY_USER=admin                  # Registry username
REGISTRY_PASSWORD=secret             # Registry password
CA_CERT_FILE=/path/to/ca.crt        # Optional: CA certificate for registry
```

#### Helm Configuration
```bash
HELM_RELEASE=gitlab-runner           # Helm release name
HELM_CHART_VERSION=0.60.0           # GitLab Runner Helm chart version
```

#### GitLab Configuration
```bash
GITLAB_URL=https://gitlab.example.com
RUNNER_REGISTRATION_TOKEN=your-token-here
RUNNER_MAX_CONCURRENT=10
RUNNER_TAGS=docker,kubernetes,production
RUNNER_LOCKED=false
RUNNER_RUN_UNTAGGED=true
RUNNER_PRIVILEGED=true
RUNNER_DEFAULT_IMAGE=alpine:latest
RUNNER_IMAGE_PULL_SECRETS=registry-credentials
```

#### Azure Blob Cache Configuration
```bash
AZURE_ACCOUNT_NAME=mystorageaccount
AZURE_CONTAINER_NAME=gitlab-runner-cache
AZURE_STORAGE_DOMAIN=blob.core.windows.net
AZURE_USE_ACCOUNT_KEY=true
AZURE_ACCOUNT_KEY=your-account-key
# OR use SAS token
# AZURE_USE_ACCOUNT_KEY=false
# AZURE_SAS_TOKEN=your-sas-token
```

#### Proxy Configuration (Optional)
```bash
USE_PROXY=false
HTTP_PROXY=http://proxy.example.com:8080
HTTPS_PROXY=https://proxy.example.com:8443
NO_PROXY=localhost,127.0.0.1,.example.com
```

#### Image Mirroring Configuration
```bash
# Format: SOURCE_IMAGE:SOURCE_TAG|DEST_REPO_PATH:DEST_TAG|PUSH_LATEST
# Example:
SRC_IMAGE=gitlab/gitlab-runner:alpine-v16.5.0
DEST_REPO_PATH=registry.example.com/gitlab/gitlab-runner
DEST_TAG=alpine-v16.5.0
PUSH_LATEST=true
```

## 🚀 Usage

### Basic Deployment

Run the main deployment script:

```bash
./deploy-gitlab-runner.sh
```

### Step-by-Step Execution

You can also run individual modules:

#### 1. Check Prerequisites
```bash
./scripts/check-prerequisites.sh
```

#### 2. Mirror Images
```bash
source .env.gitlab-runner
./scripts/image-mirroring.sh
```

#### 3. Configure Azure Blob Cache
```bash
source .env.gitlab-runner
./scripts/azure-blob-cache.sh
```

#### 4. Deploy GitLab Runner
```bash
source .env.gitlab-runner
./scripts/gitlab-runner-deployment.sh
```

### Advanced Options

#### Dry Run Mode
```bash
DRY_RUN=true ./deploy-gitlab-runner.sh
```

#### Verbose Logging
```bash
DEBUG=true ./deploy-gitlab-runner.sh
```

#### Skip Image Mirroring
```bash
SKIP_IMAGE_MIRROR=true ./deploy-gitlab-runner.sh
```

#### Custom Values File
```bash
CUSTOM_VALUES_FILE=/path/to/custom-values.yaml ./deploy-gitlab-runner.sh
```

## 📁 Project Structure

```
gitlab-runner-deployment/
├── README.md                           # This file
├── deploy-gitlab-runner.sh            # Main deployment orchestrator
├── .env.gitlab-runner.example         # Example environment configuration
├── .env.gitlab-runner                 # Your actual configuration (gitignored)
├── scripts/
│   ├── check-prerequisites.sh         # Validate required tools
│   ├── image-mirroring.sh            # Mirror images to private registry
│   ├── azure-blob-cache.sh           # Configure Azure Blob cache
│   ├── gitlab-runner-deployment.sh   # Deploy runner with Helm
│   └── generate-values.sh            # Generate custom values.yaml
├── templates/
│   └── values.yaml.template          # Helm values template
└── logs/
    └── deployment-YYYYMMDD-HHMMSS.log # Deployment logs
```

## 🔒 Security Best Practices

### Credential Management

1. **Never commit credentials**: Add `.env.gitlab-runner` to `.gitignore`
2. **Use Kubernetes Secrets**: Credentials are stored as K8s secrets
3. **Rotate tokens regularly**: Update runner registration tokens periodically
4. **Limit permissions**: Use RBAC to restrict runner permissions

### Registry Security

1. **TLS/SSL**: Always use HTTPS for registry communication
2. **CA Certificates**: Provide custom CA certs if using self-signed certificates
3. **Image Scanning**: Integrate vulnerability scanning in your pipeline
4. **Image Signing**: Consider using Docker Content Trust

### Network Security

1. **Network Policies**: Implement Kubernetes network policies
2. **Proxy Configuration**: Route traffic through corporate proxies
3. **Private Endpoints**: Use private endpoints for Azure Blob Storage

## 🔍 Troubleshooting

### Common Issues

#### 1. kubectl not found
```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/
```

#### 2. helm not found
```bash
# Install helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

#### 3. skopeo not found
```bash
# Amazon Linux 2023
sudo dnf install -y skopeo

# Ubuntu/Debian
sudo apt-get install -y skopeo

# RHEL/CentOS
sudo yum install -y skopeo
```

#### 4. Registry authentication failed
```bash
# Test registry login
docker login ${REGISTRY_HOST} -u ${REGISTRY_USER} -p ${REGISTRY_PASSWORD}

# Verify credentials in secret
kubectl get secret registry-credentials -n ${NAMESPACE} -o yaml
```

#### 5. Runner not registering
```bash
# Check runner logs
kubectl logs -n ${NAMESPACE} -l app=gitlab-runner

# Verify registration token
# Go to GitLab Admin Area > Runners > Register an instance runner
```

#### 6. Azure Blob cache not working
```bash
# Test Azure connection
az storage container list --account-name ${AZURE_ACCOUNT_NAME} --account-key ${AZURE_ACCOUNT_KEY}

# Check runner cache configuration
kubectl get configmap -n ${NAMESPACE} gitlab-runner-config -o yaml
```

### Debug Mode

Enable debug logging:

```bash
DEBUG=true ./deploy-gitlab-runner.sh
```

Check deployment logs:

```bash
tail -f logs/deployment-*.log
```

### Validation Commands

```bash
# Check namespace
kubectl get namespace ${NAMESPACE}

# Check secrets
kubectl get secrets -n ${NAMESPACE}

# Check runner pods
kubectl get pods -n ${NAMESPACE} -l app=gitlab-runner

# Check runner status
kubectl describe deployment -n ${NAMESPACE} gitlab-runner

# View runner logs
kubectl logs -n ${NAMESPACE} -l app=gitlab-runner --tail=100 -f
```

## 🔄 Idempotence

The script is designed to be idempotent - you can run it multiple times safely:

- **Namespace**: Creates only if it doesn't exist
- **Secrets**: Updates if exists, creates if not
- **Helm Release**: Upgrades if exists, installs if not
- **Image Mirroring**: Skips if image already exists in registry

## 📊 Monitoring

### Check Runner Status

```bash
# Pod status
kubectl get pods -n ${NAMESPACE} -l app=gitlab-runner

# Runner logs
kubectl logs -n ${NAMESPACE} -l app=gitlab-runner -f

# Runner metrics (if Prometheus enabled)
kubectl port-forward -n ${NAMESPACE} svc/gitlab-runner-metrics 9252:9252
```

### GitLab UI

1. Navigate to GitLab Admin Area > Runners
2. Verify your runner appears in the list
3. Check runner status (online/offline)
4. View runner jobs and statistics

## 🧪 Testing

### Test Runner Deployment

```bash
# Create a test job in .gitlab-ci.yml
test-runner:
  tags:
    - docker
    - kubernetes
  script:
    - echo "Testing GitLab Runner"
    - docker --version
```

### Test Cache Functionality

```bash
# Create a job that uses cache
build-with-cache:
  tags:
    - docker
  cache:
    key: ${CI_COMMIT_REF_SLUG}
    paths:
      - node_modules/
  script:
    - npm install
    - npm run build
```

## 🔧 Maintenance

### Update Runner Version

```bash
# Update HELM_CHART_VERSION in .env.gitlab-runner
HELM_CHART_VERSION=0.61.0

# Re-run deployment
./deploy-gitlab-runner.sh
```

### Rotate Credentials

```bash
# Update credentials in .env.gitlab-runner
# Re-run deployment to update secrets
./deploy-gitlab-runner.sh
```

### Scale Runners

```bash
# Update RUNNER_MAX_CONCURRENT in .env.gitlab-runner
RUNNER_MAX_CONCURRENT=20

# Re-run deployment
./deploy-gitlab-runner.sh
```

## 🗑️ Cleanup

### Remove GitLab Runner

```bash
# Uninstall Helm release
helm uninstall ${HELM_RELEASE} -n ${NAMESPACE}

# Delete namespace
kubectl delete namespace ${NAMESPACE}

# Remove local files
rm -rf logs/
```

## 📚 Additional Resources

- [GitLab Runner Documentation](https://docs.gitlab.com/runner/)
- [GitLab Runner Helm Chart](https://docs.gitlab.com/runner/install/kubernetes.html)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Azure Blob Storage Documentation](https://docs.microsoft.com/en-us/azure/storage/blobs/)
- [Skopeo Documentation](https://github.com/containers/skopeo)

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Test changes thoroughly
2. Update documentation
3. Follow shell scripting best practices
4. Add error handling
5. Maintain idempotence

## 📄 License

MIT License - See LICENSE file for details

## 🆘 Support

For issues and questions:

1. Check the troubleshooting section
2. Review deployment logs
3. Check Kubernetes events: `kubectl get events -n ${NAMESPACE}`
4. Open an issue with detailed logs and configuration (redact sensitive data)

## 🔐 Security Disclosure

If you discover a security vulnerability, please email security@example.com instead of using the issue tracker.

---

**Version**: 1.0.0  
**Last Updated**: November 2025  
**Maintained by**: DevOps Team
