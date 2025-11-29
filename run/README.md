# Dashboard Build and Deployment Scripts

## Overview

This directory contains scripts for building, testing, and deploying the Eclipse Che dashboard.

## Scripts

### `patch.sh` - Build and Deploy Dashboard Image

**Features:**
- ✅ **Multi-architecture support** (AMD64, ARM64, and more)
- ✅ **Auto-detection** of Docker or Podman
- ✅ **Buildx integration** for Docker multi-arch builds
- ✅ **Manifest support** for Podman multi-arch builds
- ✅ **Automatic CheCluster patching** after image push

**Quick Start:**

```bash
# Multi-arch build (default: AMD64 + ARM64)
export IMAGE_REGISTRY_HOST=quay.io
export IMAGE_REGISTRY_USER_NAME=your-username
./run/patch.sh
```

**Advanced Usage:**

```bash
# Build only for AMD64
export PLATFORMS=linux/amd64
./run/patch.sh

# Build only for ARM64
export PLATFORMS=linux/arm64
./run/patch.sh

# Build for multiple platforms
export PLATFORMS=linux/amd64,linux/arm64,linux/ppc64le
./run/patch.sh

# Disable multi-arch (legacy mode)
export MULTIARCH=false
./run/patch.sh
```

**Environment Variables:**

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `IMAGE_REGISTRY_HOST` | Container registry host (e.g., quay.io) | - | ✅ Yes |
| `IMAGE_REGISTRY_USER_NAME` | Registry username/namespace | - | ✅ Yes |
| `MULTIARCH` | Enable multi-arch build | `true` | No |
| `PLATFORMS` | Platforms to build for | `linux/amd64,linux/arm64` | No |
| `CHE_NAMESPACE` | Kubernetes namespace | `eclipse-che` | No |

---

### `test-multiarch.sh` - Interactive Multi-Arch Build Tester

**Features:**
- Interactive menu for testing different build scenarios
- Prerequisites checking (Docker/Podman, buildx, QEMU)
- Multiple test scenarios
- Dry-run mode

**Usage:**

```bash
./run/test-multiarch.sh
```

**Test Scenarios:**
1. Multi-arch build (AMD64 + ARM64)
2. AMD64 only
3. ARM64 only
4. Legacy single-arch
5. Custom platforms
6. Dry run

---

### `local-run.sh` - Run Dashboard Locally

Run the dashboard locally for development.

```bash
./run/local-run.sh
```

---

### `prepare-local-run.sh` - Prepare Local Development

Prepare the environment for local dashboard development.

```bash
./run/prepare-local-run.sh
```

---

### `revert-local-run.sh` - Revert Local Changes

Revert changes made by local development scripts.

```bash
./run/revert-local-run.sh
```

---

## Multi-Architecture Build

### Prerequisites

**For Docker:**
- Docker 19.03+ with buildx support
- QEMU for cross-platform builds (optional, for ARM builds on AMD64 host)

```bash
# Install QEMU (if needed)
docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
```

**For Podman:**
- Podman 3.0+ with manifest support
- QEMU user-mode emulation

```bash
# On macOS
brew install qemu

# On Linux
sudo apt-get install qemu-user-static  # Debian/Ubuntu
sudo dnf install qemu-user-static      # Fedora/RHEL
```

### How It Works

#### Docker Buildx
1. Creates a buildx builder (if not exists)
2. Builds for all specified platforms in parallel
3. Pushes multi-arch manifest to registry

#### Podman
1. Creates a manifest
2. Builds for each platform sequentially
3. Pushes manifest with all platform images

### Verification

Check your multi-arch image:

```bash
# Docker
docker buildx imagetools inspect quay.io/username/che-dashboard:TAG

# Podman
podman manifest inspect quay.io/username/che-dashboard:TAG

# Skopeo
skopeo inspect docker://quay.io/username/che-dashboard:TAG
```

Example output:
```json
{
  "schemaVersion": 2,
  "mediaType": "application/vnd.docker.distribution.manifest.list.v2+json",
  "manifests": [
    {
      "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
      "size": 1234,
      "digest": "sha256:...",
      "platform": {
        "architecture": "amd64",
        "os": "linux"
      }
    },
    {
      "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
      "size": 5678,
      "digest": "sha256:...",
      "platform": {
        "architecture": "arm64",
        "os": "linux"
      }
    }
  ]
}
```

---

## Examples

### Build for Production (Multi-Arch)

```bash
#!/bin/bash
export IMAGE_REGISTRY_HOST=quay.io
export IMAGE_REGISTRY_USER_NAME=eclipse
export PLATFORMS=linux/amd64,linux/arm64

./run/patch.sh
```

### Build for Development (AMD64 Only)

```bash
#!/bin/bash
export IMAGE_REGISTRY_HOST=localhost:5000
export IMAGE_REGISTRY_USER_NAME=dev
export PLATFORMS=linux/amd64

./run/patch.sh
```

### Build with Custom Namespace

```bash
#!/bin/bash
export IMAGE_REGISTRY_HOST=quay.io
export IMAGE_REGISTRY_USER_NAME=my-team
export CHE_NAMESPACE=my-che-namespace
export PLATFORMS=linux/amd64,linux/arm64

./run/patch.sh
```

---

## Troubleshooting

### "multiple platforms feature is currently not supported"

**Solution:** Create and use a buildx builder:
```bash
docker buildx create --name multiarch-builder --use
docker buildx inspect --bootstrap
```

### "exec format error" during cross-platform build

**Solution:** Install QEMU emulation:
```bash
docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
```

### Podman: "command manifest is not supported with remote Podman"

**Solution:** Use local Podman:
```bash
unset CONTAINER_HOST
```

### Build is very slow

Cross-platform builds using QEMU emulation are slower. This is normal. For faster builds:
- Build on native hardware for each architecture
- Use CI/CD with platform-specific runners
- Build only the platforms you need

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build Multi-Arch Dashboard

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
        
      - name: Login to Quay.io
        uses: docker/login-action@v2
        with:
          registry: quay.io
          username: ${{ secrets.QUAY_USERNAME }}
          password: ${{ secrets.QUAY_PASSWORD }}
        
      - name: Build and Push Multi-Arch
        env:
          IMAGE_REGISTRY_HOST: quay.io
          IMAGE_REGISTRY_USER_NAME: ${{ secrets.QUAY_USERNAME }}
          PLATFORMS: linux/amd64,linux/arm64
        run: ./run/patch.sh
```

---

## Documentation

- [Multi-Architecture Build Guide](./MULTIARCH_BUILD.md) - Detailed documentation
- [Docker Buildx](https://docs.docker.com/buildx/working-with-buildx/)
- [Podman Manifest](https://docs.podman.io/en/latest/markdown/podman-manifest.1.html)

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/eclipse-che/che-dashboard/issues
- Slack: #eclipse-che on Kubernetes Slack

