# Devfile Creator with AI Agent Plugin

Adds a devfile editor with AI-powered workspace creation to the Eclipse Che Dashboard. Users can create, edit, and manage devfiles with a CodeMirror 6 editor, and use an AI agent running in a sidecar pod to generate devfile content through a terminal interface.

Based on [PR #1515](https://github.com/eclipse-che/che-dashboard/pull/1515).

**Status**: Disabled by default (`"enabled": false` in `plugin.json`). This is a proof-of-concept feature.

## Features

- **Devfile Editor**: CodeMirror 6 YAML editor with schema validation and autocompletion for Devfile 2.x
- **DevWorkspace Schema**: JSON schema validation for DevWorkspace resources
- **AI Agent Terminal**: Embedded xterm.js terminal connected to an AI agent pod (Claude Code, etc.) via WebSocket
- **Agent Pod Lifecycle**: Create, monitor, and cleanup AI agent pods in the user's namespace
- **Devfiles List**: Navigation sidebar section listing user's local devfiles
- **Devfile Details**: Split-panel view with editor and AI agent terminal
- **Loader Agent Panel**: Agent status panel integrated into the workspace loader flow
- **AI Agent Registry**: ConfigMap-based registry of available AI agents (similar to AI tool registry)

## Architecture

### Frontend

| Component | Description |
|-----------|-------------|
| `DevfileEditor` | CodeMirror 6 YAML editor with Devfile schema validation and linting |
| `DevfileEditorTools` | Toolbar for the devfile editor (save, format, validate) |
| `DevfileViewer` | Read-only devfile viewer |
| `BasicViewer` | Generic YAML/JSON viewer |
| `AgentTerminal` | xterm.js terminal with WebSocket connection to agent pod |
| `TerminalTools` | Terminal toolbar (clear, copy, theme toggle) |
| `AgentPodEvents` | Kubernetes event stream for agent pod lifecycle |
| `LoaderAgentPanel` | Agent status panel shown during workspace loading |

### Redux Stores

| Store | Description |
|-------|-------------|
| `AiAgentRegistry` | AI agent definitions and default agent selection |
| `DevfileSchema` | Devfile JSON schemas for editor validation (2.0.0 through 2.3.0) |
| `DevWorkspaceSchema` | DevWorkspace JSON schema for validation |
| `LocalDevfiles` | User's local devfiles, agent pod statuses, terminal URLs |

### Backend

| Route | Description |
|-------|-------------|
| `agents.ts` | Agent pod CRUD: create, delete, status, heartbeat, WebSocket terminal proxy |
| `aiAgentRegistry.ts` | GET `/api/ai-agent-registry` — reads agent definitions from ConfigMap |
| `devfileSchema.ts` | GET `/api/devfile-schema/:version` — serves Devfile JSON schemas |
| `devfiles.ts` | CRUD for user's local devfiles stored as ConfigMaps |
| `devworkspaceSchema.ts` | GET `/api/devworkspace-schema` — serves DevWorkspace JSON schema |

### Backend Helpers

| Helper | Description |
|--------|-------------|
| `agentPod.ts` | K8s Pod lifecycle: create agent pod, get status, cleanup expired pods |
| `devfile.ts` | Devfile parsing and validation utilities |
| `terminal/` | WebSocket proxy for terminal connections to agent pods |
| `terminal-themes.ts` | Terminal color themes (dark/light) |

## Directory Structure

```
dashboard-ai-agent/
  plugin.json                          # Manifest (disabled by default)
  frontend/
    plugin.tsx                         # FrontendPlugin registration (scaffold)
    components/
      AgentTerminal/                   # xterm.js terminal with WebSocket
      AgentPodEvents/                  # K8s event viewer for agent pods
      BasicViewer/                     # Generic YAML/JSON viewer
      DevfileEditor/                   # CodeMirror 6 YAML editor
      DevfileEditorTools/              # Editor toolbar
      DevfileViewer/                   # Read-only devfile viewer
      LoaderAgentPanel/                # Loader agent status panel
      TerminalTools/                   # Terminal toolbar
    pages/
      DevfileDetails/                  # Split-panel devfile editor + agent terminal
        AgentPanel/                    # Agent terminal panel
        EditorPanel/                   # CodeMirror editor panel
      DevfilesList/                    # Devfiles list page
    containers/
      DevfileDetails/                  # Connected container for DevfileDetails
      DevfilesList/                    # Connected container for DevfilesList
    store/
      AiAgentRegistry/                 # AI agent definitions store
      DevfileSchema/                   # Devfile JSON schema store
      DevWorkspaceSchema/              # DevWorkspace schema store
      LocalDevfiles/                   # Local devfiles + agent pod state
    services/
      backend-client/
        aiAgentRegistryApi.ts          # API client for agent registry
        devfileSchemaApi.ts            # API client for devfile schemas
        devworkspaceSchemaApi.ts        # API client for DevWorkspace schema
    navigation/
      AgentList.tsx                    # Sidebar navigation for agent pods
  backend/
    routes/
      agents.ts                        # Agent pod CRUD + terminal WebSocket proxy
      aiAgentRegistry.ts               # AI agent registry endpoint
      devfileSchema.ts                 # Devfile schema endpoint
      devfiles.ts                      # Local devfiles CRUD
    helpers/
      agentPod.ts                      # K8s Pod lifecycle management
      devfile.ts                       # Devfile validation utilities
      terminal/                        # WebSocket terminal proxy
      terminal-themes.ts               # Terminal color themes
    devfileSchemas/                    # JSON schemas for Devfile 2.0.0 - 2.3.0
```

## AI Agent Registry ConfigMap

Similar to the AI tool registry, the agent registry is read from a ConfigMap labeled:

```
app.kubernetes.io/component=ai-agent-registry
app.kubernetes.io/part-of=che.eclipse.org
```

The ConfigMap contains a JSON with `agents` array and `defaultAgentId`.

## Enabling

To enable this plugin:

1. Set `"enabled": true` in `plugins/dashboard-ai-agent/plugin.json`
2. Wire the stores, routes, and navigation in the plugin registration file (`frontend/plugin.tsx`)
3. Add the plugin's Redux reducers to `packages/dashboard-frontend/src/store/rootReducer.ts`
4. Add backend routes to `packages/dashboard-backend/src/app.ts`
5. Re-run `bash scripts/prepare-plugins.sh`
6. Update imports to use `@/plugins/dashboard-ai-agent/...` prefix

## Dependencies

This plugin requires additional npm packages not in the base dashboard:
- `@codemirror/lang-yaml` — YAML language support for CodeMirror
- `@codemirror/lint` — Linting framework for CodeMirror
- `codemirror` — CodeMirror 6 editor
- `@xterm/xterm` — Terminal emulator (already used by AI Selector for potential future use)
- `@xterm/addon-fit` — Auto-fit terminal to container
