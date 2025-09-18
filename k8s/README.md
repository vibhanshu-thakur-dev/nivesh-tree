# Nivesh Tree Kubernetes Deployment Guide

This guide explains how to deploy the Nivesh Tree application to Kubernetes.

## Prerequisites

- Kubernetes cluster (v1.20+)
- kubectl configured to access your cluster
- Docker (for building images)
- Traefik Ingress Controller (for ingress)

## MongoDB Configuration

### Option 1: External MongoDB (Recommended for Production)

For production deployments, use a managed MongoDB service:

1. **MongoDB Atlas** (Cloud)
2. **AWS DocumentDB**
3. **Google Cloud MongoDB**
4. **Azure Cosmos DB**

Update the `MONGODB_URI` in `secret.yaml`:

```bash
# Encode your MongoDB URI
echo -n "mongodb://username:password@your-mongodb-host:27017/nivesh_tree" | base64
```

### Option 2: In-Cluster MongoDB (Development/Testing)

For development or testing, you can deploy MongoDB in the cluster:

1. Uncomment the MongoDB deployment in `kustomization.yaml`
2. Deploy with: `kubectl apply -k .`

## Configuration

### 1. Update Secrets

Edit `k8s/secret.yaml` and replace the base64 encoded values:

```bash
# JWT Secret
echo -n "your_actual_jwt_secret" | base64

# MongoDB URI
echo -n "mongodb://username:password@host:port/database" | base64

# Encryption Key (32 characters)
echo -n "your_32_character_encryption_key" | base64
```

### 2. Update Image Name

In `k8s/deployment.yaml`, replace `nivesh-tree:latest` with your actual image name:

```yaml
image: your-registry/nivesh-tree:v1.0.0
```

### 3. Update Domain

The ingress is configured for:
- Frontend: `invest-tree.home-network.sort-tree.com`
- Backend API: `api.home-network.sort-tree.com/invest-tree`

Update these domains in `k8s/ingress.yaml` if needed.

## Deployment Steps

### 1. Build and Push Docker Image

```bash
# Build the image
docker build -t your-registry/nivesh-tree:v1.0.0 .

# Push to registry
docker push your-registry/nivesh-tree:v1.0.0
```

### 2. Deploy to Kubernetes

```bash
# Navigate to k8s directory
cd k8s

# Deploy all resources
kubectl apply -k .

# Or deploy individually
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secret.yaml
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f ingress.yaml
```

### 3. Verify Deployment

```bash
# Check pods
kubectl get pods -n nivesh-tree

# Check services
kubectl get services -n nivesh-tree

# Check ingress
kubectl get ingress -n nivesh-tree

# View logs
kubectl logs -f deployment/nivesh-tree -n nivesh-tree
```

## Environment Variables

The application uses the following environment variables:

| Variable | Description | Source |
|----------|-------------|---------|
| `NODE_ENV` | Environment (production) | ConfigMap |
| `PORT` | Server port (5000) | ConfigMap |
| `JWT_SECRET` | JWT signing secret | Secret |
| `MONGODB_URI` | MongoDB connection string | Secret |
| `ENCRYPTION_KEY` | Data encryption key (32 chars) | Secret |

## MongoDB URI Examples

### MongoDB Atlas
```
mongodb+srv://username:password@cluster.mongodb.net/nivesh_tree?retryWrites=true&w=majority
```

### Self-hosted MongoDB
```
mongodb://username:password@mongodb-host:27017/nivesh_tree?authSource=admin
```

### In-cluster MongoDB (if using mongodb-deployment.yaml)
```
mongodb://admin:secret123@mongodb-service:27017/nivesh_tree?authSource=admin
```

## Scaling

To scale the application:

```bash
kubectl scale deployment nivesh-tree --replicas=3 -n nivesh-tree
```

## Monitoring

### Health Checks

The application includes health checks at `/health` endpoint.

### Resource Limits

Current resource limits:
- Memory: 512Mi (limit), 256Mi (request)
- CPU: 500m (limit), 250m (request)

Adjust these in `deployment.yaml` based on your needs.

## Troubleshooting

### Common Issues

1. **Pod not starting**: Check logs with `kubectl logs -f deployment/nivesh-tree -n nivesh-tree`
2. **MongoDB connection issues**: Verify `MONGODB_URI` in secrets
3. **Ingress not working**: Ensure Traefik Ingress Controller is installed
4. **Image pull errors**: Verify image name and registry access

### Useful Commands

```bash
# Describe pod for events
kubectl describe pod <pod-name> -n nivesh-tree

# Port forward for local testing
kubectl port-forward service/nivesh-tree-service 8080:80 -n nivesh-tree

# Execute shell in pod
kubectl exec -it <pod-name> -n nivesh-tree -- /bin/sh

# View all resources
kubectl get all -n nivesh-tree
```

## Security Considerations

1. **Secrets**: Never commit actual secrets to version control
2. **Network Policies**: Consider implementing network policies
3. **RBAC**: Use proper RBAC for service accounts
4. **TLS**: Enable TLS for production deployments
5. **Image Security**: Use trusted base images and scan for vulnerabilities

## Traefik Configuration

The application is configured to work with Traefik ingress controller:

- **Frontend**: `http://invest-tree.home-network.sort-tree.com` - Serves the React application
- **Backend API**: `http://api.home-network.sort-tree.com/invest-tree` - API endpoints with path prefix stripping

The Traefik middleware automatically strips the `/invest-tree` prefix from API requests before forwarding them to the backend service.

## Production Recommendations

1. Use a managed MongoDB service
2. Enable TLS/SSL
3. Set up proper monitoring and logging
4. Use resource quotas and limits
5. Implement backup strategies
6. Use a proper CI/CD pipeline
7. Consider using Helm for package management
