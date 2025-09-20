# GitLab Integration Setup Guide

This guide walks you through setting up GitLab CI/CD for the DevOps Platform MVP, including repository setup, CI/CD configuration, and deployment options.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [GitLab Repository Setup](#gitlab-repository-setup)
- [CI/CD Variables Configuration](#cicd-variables-configuration)
- [Pipeline Overview](#pipeline-overview)
- [Deployment Options](#deployment-options)
- [Multi-Cloud Deployment](#multi-cloud-deployment)
- [Troubleshooting](#troubleshooting)

## 🛠️ Prerequisites

- GitLab account with CI/CD runners available
- Docker Hub or GitLab Container Registry access
- Kubernetes cluster (optional, for K8s deployments)
- Cloud provider credentials (optional, for multi-cloud deployments)

## 🔗 GitLab Repository Setup

### 1. Create GitLab Repository

1. **Create New Repository**:
   ```bash
   # On GitLab.com or your GitLab instance
   # Create new project: "devops-platform-mvp"
   ```

2. **Add GitLab Remote**:
   ```bash
   # If you already have the GitHub repository
   git remote add gitlab https://gitlab.com/yourusername/devops-platform-mvp.git
   
   # Or clone fresh from GitLab
   git clone https://gitlab.com/yourusername/devops-platform-mvp.git
   cd devops-platform-mvp
   ```

3. **Push Code to GitLab**:
   ```bash
   # Push existing repository
   git push gitlab main
   
   # Push all branches
   git push gitlab --all
   
   # Push tags
   git push gitlab --tags
   ```

### 2. Enable Container Registry

1. Go to **Settings** > **General** > **Visibility and access controls**
2. Enable **Container Registry**
3. Set appropriate permissions (Developer+ can push images)

### 3. Configure CI/CD Runners

Ensure you have access to GitLab runners:
- **GitLab.com**: Shared runners available by default
- **Self-hosted**: Configure your own runners
- **Project-specific**: Set up dedicated runners if needed

## ⚙️ CI/CD Variables Configuration

Configure these variables in **Settings** > **CI/CD** > **Variables**:

### 🔒 Required Variables

| Variable | Description | Type | Example |
|----------|-------------|------|---------|
| `DB_PASSWORD` | Database password | Masked | `your-secure-password` |
| `SESSION_SECRET` | Session encryption key | Masked | `your-super-secret-session-key` |

### 🔗 Optional Variables (GitHub Integration)

| Variable | Description | Type | Example |
|----------|-------------|------|---------|
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID | Variable | `your_github_client_id` |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth client secret | Masked | `your_github_client_secret` |

### 🏭 Production Variables

| Variable | Description | Type | Example |
|----------|-------------|------|---------|
| `PRODUCTION_DATABASE_URL` | Production database URL | Masked | `postgresql://user:pass@host:5432/db` |
| `PRODUCTION_SESSION_SECRET` | Production session secret | Masked | `production-session-secret` |
| `PRODUCTION_GITHUB_CLIENT_ID` | Production GitHub client ID | Variable | `prod_github_client_id` |
| `PRODUCTION_GITHUB_CLIENT_SECRET` | Production GitHub secret | Masked | `prod_github_client_secret` |

### ☸️ Kubernetes Variables

| Variable | Description | Type | Example |
|----------|-------------|------|---------|
| `KUBE_CONFIG` | Base64 encoded kubeconfig | File | `cat ~/.kube/config \| base64 -w 0` |
| `KUBE_CONFIG_PROD` | Production kubeconfig | File | Base64 encoded kubeconfig |

### ☁️ Cloud Provider Variables

#### AWS Variables
| Variable | Description | Type |
|----------|-------------|------|
| `AWS_ACCESS_KEY_ID` | AWS access key | Variable |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | Masked |
| `AWS_DEFAULT_REGION` | AWS region | Variable |
| `EKS_CLUSTER_NAME` | EKS cluster name | Variable |

#### Google Cloud Variables
| Variable | Description | Type |
|----------|-------------|------|
| `GCP_SERVICE_KEY` | Base64 encoded service account key | Masked |
| `GCP_PROJECT_ID` | Google Cloud project ID | Variable |
| `GCP_ZONE` | GKE cluster zone | Variable |
| `GKE_CLUSTER_NAME` | GKE cluster name | Variable |

#### Azure Variables
| Variable | Description | Type |
|----------|-------------|------|
| `AZURE_CLIENT_ID` | Azure client ID | Variable |
| `AZURE_CLIENT_SECRET` | Azure client secret | Masked |
| `AZURE_TENANT_ID` | Azure tenant ID | Variable |
| `AZURE_RESOURCE_GROUP` | Azure resource group | Variable |
| `AKS_CLUSTER_NAME` | AKS cluster name | Variable |

## 🔄 Pipeline Overview

### Pipeline Stages

1. **Test**: Code quality, linting, and build validation
2. **Build**: Docker image creation and registry push
3. **Deploy**: Various deployment options
4. **Cleanup**: Registry maintenance and cleanup

### Pipeline Jobs

#### Test Stage
- `test`: Run code quality checks and tests
- `build_test`: Build application for validation
- `security_scan`: Container security scanning with Trivy

#### Build Stage
- `build_docker`: Build and push Docker images to registry

#### Deploy Stage
- `deploy_docker_compose`: Deploy with Docker Compose (staging)
- `deploy_docker_production`: Production Docker Compose deployment
- `deploy_k8s_bundled`: Kubernetes deployment with bundled database
- `deploy_k8s_production`: Kubernetes deployment with external database
- Multi-cloud deployments (AWS, GCP, Azure)

## 🚀 Deployment Options

### 1. Docker Compose Deployment

**Staging (develop branch):**
```bash
# Automatically triggered on develop branch
# Manual approval required
```

**Production (main branch):**
```bash
# Automatically triggered on main branch
# Manual approval required
# Uses external database configuration
```

### 2. Kubernetes Deployment

**Bundled Database (staging):**
```bash
# Deploy with PostgreSQL StatefulSet
# Uses k8s/overlays/bundled-db
kubectl apply -k k8s/overlays/bundled-db
```

**External Database (production):**
```bash
# Deploy with external database
# Uses k8s/overlays/external-db
kubectl apply -k k8s/overlays/external-db
```

### 3. Manual Jobs

- `migrate_database`: Run database migrations manually
- `cleanup_registry`: Clean up old Docker images
- All deployment jobs require manual approval

## ☁️ Multi-Cloud Deployment

### AWS EKS Deployment

1. **Prerequisites**:
   - EKS cluster running
   - AWS CLI configured
   - IAM role with EKS access

2. **Configuration**:
   ```bash
   # Set required variables in GitLab CI/CD settings
   AWS_ACCESS_KEY_ID=AKIA...
   AWS_SECRET_ACCESS_KEY=...
   AWS_DEFAULT_REGION=us-west-2
   EKS_CLUSTER_NAME=devops-platform-cluster
   ```

3. **Deploy**:
   - Pipeline job: `deploy_aws_eks`
   - Manual trigger on main branch

### Google GKE Deployment

1. **Prerequisites**:
   - GKE cluster running
   - Service account with GKE access
   - Service account key (JSON)

2. **Configuration**:
   ```bash
   # Base64 encode your service account key
   cat service-account-key.json | base64 -w 0
   
   # Set variables
   GCP_SERVICE_KEY=<base64-encoded-key>
   GCP_PROJECT_ID=your-project-id
   GCP_ZONE=us-central1-a
   GKE_CLUSTER_NAME=devops-platform-cluster
   ```

### Azure AKS Deployment

1. **Prerequisites**:
   - AKS cluster running
   - Service principal with AKS access

2. **Configuration**:
   ```bash
   # Set variables
   AZURE_CLIENT_ID=...
   AZURE_CLIENT_SECRET=...
   AZURE_TENANT_ID=...
   AZURE_RESOURCE_GROUP=devops-platform-rg
   AKS_CLUSTER_NAME=devops-platform-cluster
   ```

## 🔧 Environment Configuration

### Development/Staging Environment

```yaml
# Automatic deployment on develop branch
environment:
  name: staging
  url: http://staging.devops-platform.example.com
```

### Production Environment

```yaml
# Manual deployment on main branch
environment:
  name: production
  url: https://devops-platform.example.com
```

## 🐛 Troubleshooting

### Common Issues

1. **Docker Build Failures**:
   ```bash
   # Check Docker service status
   docker info
   
   # Verify Dockerfile syntax
   docker build --no-cache .
   ```

2. **Kubernetes Deployment Issues**:
   ```bash
   # Check cluster connection
   kubectl cluster-info
   
   # Verify namespace
   kubectl get namespaces
   
   # Check pod status
   kubectl get pods -l app=devops-platform
   ```

3. **Database Connection Issues**:
   ```bash
   # Check database URL format
   postgresql://username:password@hostname:5432/database
   
   # Test connection
   kubectl exec -it deployment/devops-platform-app -- npm run db:push
   ```

4. **Registry Authentication**:
   ```bash
   # Verify GitLab registry credentials
   docker login registry.gitlab.com
   
   # Check CI/CD variables
   echo $CI_REGISTRY_USER
   echo $CI_REGISTRY_PASSWORD
   ```

### Debug Commands

```bash
# Check pipeline logs in GitLab UI
# Settings > CI/CD > Pipelines

# Local testing
docker-compose up -d
docker-compose logs app

# Kubernetes debugging
kubectl describe pod <pod-name>
kubectl logs deployment/devops-platform-app
```

### Support Resources

- **GitLab CI/CD Documentation**: https://docs.gitlab.com/ee/ci/
- **Docker Compose Reference**: https://docs.docker.com/compose/
- **Kubernetes Documentation**: https://kubernetes.io/docs/
- **Project Issues**: Create issues in your GitLab repository

## 🔄 Continuous Improvement

### Pipeline Optimization

1. **Cache Optimization**:
   - Use npm cache for faster builds
   - Cache Docker layers between builds
   - Optimize artifact storage

2. **Security Enhancements**:
   - Regular security scanning
   - Dependency vulnerability checks
   - Container image scanning

3. **Performance Monitoring**:
   - Pipeline execution time tracking
   - Resource usage optimization
   - Parallel job execution

### Advanced Features

- **Blue-Green Deployments**: Zero-downtime deployments
- **Canary Releases**: Gradual rollout strategy
- **Auto-scaling**: Horizontal pod autoscaling in Kubernetes
- **Monitoring Integration**: Prometheus and Grafana setup

---

**🎉 Your GitLab CI/CD pipeline is now ready for enterprise-grade DevOps deployments!**