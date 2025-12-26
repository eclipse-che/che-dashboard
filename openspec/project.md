# Eclipse Che Dashboard - Project Specification

## Overview

Eclipse Che Dashboard is the web-based user interface for Eclipse Che, providing workspace management capabilities for developers using Kubernetes-native development environments.

## Core Features

### 1. Workspace Management

- Create workspaces from Git repositories (Factory flow)
- Start, stop, restart, and delete workspaces
- View workspace status and events
- Access workspace IDE

### 2. Factory Flow

The factory flow enables creating workspaces from URLs:

```
/load-factory?url=https://github.com/org/repo
```

Key components:
- URL parsing and validation
- Devfile resolution
- Workspace creation with DevWorkspace API
- Progress tracking with step-by-step UI

### 3. User Preferences

- Git configuration (user.name, user.email)
- SSH keys management
- Personal access tokens
- Container registry credentials

### 4. Administration

- Cluster-wide workspace limits
- Allowed source URLs
- Default editor configuration

## Architecture

### Frontend (React)

```
src/
├── components/     # Reusable UI components
├── containers/     # Connected components
├── pages/          # Page-level components
├── services/       # API clients
├── store/          # Redux state management
└── contexts/       # React contexts
```

### Backend (Fastify)

```
src/
├── routes/         # API route handlers
├── devworkspaceClient/
│   └── services/   # Kubernetes API wrappers
├── services/       # Business logic
└── helpers/        # Utility functions
```

## API Endpoints

### DevWorkspaces

- `GET /dashboard/api/namespace/:namespace/devworkspaces`
- `POST /dashboard/api/namespace/:namespace/devworkspaces`
- `GET /dashboard/api/namespace/:namespace/devworkspaces/:name`
- `PATCH /dashboard/api/namespace/:namespace/devworkspaces/:name`
- `DELETE /dashboard/api/namespace/:namespace/devworkspaces/:name`

### Configuration

- `GET /dashboard/api/server-config`
- `GET /dashboard/api/cluster-config`
- `GET /dashboard/api/cluster-info`

### User Data

- `GET /dashboard/api/namespace/:namespace/gitconfig`
- `PATCH /dashboard/api/namespace/:namespace/gitconfig`
- `GET /dashboard/api/namespace/:namespace/ssh-key`
- `POST /dashboard/api/namespace/:namespace/ssh-key`

## Development

See [AGENTS.md](../AGENTS.md) for development commands and conventions.


