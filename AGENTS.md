# AI Agent Guidelines for Eclipse Che Dashboard

This document provides context and guidelines for AI coding assistants working on the Eclipse Che Dashboard project.

## Project Overview

Eclipse Che Dashboard is the web-based user interface for Eclipse Che, a Kubernetes-native IDE platform. The dashboard provides:

- Workspace management (create, start, stop, delete)
- Factory flow for creating workspaces from Git repositories
- User preferences and settings
- Integration with DevWorkspace API

## Technology Stack

- **Frontend**: React 18, TypeScript, PatternFly 5
- **Backend**: Node.js, Fastify, TypeScript
- **State Management**: Redux Toolkit
- **Build**: Webpack, Yarn workspaces (monorepo)
- **Testing**: Jest, React Testing Library

## Project Structure

```
packages/
├── common/                 # Shared types and utilities
├── dashboard-backend/      # Node.js/Fastify backend
└── dashboard-frontend/     # React frontend
```

## Common Dev Commands

- **Install dependencies**: `yarn install`
- **Build all packages**: `yarn build`
- **Run tests**: `yarn test`
- **Lint**: `yarn lint` (or `yarn lint:fix`)
- **Format**: `yarn format` (or `yarn format:fix`)
- **License check**: `yarn license:generate`
- **Start local dev**: `yarn start`

## API Patterns

### Backend Services

The backend uses `@kubernetes/client-node` to interact with Kubernetes APIs:

- **DevWorkspace API**: CRUD operations for DevWorkspace custom resources
- **Core V1 API**: Secrets, ConfigMaps, Pods, Events
- **Custom Objects API**: CheCluster, DevWorkspaceTemplates

### Frontend Services

- **Axios** for HTTP requests to backend
- **WebSocket** for real-time updates (workspace status, logs)

## Project Conventions

- **TypeScript strict mode**: All code must pass strict type checking
- **ESLint + Prettier**: Follow existing code style
- **Test coverage**: New features should include tests
- **Copyright headers**: All source files must have EPL-2.0 headers

## Red Hat Compliance and Responsible AI Rules

See `./redhat-compliance-and-responsible-ai.md` and the Cursor rules file under `./.cursor/rules/`.


