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

### Single-file lint and type-check

To check a single file without running the full suite:

```bash
# Lint a single file
npx eslint path/to/file.ts

# Type-check a single file
npx tsc --noEmit path/to/file.ts
```

### Single-file lint and type-check

To check a single file without running the full suite:

```bash
# Lint a single file
npx eslint path/to/file.ts

# Type-check a single file
npx tsc --noEmit path/to/file.ts
```

### Important Notes

- **Sequential**: Complete each step and fix all failures before moving to the next
- **No skipping**: All three steps are mandatory for every surgical change
- **Fix immediately**: Do not defer fixing test, format, or lint failures

## Testing Changes on a Cluster

### MANDATORY: Compile TypeScript before building the Docker image

The Dockerfile (`build/dockerfiles/skaffold.Dockerfile`) copies **compiled artifacts** from `lib/`, not the TypeScript source. Editing `.ts` files and running the Docker build without compiling first silently produces an image with stale code — no error is raised.

Always compile the changed package before building:

```bash
# Backend changes
yarn workspace @eclipse-che/dashboard-backend build

# Frontend changes
yarn workspace @eclipse-che/dashboard-frontend build

# Both
yarn build
```

Then build and push the image using `run/build-multiarch.sh`. Always build for **both** `linux/amd64` and `linux/arm64` — a single-arch image will fail on nodes with a different architecture:

```bash
export IMAGE_REGISTRY_HOST=<your-registry-host>   # e.g. quay.io, ghcr.io, your private registry
export IMAGE_REGISTRY_USER_NAME=<your-username-or-org>
export PLATFORMS=linux/amd64,linux/arm64
./run/build-multiarch.sh
```

Use `run/patch.sh` to update the dashboard image on the cluster after pushing.

### Use a unique image tag when iterating

If you push a new build under an existing tag, nodes with `imagePullPolicy: IfNotPresent` (the default) will silently reuse the cached image. Deleting a pod does **not** force a fresh pull from the registry — the node cache persists.

Either:
- Use a fresh unique tag per build (e.g., append a timestamp or iteration counter), **or**
- Set `imagePullPolicy: Always` in the operator CR before deploying (see below)

### Patch the CheCluster CR, not the Deployment directly

The dashboard Deployment (named `devspaces-dashboard` or `che-dashboard` depending on the product) is managed by the CheCluster operator. Any direct `kubectl/oc patch deploy` is silently reverted within seconds by the operator's reconcile loop.

All spec changes — image, imagePullPolicy, env vars — must go through the CheCluster CR. Use `run/patch.sh` for the common case of updating the image alone. For other changes such as `imagePullPolicy`, patch the CR directly:

```bash
# Find the CheCluster CR name and namespace first:
kubectl get checluster --all-namespaces

# Then patch — adjust CR name, namespace, and container name to match your deployment:
kubectl patch checluster <cr-name> -n <namespace> --type=json \
  -p='[{"op":"replace","path":"/spec/components/dashboard/deployment/containers/0","value":{"name":"che-dashboard","image":"<image>","imagePullPolicy":"Always"}}]'
```

### Do not use background agents for Docker or cluster commands

Background agents cannot respond to interactive `dangerouslyDisableSandbox` permission prompts. Docker builds, `kubectl`, and `oc` commands that need sandbox bypass must be run directly in the main session, not delegated to a background agent.

## Red Hat Compliance and Responsible AI Rules

See `./redhat-compliance-and-responsible-ai.md`.

## Project Rules (Claude Code)

Project-specific rules live in `.claude/rules/`:

- **`che-dashboard-dev.md`** — commits, CSS property ordering, dependency license regeneration, git workflow patterns, accessibility conventions

## Project Skills (Claude Code)

Project-specific skills live in `.claude/skills/`. Use `/skill-name` to invoke:

- **`commit-message`** — write a human-style commit message: subject line, optional body, trailers
- **`manage-resolutions`** — audit `resolutions` in `package.json`: find orphans and stale pins, safely remove them one at a time with `yarn install` diff verification
- **`fix-cve-dep`** — upgrade a vulnerable npm dependency, check ClearlyDefined, regenerate `.deps/` files, commit and push
- **`rebase-to-main`** — rebase branch onto latest main, resolve `.deps/` conflicts, regenerate licenses, force-push
- **`fix-pr-feedback`** — fetch GitHub PR review comments, triage fixed vs open, apply fixes, push
- **`check-coverage`** — run coverage for changed packages, identify uncovered code, write missing tests; run before `pr-description`
- **`pr-test-section`** — write the "Is it tested? How?" section: choose the right template (deploy+verify, unit tests, dep upgrade, N/A) based on change type
- **`pr-description`** — generate a PR description and save to `openspec/docs/` (always run `check-coverage` first)
