# Dashboard Build and Deployment Scripts

## Overview

This directory contains scripts for building, testing, and deploying the Eclipse Che dashboard.

## Scripts

### `patch.sh` - Build and Deploy Dashboard Image

Builds a single-architecture image, pushes it, and patches the CheCluster.

**Quick Start:**

```bash
export IMAGE_REGISTRY_HOST=quay.io
export IMAGE_REGISTRY_USER_NAME=your-username
./run/patch.sh
```

**Use existing image (skip build):**

```bash
export CHE_DASHBOARD_IMAGE=quay.io/username/che-dashboard:tag
./run/patch.sh
```

**Environment Variables:**

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `IMAGE_REGISTRY_HOST` | Container registry host | - | Yes (if building) |
| `IMAGE_REGISTRY_USER_NAME` | Registry username | - | Yes (if building) |
| `CHE_NAMESPACE` | Kubernetes namespace | `eclipse-che` | No |
| `CHE_DASHBOARD_IMAGE` | Use existing image | - | No |

---

### `build-multiarch.sh` - Multi-Architecture Build

Builds and pushes multi-architecture images (AMD64 + ARM64).

**Quick Start:**

```bash
export IMAGE_REGISTRY_HOST=quay.io
export IMAGE_REGISTRY_USER_NAME=your-username
./run/build-multiarch.sh
```

**Build for specific platforms:**

```bash
export PLATFORMS=linux/amd64,linux/arm64
./run/build-multiarch.sh
```

**Build and patch:**

```bash
# Build multi-arch
./run/build-multiarch.sh

# Patch CheCluster
export CHE_DASHBOARD_IMAGE=quay.io/username/che-dashboard:tag
./run/patch.sh
```

**Environment Variables:**

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `IMAGE_REGISTRY_HOST` | Container registry host | - | Yes |
| `IMAGE_REGISTRY_USER_NAME` | Registry username | - | Yes |
| `PLATFORMS` | Platforms to build | `linux/amd64,linux/arm64` | No |
| `IMAGE_TAG` | Custom image tag | `branch_timestamp` | No |

📖 See [MULTIARCH_BUILD.md](./MULTIARCH_BUILD.md) for detailed documentation.

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

For multi-architecture builds supporting AMD64 and ARM64:

```bash
export IMAGE_REGISTRY_HOST=quay.io
export IMAGE_REGISTRY_USER_NAME=your-username
./run/build-multiarch.sh
```

### Prerequisites

**For Docker:**
- Docker 19.03+ with buildx support

```bash
# Install QEMU (if needed for cross-platform builds)
docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
```

**For Podman:**
- Podman 3.0+ with manifest support

```bash
# On macOS
brew install qemu

# On Linux
sudo apt-get install qemu-user-static  # Debian/Ubuntu
sudo dnf install qemu-user-static      # Fedora/RHEL
```

### Verification

Check your multi-arch image:

```bash
# Docker
docker buildx imagetools inspect quay.io/username/che-dashboard:TAG

# Skopeo
skopeo inspect docker://quay.io/username/che-dashboard:TAG
```

---

## Documentation

- [Multi-Architecture Build Guide](./MULTIARCH_BUILD.md) - Detailed multi-arch documentation
- [Docker Buildx](https://docs.docker.com/buildx/working-with-buildx/)
- [Podman Manifest](https://docs.podman.io/en/latest/markdown/podman-manifest.1.html)

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/eclipse-che/che-dashboard/issues
- Slack: #eclipse-che on Kubernetes Slack
