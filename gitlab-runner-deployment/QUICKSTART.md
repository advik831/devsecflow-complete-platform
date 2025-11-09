# GitLab Runner Deployment - Quick Start Guide

Get your GitLab Runner up and running in Kubernetes in 5 minutes!

## Prerequisites

- Kubernetes cluster with kubectl configured
- Helm 3.x installed
- Docker registry credentials
- GitLab instance with admin access

## Quick Setup

### 1. Configure Environment

```bash
cd gitlab-runner-deployment
cp .env.gitlab-runner.example .env.gitlab-runner
```

Edit `.env.gitlab-runner` with your values:

```bash
# Minimum required configuration
NAMESPACE=gitlab-runner
REGISTRY_HOST=your-registry.example.com
REGISTRY_USER=your-username
REGISTRY_PASSWORD=your-password
GITLAB_URL=https://gitlab.example.com
RUNNER_REGISTRATION_TOKEN=your-token-here
AZURE_ACCOUNT_NAME=your-storage-account
AZURE_ACCOUNT_KEY=your-account-key
AZURE_CONTAINER_NAME=gitlab-runner-cache
```

### 2. Make Scripts Executable

```bash
chmod +x deploy-gitlab-runner.sh
chmod +x scripts/*.sh
```

### 3. Deploy

```bash
./deploy-gitlab-runner.sh
```

That's it! The script will:
- ✅ Check prerequisites
- ✅ Create namespace
- ✅ Mirror images to your private registry
- ✅ Configure Azure Blob cache
- ✅ Generate custom Helm values
- ✅ Deploy GitLab Runner

## Verify Deployment

```bash
# Check runner pods
kubectl get pods -n gitlab-runner

# View runner logs
kubectl logs -n gitlab-runner -l app=gitlab-runner -f

# Check in GitLab UI
# Go to: Admin Area > Runners
```

## Test Runner

Create a `.gitlab-ci.yml` in your project:

```yaml
test-runner:
  tags:
    - docker
    - kubernetes
  script:
    - echo "Hello from GitLab Runner!"
    - docker --version
```

## Common Issues

### Runner not appearing in GitLab?

Check the registration token:
```bash
kubectl logs -n gitlab-runner -l app=gitlab-runner | grep -i register
```

### Pods not starting?

Check events:
```bash
kubectl get events -n gitlab-runner --sort-by='.lastTimestamp'
```

### Image pull errors?

Verify registry credentials:
```bash
kubectl get secret registry-credentials -n gitlab-runner -o yaml
```

## Next Steps

- Configure additional runners
- Set up monitoring
- Configure network policies
- Enable pod security policies

For detailed documentation, see [README.md](README.md)

## Support

- Check logs: `./logs/deployment-*.log`
- Review README.md for troubleshooting
- Check Kubernetes events: `kubectl get events -n gitlab-runner`
