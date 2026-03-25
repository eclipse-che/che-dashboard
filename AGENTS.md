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

```text
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
- **Absolute imports**: ALWAYS use absolute imports with `@/` alias (never use relative imports like `./` or `../`)
- **No `any` type**: NEVER use `any` or cast to `any`. Use proper types, type guards, `unknown`, or specific interfaces instead. If an external API returns an untyped value, define an interface or use an existing type guard (e.g., `isKubeClientError()` from `@eclipse-che/common`).

## Surgical Change Workflow

When making surgical changes to one or few files, **ALWAYS** follow this workflow in order:

### 1. Run Unit Tests for Updated Files

Run tests for the specific files you modified:

**From package directory:**

```bash
yarn test --testPathPatterns <test-file-name>
```

**From project root:**

```bash
yarn workspace @eclipse-che/dashboard-frontend test --testPathPatterns <test-file-name>
# or
yarn workspace @eclipse-che/dashboard-backend test --testPathPatterns <test-file-name>
```

**Fix all test failures before proceeding to step 2.**

### 2. Run Formatter

**From package directory or project root:**

```bash
yarn format:fix
```

**Fix all formatting issues before proceeding to step 3.**

### 3. Run Linter

**From package directory or project root:**

```bash
yarn lint:fix
```

**Fix all linting issues before completing the change.**

### Important Notes

- **Sequential**: Complete each step and fix all failures before moving to the next
- **No skipping**: All three steps are mandatory for every surgical change
- **Fix immediately**: Do not defer fixing test, format, or lint failures

## Red Hat Compliance and Responsible AI Rules

See `./redhat-compliance-and-responsible-ai.md` and the Cursor rules file under `./.cursor/rules/`.
