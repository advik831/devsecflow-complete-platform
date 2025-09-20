# Kubernetes Deployment Guide

This directory contains Kubernetes manifests for deploying the DevOps Platform in various configurations.

## 📁 Structure

```
k8s/
├── base/                           # Base Kubernetes resources
│   ├── app-deployment.yaml         # Application deployment and service
│   ├── postgres-statefulset.yaml   # PostgreSQL StatefulSet
│   ├── migration-job.yaml          # Database migration job
│   ├── ingress.yaml                # Ingress configuration
│   └── kustomization.yaml          # Base kustomization
├── overlays/
│   ├── bundled-db/                 # Bundled PostgreSQL deployment
│   │   ├── kustomization.yaml
│   │   └── storage-class-patch.yaml
│   └── external-db/                # External database deployment
│       └── kustomization.yaml
└── README.md                       # This file
```

## 🚀 Deployment Options

### Option 1: Bundled PostgreSQL Database

Deploy the application with a bundled PostgreSQL database running in Kubernetes:

```bash
# Apply the bundled database configuration
kubectl apply -k k8s/overlays/bundled-db

# Check deployment status
kubectl get pods -l app=devops-platform

# Check database status
kubectl get pvc -l app=devops-platform
```

**Features:**
- Self-contained deployment
- PostgreSQL StatefulSet with persistent storage
- Automatic database initialization
- Ideal for development and small production deployments

### Option 2: External Database

Deploy the application connecting to an external database (RDS, CloudSQL, Azure Database, etc.):

```bash
# Update the database connection in k8s/overlays/external-db/kustomization.yaml
# Set your DATABASE_URL in the secretGenerator section

# Apply the external database configuration
kubectl apply -k k8s/overlays/external-db

# Check deployment status
kubectl get pods -l app=devops-platform
```

**Features:**
- Uses managed database services
- Higher availability and automatic backups
- Ideal for production deployments
- Supports cloud-managed databases

## ⚙️ Configuration

### Before Deployment

1. **Update Storage Class** (for bundled database):
   ```yaml
   # In k8s/overlays/bundled-db/storage-class-patch.yaml
   storageClassName: "gp2"  # AWS
   storageClassName: "standard"  # GCP
   storageClassName: "managed-premium"  # Azure
   ```

2. **Update Domain** (in ingress.yaml):
   ```yaml
   # In k8s/base/ingress.yaml
   - host: devops-platform.example.com  # Your domain
   ```

3. **Update Secrets**:
   ```bash
   # Create secrets
   kubectl create secret generic devops-platform-secrets \
     --from-literal=SESSION_SECRET="your-super-secret-session-key" \
     --from-literal=DB_PASSWORD="your-db-password" \
     --from-literal=GITHUB_CLIENT_ID="your-github-client-id" \
     --from-literal=GITHUB_CLIENT_SECRET="your-github-client-secret"
   ```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_MODE` | `bundled` or `external` | ✅ |
| `DATABASE_URL` | Full database connection URL (external mode) | ✅* |
| `DB_HOST` | Database hostname (bundled mode) | ✅* |
| `DB_PORT` | Database port (bundled mode) | ✅* |
| `DB_NAME` | Database name | ✅ |
| `DB_USER` | Database user | ✅ |
| `DB_PASSWORD` | Database password | ✅ |
| `DB_SSL` | Enable SSL (`true`/`false`) | ❌ |
| `SESSION_SECRET` | Session encryption key | ✅ |
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID | ❌ |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth client secret | ❌ |

*Required based on deployment mode

## 🌐 Cloud Provider Examples

### AWS EKS

```bash
# Update storage class for EKS
# In storage-class-patch.yaml: storageClassName: "gp2"

# Deploy with bundled database
kubectl apply -k k8s/overlays/bundled-db

# Or deploy with RDS
# Update external-db kustomization with RDS endpoint
kubectl apply -k k8s/overlays/external-db
```

### Google GKE

```bash
# Update storage class for GKE
# In storage-class-patch.yaml: storageClassName: "standard"

# Deploy with bundled database
kubectl apply -k k8s/overlays/bundled-db

# Or deploy with Cloud SQL
# Update external-db kustomization with Cloud SQL endpoint
kubectl apply -k k8s/overlays/external-db
```

### Azure AKS

```bash
# Update storage class for AKS
# In storage-class-patch.yaml: storageClassName: "managed-premium"

# Deploy with bundled database
kubectl apply -k k8s/overlays/bundled-db

# Or deploy with Azure Database for PostgreSQL
# Update external-db kustomization with Azure endpoint
kubectl apply -k k8s/overlays/external-db
```

### On-Premises

```bash
# Ensure you have a storage class available
kubectl get storageclass

# Deploy with bundled database
kubectl apply -k k8s/overlays/bundled-db

# For LoadBalancer service, ensure you have MetalLB or similar
```

## 🔧 Customization

### Scaling

```bash
# Scale the application
kubectl scale deployment devops-platform-app --replicas=5

# Or update the replicas in the deployment yaml
```

### Resource Limits

Update resource requests and limits in `k8s/base/app-deployment.yaml`:

```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "250m"
  limits:
    memory: "2Gi"
    cpu: "1000m"
```

### Ingress Configuration

For different ingress controllers, update annotations in `k8s/base/ingress.yaml`:

```yaml
# For Traefik
annotations:
  kubernetes.io/ingress.class: "traefik"
  traefik.ingress.kubernetes.io/redirect-entry-point: https

# For AWS ALB
annotations:
  kubernetes.io/ingress.class: "alb"
  alb.ingress.kubernetes.io/scheme: internet-facing
```

## 📝 Troubleshooting

### Check Pod Status
```bash
kubectl get pods -l app=devops-platform
kubectl describe pod <pod-name>
kubectl logs <pod-name>
```

### Check Database Connection
```bash
# For bundled database
kubectl exec -it devops-platform-db-0 -- psql -U postgres -d devops_platform

# Check database service
kubectl get svc -l component=database
```

### Check Migration Job
```bash
kubectl get jobs -l component=migration
kubectl logs job/devops-platform-migrate
```

### Common Issues

1. **Image Pull Errors**: Ensure the Docker image is built and pushed to a registry accessible by your cluster
2. **Database Connection Issues**: Verify database credentials and network connectivity
3. **Storage Issues**: Ensure the storage class exists and has sufficient capacity
4. **Ingress Issues**: Verify ingress controller is installed and domain DNS is configured