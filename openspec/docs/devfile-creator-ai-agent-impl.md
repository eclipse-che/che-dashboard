# Feature Implementation
## Devfile Creator with AI Agent
### Eclipse Che Dashboard — AI-Assisted Devfile Authoring

| Field | Value |
|-------|-------|
| **Project** | Eclipse Che Dashboard |
| **Component** | Devfile Creator with AI Agent |
| **Version** | Implementation v1.0 |
| **Date** | May 2026 |
| **Author** | Oleksii Orel |
| **Repository (Dashboard)** | github.com/eclipse-che/che-dashboard (`plugins` branch) |
| **Repository (Plugins)** | github.com/olexii4/che-dashboard-plugins |
| **Repository (Agent Image)** | github.com/olexii4/che-dashboard-agent |
| **Status** | Working Implementation |

---

## 1. Executive Summary

This document describes the production implementation of the **Devfile Creator with AI Agent** feature for the Eclipse Che Dashboard. Built on top of the proof-of-concept, the implementation addresses all known PoC limitations and introduces a **plugin architecture** that decouples feature code from the dashboard core.

Key improvements over the PoC:

- **CodeMirror 6 YAML editor** with inline devfile schema validation (Ajv → diagnostics) and JSON Schema-driven autocompletion — replaces the plain textarea.
- **Auto-apply**: Claude Code writes devfile content directly to a Kubernetes ConfigMap; the editor syncs in real-time via a dedicated WebSocket `CONFIGMAP` channel — no manual copy/paste.
- **ttyd** replaces wetty as the terminal server: ttyd is a single static binary with no Node.js/npm runtime, producing a scratch-based agent image under 50 MB.
- **Plugin system**: feature code ships as ZIP archives from a separate repository ([olexii4/che-dashboard-plugins](https://github.com/olexii4/che-dashboard-plugins)); the dashboard fetches them at build time.
- **DevWorkspace tab** on the Workspace Loader page for troubleshooting failing workspaces.
- **AI Selector** widget in workspace creation and User Preferences API key management.
- **Agent pod** (not DevWorkspace) architecture: agents run as plain Kubernetes Pods, avoiding DevWorkspace overhead and eliminating the CRC wildcard DNS dependency.

---

## 2. Problem Statement

Creating custom devfiles remains the primary barrier to adopting Eclipse Che for non-trivial workloads. Users must understand the devfile schema, Kubernetes resource model, container images, volume mounts, and command lifecycle — with no authoring UI inside the dashboard.

The PoC validated the concept. The production implementation addresses its open issues:

| PoC Limitation | Resolution in v1.0 |
|---|---|
| Basic textarea editor | CodeMirror 6 with schema validation + autocompletion |
| Manual YAML copy from agent | Real-time WebSocket ConfigMap watch auto-updates editor |
| Single agent (Claude Code only) | AI Agent Registry ConfigMap — pluggable agent definitions |
| Create Workspace not wired | `/api/devfiles/:ns/:id/raw` endpoint feeds factory flow |
| DevWorkspace-based agent | Plain Kubernetes Pod + ClusterIP Service (no DevWorkspace API) |
| Agent sidebar section missing | AGENT PODS nav section pinned to bottom of sidebar |
| No DevWorkspace troubleshooting tab | DevWorkspace tab added to Workspace Loader page |
| AI tool injection not in dashboard | AI Selector plugin with workspace creation integration |

---

## 3. Architecture Overview

### 3.1 System Components

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Dashboard Frontend | React 18, Redux Toolkit, PatternFly 6 | UI for devfile management and AI agent interaction |
| Dashboard Backend | Node.js, Fastify | REST API: devfile CRUD, agent lifecycle, schemas, registry |
| Devfile Storage | Kubernetes ConfigMap | Per-user devfile persistence (`devfile-creator-storage`) |
| Agent Pod | Plain Kubernetes Pod + ClusterIP Service | Runs ttyd + Claude Code; no DevWorkspace overhead |
| Agent Image | scratch + ttyd + Claude Code binary + kubectl | Minimal image (~50 MB) from [olexii4/che-dashboard-agent](https://github.com/olexii4/che-dashboard-agent) |
| Terminal Transport | iframe → Dashboard WebSocket proxy | Dashboard proxies the ttyd WebSocket; browser talks only to dashboard origin |
| Plugin Distribution | GitHub Releases (ZIP) | Plugin source in [olexii4/che-dashboard-plugins](https://github.com/olexii4/che-dashboard-plugins) |

### 3.2 High-Level Data Flow

```
User Browser
│
├── HTTPS ──► Eclipse Che Dashboard (React SPA)
│               │
│               ├── REST ──► Dashboard Backend (Fastify)
│               │               │
│               │               ├── K8s API ──► ConfigMap  (devfile storage)
│               │               ├── K8s API ──► Pod        (agent lifecycle)
│               │               ├── K8s API ──► Service    (agent ClusterIP)
│               │               └── K8s API ──► ConfigMap  (agent registry)
│               │
│               └── WebSocket ──► /dashboard/api/namespace/:ns/agent/t/ws
│                                   │
│                                   └── TCP proxy ──► ttyd (agent pod :8080)
│                                                       │
│                                                       └── PTY ──► claude CLI
```

### 3.3 Agent Pod vs PoC DevWorkspace

The PoC used a headless DevWorkspace as the agent host. The production implementation uses a **plain Kubernetes Pod** instead:

| Aspect | PoC (DevWorkspace) | v1.0 (Pod) |
|--------|-------------------|------------|
| Startup time | ~45–60 s (DevWorkspace controller) | ~5–10 s |
| Resource overhead | DevWorkspace controller + routing | None beyond the pod itself |
| DNS / routing | Requires cluster wildcard DNS | ClusterIP only; proxied by dashboard |
| Lifecycle control | DevWorkspace `started` field | `kubectl delete pod` |
| Max per user | 1 (unique name constraint) | 3 (enforced by backend) |
| TTL mechanism | Manual stop on page leave | Heartbeat annotation; 20 min auto-cleanup |

### 3.4 Plugin Architecture

Feature code is not committed to `eclipse-che/che-dashboard`. It ships as two independently versioned plugins:

```
olexii4/che-dashboard-plugins
├── ai-selector/          → ai-selector.zip (GitHub Release)
└── dashboard-ai-agent/   → dashboard-ai-agent.zip (GitHub Release)
```

The dashboard fetches ZIPs at build time via `scripts/fetch-plugins.sh`:

```bash
curl -L https://github.com/olexii4/che-dashboard-plugins/releases/download/latest/ai-selector.zip
curl -L https://github.com/olexii4/che-dashboard-plugins/releases/download/latest/dashboard-ai-agent.zip
```

---

## 4. Implementation Details

### 4.1 Backend: Devfile Storage API

Devfiles are stored in a Kubernetes ConfigMap named `devfile-creator-storage` in the user's namespace. Each entry uses a UUID key and raw YAML value. Modification timestamps are stored in ConfigMap annotations.

#### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/dashboard/api/devfiles/namespace/:ns` | List all devfiles (parsed metadata + content) |
| `POST` | `/dashboard/api/devfiles/namespace/:ns` | Create devfile; returns `{ id }` |
| `PUT` | `/dashboard/api/devfiles/namespace/:ns/:id` | Update devfile content |
| `DELETE` | `/dashboard/api/devfiles/namespace/:ns/:id` | Remove devfile entry |
| `GET` | `/dashboard/api/devfiles/namespace/:ns/:id/raw` | Raw YAML (used by factory flow) |
| `GET` | `/dashboard/api/devfile?version=` | Devfile JSON schemas 2.0.0 – 2.3.0 |
| `GET` | `/dashboard/api/devworkspace-schema` | DevWorkspace CRD JSON schema |

#### ConfigMap Structure

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: devfile-creator-storage
  namespace: <user-namespace>
  labels:
    app.kubernetes.io/component: devfile-creator
    app.kubernetes.io/part-of: che.eclipse.org
  annotations:
    che.eclipse.org/modified-<uuid>: "2026-05-04T10:30:00.000Z"
data:
  "<uuid>": |
    schemaVersion: 2.2.0
    metadata:
      name: my-python-app
    components:
      - name: tools
        container:
          image: quay.io/devfile/universal-developer-image:ubi8-latest
          memoryLimit: 4Gi
```

### 4.2 Backend: Agent Pod API

Agents run as plain Kubernetes Pods. The backend manages their lifecycle and proxies the terminal WebSocket.

#### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/dashboard/api/namespace/:ns/agent` | Create agent pod + ClusterIP Service |
| `GET` | `/dashboard/api/namespace/:ns/agent/:agentId` | Agent pod status |
| `DELETE` | `/dashboard/api/namespace/:ns/agent/:agentId` | Stop and delete agent pod |
| `POST` | `/dashboard/api/namespace/:ns/agent/:agentId/heartbeat` | Update last-heartbeat annotation |
| `GET` | `/dashboard/api/namespace/:ns/agent-terminal-url` | Resolve in-cluster ttyd URL |
| `GET/WS` | `/dashboard/api/namespace/:ns/agent/t/ws` | WebSocket proxy to ttyd |

#### Agent Pod Specification

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: agent-<normalized-id>
  namespace: <user-namespace>
  labels:
    app.kubernetes.io/component: ai-agent
    app.kubernetes.io/part-of: che.eclipse.org
    che.eclipse.org/agent-id: <normalized-id>
  annotations:
    che.eclipse.org/ai-agent-id: <instance-id>
    che.eclipse.org/last-heartbeat: "<ISO-timestamp>"
spec:
  automountServiceAccountToken: false
  containers:
    - name: agent
      image: quay.io/oorel/dashboard-agent:next
      ports:
        - containerPort: 8080
      env:
        - name: KUBERNETES_API_URL
          value: https://kubernetes.default.svc
        - name: CHE_USER_TOKEN_FILE
          value: /var/run/secrets/che/token
```

### 4.3 Backend: AI Registries

#### AI Tool Registry (ai-selector plugin)

Reads from ConfigMaps labeled `app.kubernetes.io/component=ai-tool-registry`:

```
GET /dashboard/api/ai-registry
GET /dashboard/api/ai-config
GET/POST/DELETE /dashboard/api/namespace/:ns/ai-provider-key
```

#### AI Agent Registry (dashboard-ai-agent plugin)

Reads from a ConfigMap labeled `app.kubernetes.io/component=ai-agent-registry`:

```
GET /dashboard/api/ai-agent-registry
```

### 4.4 Frontend: Devfile Creator List Page

Route: `/devfiles`

- **Navigation**: "Devfiles (N)" sidebar entry with live count from Redux store.
- **List view**: name, description, last modified, project count; filterable and sortable.
- **Create modal**: name and description fields; creates devfile, navigates to editor.
- **Row actions**: open, download (`.devfile.yaml`), delete with confirmation.
- **Bulk delete**: select multiple rows, delete all.

### 4.5 Frontend: Devfile Details / Editor Page

Route: `/devfile/:namespace/:devfileId`

**Left panel — YAML Editor**

- CodeMirror 6 with `@codemirror/lang-yaml` syntax highlighting.
- **Devfile schema linting**: custom `yamlSchemaLinter` extension validates content with Ajv against the devfile JSON schema and surfaces errors as CodeMirror diagnostics.
- **Autocompletion**: custom `yamlSchemaCompletion` extension provides JSON Schema-driven suggestions.
- EditorTools toolbar: save, refresh, expand to full screen.
- Real-time sync via WebSocket `CONFIGMAP` channel — editor updates as the agent writes to the ConfigMap.

**Right panel — AI Agent**

- Empty state with **Start Agent** button when no agent is running.
- `ProgressIndicator` during pod startup (PENDING phase).
- `AgentTerminal` iframe embedding the ttyd terminal when the agent is running (RUNNING + ready).
- `AgentPodEvents` component streaming Kubernetes pod events for startup diagnostics.
- **Stop Agent** button stops the pod and clears the terminal.
- `TerminalTools` toolbar: clear, copy, toggle dark/light theme.

**Header actions (dropdown)**

- Create Workspace (navigates to factory flow with raw devfile URL).
- Download devfile as YAML.
- Delete with confirmation.

### 4.6 Frontend: Workspace Loader — DevWorkspace Tab

The **DevWorkspace** tab appears on the workspace loading page when the AI Agent Registry has at least one agent configured (`agentEnabled = true`).

- Full DevWorkspace YAML editor backed by the DevWorkspace CRD JSON schema.
- Same `LoaderAgentPanel` component: DevWorkspace editor on the left, agent panel on the right.
- Agent can read pod events, inspect container logs, and patch the DevWorkspace spec to fix startup failures.
- Workspace `TimeLimit` countdown is **suspended** while an agent is running (prevents premature restart).
- Workspace start/stop dropdown added to the loader header (`actions` prop on `Header` component).

### 4.7 Frontend: AI Selector Plugin

- **Create Workspace page**: AI Provider Selector accordion; users pick a provider/tool before creating a workspace.
- **User Preferences → AI Providers Keys tab**: add, update, delete per-provider API keys stored as Kubernetes Secrets with `controller.devfile.io/mount-as: env` annotation.
- **Workspace Details → Overview tab**: current AI tool display with info and selector modals.
- **Workspaces List**: AI Provider column showing the injected tool icon and name.

### 4.8 Agent Lifecycle

```
[Start Agent] click
      │
      ▼
POST /api/namespace/:ns/agent
  → Create Pod + ClusterIP Service
  → Dispatch upsertAgentPodStatus (PENDING)
      │
      ▼ (WebSocket POD events)
Pod RUNNING + containerReady = true
  → Dispatch upsertAgentPodStatus (RUNNING, ready=true)
      │
      ▼
Poll /api/namespace/:ns/agent-terminal-url every 3s
  → Resolve in-cluster ClusterIP URL
  → Store agentTerminalUrl in Redux
      │
      ▼
AgentTerminal iframe src = dashboard WebSocket proxy
  → ttyd ← PTY ← bash ← claude
      │
      ▼ (every 30s)
POST /api/namespace/:ns/agent/:id/heartbeat
  → Updates che.eclipse.org/last-heartbeat annotation
      │
      ▼ (page leave / componentWillUnmount)
DELETE /api/namespace/:ns/agent/:id (keepalive: true)
  → Pod and Service deleted
```

**Auto-cleanup**: Backend periodic job (every 5 minutes) deletes pods whose `last-heartbeat` annotation is older than **20 minutes**. Maximum **3 concurrent agent pods** per user enforced at creation time.

---

## 5. User Flow

| Step | Action | Result |
|------|--------|--------|
| 1 | Click **Devfiles** in sidebar | Devfile list page loads; existing devfiles shown with count |
| 2 | Click **Create Devfile** | Modal opens; enter name + description; new devfile created |
| 3 | Devfile Details page opens | CodeMirror editor shows default devfile skeleton |
| 4 | Click **Start Agent** | Agent pod created; ProgressIndicator shown |
| 5 | Pod reaches Running + ready | ttyd terminal appears via iframe; Claude Code auto-launches |
| 6 | Interact with Claude | E.g. "add the project https://github.com/olexii4/database-app.git" |
| 7 | Claude writes to ConfigMap | WebSocket CONFIGMAP event → editor updates in real-time |
| 8 | Click **Create Workspace** | Factory flow opens with raw devfile URL pre-filled |
| 9 | Navigate away | `DELETE /agent/:id` with `keepalive: true`; Redux state cleared |

### 5.1 Workspace Troubleshooting Flow

| Step | Action | Result |
|------|--------|--------|
| 1 | Workspace fails to start | Loader page shows error in Progress tab |
| 2 | Click **DevWorkspace** tab | DevWorkspace YAML editor + AI Agent panel shown |
| 3 | Click **Start Agent** | Claude Code agent starts in user namespace |
| 4 | Claude diagnoses failure | Reads pod events, identifies issue (e.g. missing `args`) |
| 5 | Agent patches DevWorkspace | Editor reflects the fix via ConfigMap/DevWorkspace watch |
| 6 | Click **Save** | DevWorkspace spec updated via Kubernetes API |
| 7 | Restart workspace | Workspace starts successfully |

---

## 6. File Structure

### 6.1 Dashboard Core (modified/added — `eclipse-che/che-dashboard`)

```
packages/
  common/src/
    constants/terminalThemes.ts          # TerminalTheme, TERMINAL_THEMES
    dto/api/index.ts                     # AiAgentDefinition, IAiRegistry, …
    dto/api/webSocket.ts                 # Channel.CONFIGMAP, ConfigMapMessage
  dashboard-plugins/                     # NEW — Plugin SDK package
    src/
      types.ts                           # FrontendPlugin, PluginSlots, …
      registry.ts                        # registerFrontendPlugin, getPlugin*
      frontend/PluginSlot.tsx            # React slot component
  dashboard-backend/src/
    app.ts                               # Route registrations
    routes/api/
      agents.ts                          # Agent pod CRUD + WS proxy
      aiAgentRegistry.ts                 # Read agent registry ConfigMap
      aiConfig.ts                        # Cluster AI config
      aiRegistry.ts                      # AI tool registry
      devfiles.ts                        # Devfile CRUD
      devfileSchema.ts                   # Static schema serving
    devworkspaceClient/services/helpers/
      patchOptions.ts                    # JSON_MERGE_PATCH_OPTIONS added
  dashboard-frontend/src/
    Routes/index.tsx                     # /devfiles, /devfile/:ns/:id routes
    Layout/Navigation/
      AgentList.tsx                      # AGENT PODS nav section
    store/rootReducer.ts                 # New slices registered
    services/bootstrap/index.ts          # subscribeToAgentPodChanges()
    services/backend-client/websocketClient/
      index.ts                           # removeChannelMessageListener()
      subscriptionsManager.ts            # Channel.CONFIGMAP in SubscriptionArgs
    components/
      Header/index.tsx                   # actions prop added
      WorkspaceProgress/StartingSteps/
        OpenWorkspace/index.tsx          # hasRunningAgent guard on TimeLimit
        StartWorkspace/index.tsx         # same
    pages/Loader/
      index.tsx                          # DevWorkspace tab + LoaderAgentPanel
    containers/Loader/index.tsx          # Agent lifecycle management
scripts/
  fetch-plugins.sh                       # Download ZIPs from GitHub Releases
  prepare-plugins.sh                     # Symlink + generate src/plugins/index.ts
run/
  local-patch.sh                         # Fast CRC deploy (arm64, SSH load)
build/dockerfiles/
  Dockerfile                             # fetch-plugins.sh before build
  rhel.Dockerfile                        # same
```

### 6.2 Plugin Source (`olexii4/che-dashboard-plugins`)

```
ai-selector/
  plugin.json                            # manifest (enabled: true)
  frontend/
    plugin.tsx                           # registers userPreferencesTab slot
    components/AiSelector/              # provider gallery
    components/AiToolIcon/              # tool icon
    pages/UserPreferences/AiProviderKeys/
    pages/WorkspaceDetails/OverviewTab/AiTool/
    store/AiConfig/                     # Redux slice
    services/backend-client/aiConfigApi.ts
  backend/
    routes/aiConfig.ts
    routes/aiRegistry.ts
    services/aiProviderKeyApi.ts
    services/aiRegistryApi.ts

dashboard-ai-agent/
  plugin.json                            # manifest (enabled: true)
  frontend/
    plugin.tsx                           # registers navigationItems slot
    components/
      AgentTerminal/                    # ttyd iframe wrapper
      AgentPodEvents/                   # Kubernetes event stream
      DevfileEditor/                    # CodeMirror 6 + schema validation
      DevfileEditorTools/               # Save/refresh/expand toolbar
      DevfileViewer/                    # Read-only CodeMirror viewer
      LoaderAgentPanel/                 # Split-panel: editor + agent
      TerminalTools/                    # Clear/copy/theme toolbar
    containers/
      DevfileDetails/                   # Redux-connected with agent lifecycle
      DevfilesList/                     # Redux-connected list
    pages/
      DevfileDetails/                   # Split layout page
      DevfilesList/                     # List + create modal
    navigation/AgentList.tsx            # AGENT PODS sidebar component
    store/
      AiAgentRegistry/                  # Agent definitions
      DevfileSchema/                    # Devfile JSON schemas
      DevWorkspaceSchema/               # DevWorkspace CRD schema
      LocalDevfiles/                    # Devfiles + agent pod statuses
  backend/
    routes/agents.ts                    # Agent pod CRUD + WS proxy
    routes/aiAgentRegistry.ts
    routes/devfiles.ts
    routes/devfileSchema.ts
    helpers/agentPod.ts                 # Pod create/delete/status/cleanup
    helpers/devfile.ts                  # YAML parsing utilities
    helpers/terminal/index.ts          # WebSocket proxy

packages/dashboard-plugins/            # shim for standalone type-checking
```

### 6.3 Agent Container (`olexii4/che-dashboard-agent`)

```
dockerfiles/Dockerfile                  # Multi-stage scratch image
scripts/collect-rootfs.sh              # Collects binaries + shared libs
settings/settings.json                 # Claude Code model config
settings/claude.json                   # Skip onboarding wizard
skills/CLAUDE.md                        # Devfile authoring system prompt
```

---

## 7. Security Considerations

| Concern | Mitigation |
|---------|-----------|
| Devfile data isolation | Stored in user's own namespace; RBAC enforced by Kubernetes |
| Agent pod RBAC | User token injected as a Secret; pod accesses K8s API only with user's permissions |
| API key management | Stored as Kubernetes Secrets with `controller.devfile.io/mount-as: env`; never sent to dashboard backend |
| Terminal access | Dashboard proxies the ttyd WebSocket; browser never connects to agent directly; no cross-origin |
| Agent image | Runs as UID 1001 (non-root); OpenShift arbitrary UID supported via `/tmp/claude-home` redirect |
| Terminal cleanup | `DELETE /agent/:id` called with `keepalive: true` on page leave |
| TTL enforcement | 20-minute heartbeat TTL; backend garbage-collects idle pods |

---

## 8. Technical Challenges and Solutions

### 8.1 CSS Isolation (terminal in PatternFly page)

**Problem**: Direct xterm.js integration conflicted with PatternFly global CSS.

**PoC solution**: wetty iframe for CSS isolation.

**v1.0 solution**: ttyd replaces wetty. ttyd is a single static binary (~5 MB) with no runtime dependencies, producing a scratch-based image under 50 MB. The dashboard embeds ttyd via an iframe (Dashboard WebSocket proxy endpoint), retaining CSS isolation while eliminating the Node.js/npm runtime from the agent container.

### 8.2 Real-time Editor Sync

**Problem**: PoC required the user to manually copy AI-generated YAML from the terminal into the editor.

**Solution**: Claude Code writes devfile content directly to the Kubernetes ConfigMap. The dashboard subscribes to the `CONFIGMAP` WebSocket channel (a new channel added to `@eclipse-che/common`). Each ConfigMap update triggers a Redux state update, which re-renders the CodeMirror editor with the new content. The user sees their devfile take shape in real-time as Claude works.

### 8.3 Module Identity in Webpack Bundles

**Problem**: `@eclipse-che/dashboard-plugins` (npm package) and `@/plugin-registry` (local module) were two separate webpack module instances, each with their own `frontendPlugins[]` array. Plugins registered in one were invisible to `getPlugin*` calls in the other, causing "Devfiles" to disappear from the nav after a module split was introduced.

**Solution**: All `getPlugin*` getter functions were moved into `packages/dashboard-frontend/src/plugin-registry/index.ts` — the same module that holds the `frontendPlugins` array. Components import from `@/plugin-registry`, never directly from `@eclipse-che/dashboard-plugins` for runtime state. This guarantees a single array instance.

### 8.4 CodeMirror in Hidden PatternFly Tabs

**Problem**: PatternFly hides inactive tab content with `display: none`. When CodeMirror mounts in a hidden container it initializes with 0×0 dimensions and remains invisible when the tab is later activated.

**Solution**: The Loader page uses `React.createElement(Tabs, props, ...tabs)` to pass plugin tabs as **direct children** of Tabs (not wrapped in Fragment). This ensures PatternFly's tab system recognizes and renders each Tab correctly. The plugin `DevWorkspaceLoaderTab` renders a `<pre>` element for the DevWorkspace YAML, which is not affected by CodeMirror initialization timing.

### 8.5 WebSocket LOGS Retry Loop on 400

**Problem**: During workspace startup, the LOGS WebSocket channel returns HTTP 400 (containers not ready) and the client resubscribed immediately, producing thousands of console error messages.

**Solution**: The `isStatusMessage` handler in `store/Pods/Logs/actions.ts` now returns early on `status.code === 400` without resubscribing. A 400 is a definitive Kubernetes API rejection (container not ready for log streaming), not a transient error.

---

## 9. Technology Stack

| Category | Technology | Details |
|----------|-----------|---------|
| Frontend Framework | React 18 + TypeScript | |
| State Management | Redux Toolkit | `createAction`/`createReducer` |
| UI Library | PatternFly 6 | PF6 components |
| YAML Editor | CodeMirror 6 | `@codemirror/lang-yaml`, custom linter + completer |
| Schema Validation | Ajv | JSON Schema validation → CodeMirror diagnostics |
| Backend Framework | Fastify | Node.js monorepo |
| Container Runtime | Kubernetes | Pods + ClusterIP Services |
| Agent Base Image | scratch | Minimal: ttyd + Claude Code + kubectl + bash |
| Web Terminal | ttyd v1.7.7 | Single static binary, xterm.js UI |
| AI CLI | Claude Code | Bun standalone binary (no Node.js/npm) |
| Build Tool | Webpack 5 / Yarn 4 | Monorepo workspaces |
| Plugin Distribution | GitHub Releases (ZIP) | `scripts/fetch-plugins.sh` |
| Local Deploy | `yarn local:patch` | arm64 Docker build → SSH load into CRC → IfNotPresent |

---

## 10. Known Limitations and Future Work

| Limitation | Status |
|-----------|--------|
| Single agent type (Claude Code) | The AI Agent Registry ConfigMap supports multiple agents; the UI shows the default. Multi-agent selection UI is future work. |
| DevWorkspace schema auto-update | Schema is fetched once at page load; does not auto-update when the CRD changes. |
| Periodic cleanup cross-namespace RBAC | The 5-minute cleanup job uses `listPodForAllNamespaces`; the `che` service account has the required ClusterRole, but runtime failures are logged at WARN level (filtered by default). |
| Agent terminal reconnect | If the Dashboard pod restarts, the agent pod survives but the terminal URL must be re-fetched. `heartbeatTimer` handles this after the next heartbeat cycle. |

---

## 11. How to Test

### 11.1 Prerequisites

- CRC (OpenShift Local) or OpenShift cluster with Eclipse Che installed.
- Dashboard image from this branch / local build.
- `ANTHROPIC_API_KEY` configured in the user namespace as a Kubernetes Secret with `controller.devfile.io/mount-as: env` annotation.

### 11.2 AI Agent Registry ConfigMap

```bash
kubectl apply -f - <<'EOF'
apiVersion: v1
kind: ConfigMap
metadata:
  name: ai-agent-registry
  namespace: eclipse-che
  labels:
    app.kubernetes.io/component: ai-agent-registry
    app.kubernetes.io/part-of: che.eclipse.org
data:
  registry.json: |
    {
      "agents": [
        {
          "id": "dashboard-agent",
          "name": "Dashboard Agent",
          "publisher": "Eclipse Che",
          "description": "AI agent powered by Claude Code for building and troubleshooting Devfiles and DevWorkspaces",
          "image": "quay.io/oorel/dashboard-agent",
          "tag": "next",
          "memoryLimit": "896Mi",
          "cpuLimit": "1",
          "terminalPort": 8080,
          "env": [],
          "initCommand": "claude --dangerously-skip-permissions --append-system-prompt \"CRITICAL RULES: 1) EVERY non-UDI container MUST have args: [tail, -f, /dev/null]. 2) NEVER use python3, awk, perl, node — use jq, sed, cut, curl.\""
        }
      ],
      "defaultAgentId": "dashboard-agent"
    }
EOF
```

### 11.3 Testing Steps

| # | Step | Expected Result |
|---|------|----------------|
| 1 | Navigate to dashboard; click **Devfiles** | Devfile list page loads; empty state shown |
| 2 | Click **Create Devfile**; enter name | New devfile created; navigated to editor |
| 3 | Edit YAML in CodeMirror editor | Schema errors shown inline; autocompletion active |
| 4 | Click **Save** | Content persisted to ConfigMap; button re-disables |
| 5 | Click **Start Agent** | Pod status PENDING shown; events stream in panel |
| 6 | Wait for agent to start | ttyd terminal appears; Claude Code auto-launches |
| 7 | Type a prompt (e.g. add a Node.js project) | Claude responds; editor updates in real time |
| 8 | Click **Create Workspace** | Factory flow opens with raw devfile URL pre-filled |
| 9 | Navigate to Workspaces; start a broken workspace | Loader page shows failure in Progress tab |
| 10 | Open **DevWorkspace** tab; click **Start Agent** | Agent diagnoses failure; editor shows fix |
| 11 | Save and restart workspace | Workspace starts successfully |
| 12 | Check sidebar; observe **AGENT PODS** section | Running agent shown with status icon |
| 13 | Navigate away from devfile page | Agent pod deleted; nav section clears |

---

## 12. Conclusion

The production implementation of the Devfile Creator with AI Agent feature delivers a complete, plugin-based extension to the Eclipse Che Dashboard. Key technical validations achieved over the PoC:

- **CodeMirror 6** with live schema validation replaces the plain textarea.
- **Real-time ConfigMap sync** eliminates manual copy/paste between agent and editor.
- **ttyd + scratch image** produces a minimal agent container with no runtime overhead.
- **Plugin ZIP distribution** via GitHub Releases decouples feature versioning from the dashboard core release cycle.
- **Plain Kubernetes Pods** as agent hosts eliminate DevWorkspace controller overhead and wildcard DNS dependencies.
- **`@eclipse-che/dashboard-plugins`** SDK establishes a stable, upstream-contributable API for future dashboard extensions.

The implementation is ready for upstream contribution following the phased approach: plugin SDK first, then core integration hooks, then feature PRs (AI Selector, Devfile Creator).
