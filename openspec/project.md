# Eclipse Che Dashboard - Project Specification

## Overview

Eclipse Che Dashboard is the web-based user interface for Eclipse Che, providing workspace management capabilities for developers using Kubernetes-native development environments.

## Core Features

### 1. Workspace Management

- Create workspaces from Git repositories (Factory flow)
- Start, stop, restart, and delete workspaces
- View workspace status and real-time events
- Access workspace IDE
- Restore workspaces from backup images

### 2. Factory Flow

The factory flow enables creating workspaces from URLs:

```
/load-factory?url=https://github.com/org/repo
```

Key components:

- URL parsing and validation (including `/tree/<branch>` and file-level URLs)
- Devfile resolution via data resolver route (SSRF-protected)
- Workspace creation with DevWorkspace API
- Progress tracking with step-by-step UI
- Reuse of existing running workspaces for the same factory URL

### 3. User Preferences

- **Git configuration** — user.name, user.email, per-provider git services
- **SSH keys** — generate and manage SSH key pairs
- **Personal access tokens** — per-provider PAT management
- **Container registry credentials** — docker config secrets
- **AI provider keys** — API keys for AI assistant providers
- **Device authentication tokens** — OAuth device-flow token management

### 4. AI Tools / Assistants

- AI Registry: list and filter AI tools by cluster architecture
- AI Selector Widget: select and inject AI tools into workspaces
- AI provider key management in User Preferences

### 5. Backup and Restore

- List workspace backups
- Restore workspaces from backup images (`/restore-from-backup`)
- Backend backup-config API per namespace

### 6. Administration

- Cluster-wide workspace limits
- Allowed source URLs
- Default editor configuration
- Getting-started sample workspaces
- Air-gap sample workspace support

## Architecture

### Frontend (React)

```
src/
├── components/     # Reusable UI components
├── contexts/       # React contexts (WorkspaceActions, etc.)
├── pages/          # Page-level components
│   ├── GetStarted/
│   ├── Loader/
│   ├── RestoreFromBackup/
│   ├── UserPreferences/
│   ├── WorkspaceDetails/
│   └── WorkspacesList/
├── services/       # API clients, helpers, registry
└── store/          # Redux Toolkit state management
```

### Backend (Fastify)

```
src/
├── routes/
│   └── api/        # Route handlers (one file per resource)
├── devworkspaceClient/
│   └── services/   # Kubernetes API wrappers
├── plugins/        # Fastify plugins (cors, staticServer, swagger, webSocket)
├── services/       # Business logic (PostStartInjector, etc.)
└── helpers/        # Utility functions
```

## API Endpoints

### DevWorkspaces

- `GET /dashboard/api/namespace/:namespace/devworkspaces`
- `POST /dashboard/api/namespace/:namespace/devworkspaces`
- `GET /dashboard/api/namespace/:namespace/devworkspaces/:name`
- `PATCH /dashboard/api/namespace/:namespace/devworkspaces/:name`
- `DELETE /dashboard/api/namespace/:namespace/devworkspaces/:name`

### DevWorkspace Templates & Resources

- `GET/POST/PATCH/DELETE /dashboard/api/namespace/:namespace/devworkspacetemplates/:name`
- `GET /dashboard/api/namespace/:namespace/devworkspaceresources`

### Configuration

- `GET /dashboard/api/server-config`
- `GET /dashboard/api/cluster-config`
- `GET /dashboard/api/cluster-info`
- `GET /dashboard/api/devworkspace/running-workspaces-cluster-limit-exceeded`

### User Data

- `GET/PATCH /dashboard/api/namespace/:namespace/gitconfig`
- `GET/POST/DELETE /dashboard/api/namespace/:namespace/ssh-key`
- `GET/POST/PATCH/DELETE /dashboard/api/namespace/:namespace/personal-access-token`
- `GET/POST/DELETE /dashboard/api/namespace/:namespace/dockerconfig`
- `GET/PATCH /dashboard/api/namespace/:namespace/workspace-preferences`

### AI

- `GET /dashboard/api/ai-registry` — cluster-level AI tool registry
- `GET/POST /dashboard/api/namespace/:namespace/ai-provider-key`
- `DELETE /dashboard/api/namespace/:namespace/ai-provider-key/:toolId`

### Device Authentication

- `GET /dashboard/api/namespace/:namespace/device-auth-token`
- `DELETE /dashboard/api/namespace/:namespace/device-auth-token/:tokenName`
- `POST /dashboard/api/namespace/:namespace/device-auth-token/initiate`
- `POST /dashboard/api/namespace/:namespace/device-auth-token/poll`

### Backup

- `GET/POST /dashboard/api/namespace/:namespace/backup-config`
- `GET /dashboard/api/namespace/:namespace/backups`
- `GET /dashboard/api/namespace/:namespace/devworkspaces/:workspaceName/backup-status`

### Cluster Operations

- `GET /dashboard/api/namespace/:namespace/pods`
- `GET /dashboard/api/namespace/:namespace/events`
- `GET /dashboard/api/namespace/:namespace/kubeconfig`
- `GET /dashboard/api/namespace/:namespace/scc-permission`

### Editors & Samples

- `GET /dashboard/api/editors/devfile`
- `GET /dashboard/api/getting-started-sample`
- `GET /dashboard/api/airgap-sample`

### Data Resolver (SSRF-protected)

- `POST /dashboard/api/data-resolver` — proxies external devfile/resource URLs through a server-side allowlist

### WebSocket

- `GET /dashboard/api/namespace/:namespace/devworkspaces` (WebSocket upgrade) — real-time workspace status updates

## Security

- **SSRF protection**: the data resolver route validates all outbound URLs against an allowlist, blocks private IP ranges (RFC 1918, loopback, IPv4-mapped IPv6, link-local), and rejects redirects to blocked destinations.
- **Rate limiting**: applied to API routes via `@fastify/rate-limit`.
- **Dependency pinning**: all transitive dependencies with known CVEs are pinned via `resolutions` in the root `package.json`.

## Development

See [AGENTS.md](../AGENTS.md) for development commands and conventions.
