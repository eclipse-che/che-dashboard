# Multi-Architecture Build Guide

## Overview

The `build-multiarch.sh` script builds Docker images for multiple architectures (AMD64 and ARM64) and pushes them to a container registry.

## Prerequisites

### For Docker:
- Docker with buildx support (Docker 19.03+)
- Enable experimental features in Docker (usually enabled by default in newer versions)

### For Podman:
- Podman 3.0+ with manifest support
- QEMU user-mode emulation for cross-platform builds:
  ```bash
  # On macOS
  brew install qemu
  
  # On Linux
  sudo apt-get install qemu-user-static  # Debian/Ubuntu
  sudo dnf install qemu-user-static      # Fedora/RHEL
  ```

## Usage

### Multi-Architecture Build (Default)

Build for both AMD64 and ARM64:

```bash
export IMAGE_REGISTRY_HOST=quay.io
export IMAGE_REGISTRY_USER_NAME=your-username
./run/build-multiarch.sh
```

### Custom Platforms

Specify custom platforms:

```bash
export IMAGE_REGISTRY_HOST=quay.io
export IMAGE_REGISTRY_USER_NAME=your-username
export PLATFORMS=linux/amd64,linux/arm64,linux/ppc64le
./run/build-multiarch.sh
```

### Build Only AMD64

```bash
export IMAGE_REGISTRY_HOST=quay.io
export IMAGE_REGISTRY_USER_NAME=your-username
export PLATFORMS=linux/amd64
./run/build-multiarch.sh
```

### Build Only ARM64

```bash
export IMAGE_REGISTRY_HOST=quay.io
export IMAGE_REGISTRY_USER_NAME=your-username
export PLATFORMS=linux/arm64
./run/build-multiarch.sh
```

### Build and Patch CheCluster

After building a multi-arch image, patch the CheCluster:

```bash
# Build multi-arch image
export IMAGE_REGISTRY_HOST=quay.io
export IMAGE_REGISTRY_USER_NAME=your-username
./run/build-multiarch.sh

# Patch CheCluster with the built image
export CHE_DASHBOARD_IMAGE=quay.io/your-username/che-dashboard:TAG
./run/patch.sh
```

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `IMAGE_REGISTRY_HOST` | Container registry host | - | Yes |
| `IMAGE_REGISTRY_USER_NAME` | Registry username/namespace | - | Yes |
| `PLATFORMS` | Comma-separated list of platforms | `linux/amd64,linux/arm64` | No |
| `IMAGE_TAG` | Custom image tag | `branch_timestamp` | No |

## How It Works

### Docker Buildx

1. Creates or reuses a buildx builder named `multiarch-builder`
2. Bootstraps the builder with support for specified platforms
3. Builds and pushes the multi-arch image in a single command
4. The resulting image is a manifest list that contains images for all specified platforms

### Podman

1. Creates a manifest for the image
2. Builds separate images for each platform
3. Adds each platform-specific image to the manifest
4. Pushes the manifest to the registry

## Verification

After building, verify the multi-arch image:

### Using Docker:
```bash
docker buildx imagetools inspect ${IMAGE_REGISTRY_HOST}/${IMAGE_REGISTRY_USER_NAME}/che-dashboard:${TAG}
```

### Using Podman:
```bash
podman manifest inspect ${IMAGE_REGISTRY_HOST}/${IMAGE_REGISTRY_USER_NAME}/che-dashboard:${TAG}
```

### Using Skopeo:
```bash
skopeo inspect docker://${IMAGE_REGISTRY_HOST}/${IMAGE_REGISTRY_USER_NAME}/che-dashboard:${TAG}
```

## Troubleshooting

### Docker: "multiple platforms feature is currently not supported for docker driver"

Switch to the buildx builder:
```bash
docker buildx create --name multiarch-builder --use
docker buildx inspect --bootstrap
```

### Podman: "Error: command "manifest" is not supported with remote Podman"

Make sure you're using local Podman, not remote:
```bash
unset CONTAINER_HOST
```

### QEMU: "exec format error"

Install QEMU user-mode emulation:
```bash
# Linux
docker run --rm --privileged multiarch/qemu-user-static --reset -p yes

# macOS
brew install qemu
```

### Build is very slow

Cross-platform builds using QEMU emulation are slower than native builds. This is expected. For faster builds:
- Build on native hardware for each architecture
- Use CI/CD with native runners for each architecture
- Use cloud build services that support multi-arch

## CI/CD Integration

Example GitHub Actions workflow:

```yaml
name: Multi-Arch Build

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up QEMU
        uses: docker/setup-qemu-action@v2
        
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
        
      - name: Login to Registry
        run: echo "${{ secrets.REGISTRY_PASSWORD }}" | docker login ${{ secrets.REGISTRY_HOST }} -u ${{ secrets.REGISTRY_USER }} --password-stdin
        
      - name: Build and Push
        env:
          IMAGE_REGISTRY_HOST: ${{ secrets.REGISTRY_HOST }}
          IMAGE_REGISTRY_USER_NAME: ${{ secrets.REGISTRY_USER }}
          PLATFORMS: linux/amd64,linux/arm64
        run: ./run/build-multiarch.sh
```

## Performance Tips

1. **Use BuildKit cache**: Enable BuildKit cache mounts in your Dockerfile
2. **Layer caching**: Structure your Dockerfile to maximize layer reuse
3. **Parallel builds**: For Podman, you can build platforms in parallel using background jobs
4. **Registry mirrors**: Use registry mirrors to speed up base image pulls

## Related Documentation

- [Docker Buildx Documentation](https://docs.docker.com/buildx/working-with-buildx/)
- [Podman Manifest Documentation](https://docs.podman.io/en/latest/markdown/podman-manifest.1.html)
- [OCI Image Spec](https://github.com/opencontainers/image-spec)
