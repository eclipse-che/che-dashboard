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

This document describes the production implementation of the Devfile Creator with AI Agent feature for the Eclipse Che Dashboard. Building on the proof of concept, this version resolves all known PoC limitations and introduces a plugin architecture that decouples feature code from the dashboard core.

The implementation delivers the full vertical slice: backend REST API and WebSocket proxy, frontend YAML editor with real-time AI sync, plugin distribution via GitHub Releases, and an agent container based on ttyd instead of wetty.

### Key Achievements Over PoC

- **CodeMirror 6 YAML editor** with inline Devfile schema validation (Ajv → diagnostics) and JSON Schema-driven autocompletion — replaces the plain textarea
- **Real-time ConfigMap sync** — Claude Code writes directly to the ConfigMap; the editor updates automatically via a new WebSocket `CONFIGMAP` channel — no manual copy/paste
- **ttyd replaces wetty** — single static binary, scratch-based image under 50 MB, no Node.js/npm runtime in the container
- **Plain Kubernetes Pod** replaces headless DevWorkspace — 5–10 s startup vs 45–60 s, no wildcard DNS dependency, up to 3 pods per user with 20-minute heartbeat TTL
- **Plugin system** — feature code ships as independently versioned ZIP archives from a dedicated repository; the dashboard fetches them at build time via `scripts/fetch-plugins.sh`
- **DevWorkspace tab** on the Workspace Loader page for troubleshooting failing workspaces
- **AI Selector** plugin for workspace creation and User Preferences API key management
- **AGENT PODS** navigation section pinned to the bottom of the sidebar

---

## 2. Problem Statement

Creating custom devfiles is the primary barrier to adopting Eclipse Che for non-trivial workloads. Users must understand the devfile schema, Kubernetes resource model, container images, volume mounts, and command lifecycle. There is currently no way to author a devfile inside the dashboard before workspace creation.

Additionally, AI CLI tools (Claude Code, Gemini CLI) have no integration with the dashboard itself. Users must open a full IDE workspace, navigate to a terminal, and interact with them manually.

### PoC Limitations Addressed

| PoC Limitation | Resolution in v1.0 |
|---|---|
| Basic textarea editor | CodeMirror 6 with Devfile schema validation and autocompletion |
| Manual YAML copy from agent | Real-time WebSocket `CONFIGMAP` channel auto-syncs editor |
| Single-instance agent (DevWorkspace) | Plain Pods: up to 3 per user, 20-min TTL, 5-10 s startup |
| Wetty + Node.js runtime in container | ttyd single binary, scratch image, ~50 MB total |
| CRC wildcard DNS required for terminal | Dashboard proxies ttyd WebSocket; browser never reaches agent directly |
| No DevWorkspace troubleshooting tab | `DevWorkspace` tab added to Workspace Loader with full editor + agent |
| AI tool injection not in dashboard | `ai-selector` plugin with workspace creation and User Preferences UI |
| No Create Workspace action from devfile | `/api/devfiles/:ns/:id/raw` endpoint feeds factory flow |
| Agent sidebar section missing | AGENT PODS nav section pinned bottom of sidebar |

---

## 3. Architecture Overview

### 3.1 System Components

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Dashboard Frontend | React 18, Redux Toolkit, PatternFly 6 | UI for devfile management and AI agent interaction |
| Dashboard Backend | Node.js, Fastify | REST API: devfile CRUD, agent lifecycle, schema serving, registry reads |
| Devfile Storage | Kubernetes ConfigMap (`devfile-creator-storage`) | Per-user devfile persistence |
| Agent Pod | Kubernetes Pod + ClusterIP Service | Runs ttyd + Claude Code; no DevWorkspace overhead |
| Agent Image | scratch + ttyd + Claude Code + kubectl | Minimal image (~50 MB); [olexii4/che-dashboard-agent](https://github.com/olexii4/che-dashboard-agent) |
| Terminal Transport | Dashboard WebSocket proxy (`/agent/t/ws`) | Browser talks to dashboard; dashboard proxies to ttyd in-cluster |
| Plugin System | `packages/dashboard-plugins` SDK + GitHub Releases ZIPs | Feature code in [olexii4/che-dashboard-plugins](https://github.com/olexii4/che-dashboard-plugins) |

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
│                                                       └── PTY ──► claude
```

### 3.3 Component Interaction Diagram

```
┌──────────────────────┐     ┌──────────────────────────────────────────┐
│  DevfilesList        │     │  DevfileDetails (pages/)                  │
│  (pages/)            │     │                                            │
│                      │     │  ┌─────────────────┬──────────────────┐  │
│  - Filter/Sort       │ ──► │  │  YAML Editor    │   Agent Panel    │  │
│  - Create/Delete     │     │  │  (CodeMirror 6) │   (ttyd iframe)  │  │
│  - Navigate to detail│     │  │  + schema lint  │   + pod events   │  │
└──────────┬───────────┘     │  └─────────────────┴──────────────────┘  │
           │                 └──────────────────────────────────────────-┘
           ▼                               │                │
┌──────────────────────┐                  ▼                ▼
│  DevfileDetails      │         ┌──────────────┐  ┌──────────────┐
│  Container           │         │  LocalDevfiles│  │ AiAgentRegistry│
│  - Redux connect     │         │  Redux Store  │  │ Redux Store   │
│  - Agent lifecycle   │         └──────┬───────┘  └──────┬───────┘
│  - Heartbeat / poll  │                │                  │
└──────────────────────┘                ▼                  ▼
                               ┌─────────────────────────────┐
                               │   Dashboard Backend API      │
                               │   /dashboard/api/            │
                               └───────┬─────────────────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    ▼                  ▼                   ▼
             ┌──────────┐     ┌──────────────┐    ┌───────────┐
             │ ConfigMap │     │  Pod + Svc   │    │ ConfigMap │
             │(devfiles) │     │ (agent pod)  │    │(ai-registry)│
             └──────────┘     └──────────────┘    └───────────┘
```

### 3.4 Agent Pod vs PoC DevWorkspace

| Aspect | PoC (DevWorkspace) | v1.0 (Pod) |
|--------|-------------------|------------|
| Startup time | 45–60 s | 5–10 s |
| Routing overhead | DevWorkspace controller + Route | None; ClusterIP proxied by dashboard |
| Wildcard DNS | Required | Not required |
| Max per user | 1 (name conflict) | 3 (enforced by backend) |
| TTL | Manual page-leave stop | 20 min heartbeat; background cleanup job |
| Image | UBI10 + wetty + Node.js | scratch + ttyd binary only |

### 3.5 Plugin Architecture

Feature code is not committed to `eclipse-che/che-dashboard`. It ships as two independently versioned plugins fetched at build time:

```
olexii4/che-dashboard-plugins
├── ai-selector/          → ai-selector.zip         (GitHub Release)
└── dashboard-ai-agent/   → dashboard-ai-agent.zip  (GitHub Release)
```

```bash
# Fetched by scripts/fetch-plugins.sh at build time
curl -L https://github.com/olexii4/che-dashboard-plugins/releases/download/latest/ai-selector.zip
curl -L https://github.com/olexii4/che-dashboard-plugins/releases/download/latest/dashboard-ai-agent.zip
```

---

## 4. Implementation Details

### 4.1 Backend: Devfile Storage API

Devfiles are stored in a Kubernetes ConfigMap named `devfile-creator-storage` in the user's namespace. Each entry uses a UUID key and raw YAML value. Modification timestamps are stored as ConfigMap annotations.

#### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/dashboard/api/devfiles/namespace/:ns` | List all devfiles with parsed metadata |
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

Agents run as plain Kubernetes Pods. The backend manages their lifecycle and proxies the ttyd WebSocket.

#### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/dashboard/api/namespace/:ns/agent` | Create agent Pod + ClusterIP Service |
| `GET` | `/dashboard/api/namespace/:ns/agent/:agentId` | Agent pod status |
| `DELETE` | `/dashboard/api/namespace/:ns/agent/:agentId` | Stop and delete agent pod |
| `POST` | `/dashboard/api/namespace/:ns/agent/:agentId/heartbeat` | Update `last-heartbeat` annotation |
| `GET` | `/dashboard/api/namespace/:ns/agent-terminal-url` | Resolve in-cluster ttyd URL |
| `WS` | `/dashboard/api/namespace/:ns/agent/t/ws` | WebSocket proxy to ttyd |

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
    che.eclipse.org/last-heartbeat: "<ISO-8601>"
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
      volumeMounts:
        - name: che-user-token
          mountPath: /var/run/secrets/che/token
          readOnly: true
        - name: tmp-dir
          mountPath: /tmp
  volumes:
    - name: che-user-token
      secret:
        secretName: agent-<id>-token
    - name: tmp-dir
      emptyDir: {}
```

#### Agent Lifecycle Management

- Pod created on-demand when user clicks **Start Agent**
- Backend checks for terminating pods with the same name and force-deletes them (`gracePeriodSeconds: 0`) before creating a new one
- Frontend polls `/agent/:id` every 3 s while pod is PENDING
- Terminal URL polled every 3 s once pod is Running+ready
- Heartbeat sent every **30 seconds**; backend stamps `che.eclipse.org/last-heartbeat`
- Pods idle for **20 minutes** garbage-collected by a 5-minute background job
- Max **3 concurrent agent pods** per user enforced at creation time
- Pod deleted with `keepalive: true` on page leave (`beforeunload` + `componentWillUnmount`)

### 4.3 Backend: AI Registries

#### AI Agent Registry

Reads agent definitions from a ConfigMap labeled `app.kubernetes.io/component=ai-agent-registry` in the Che namespace:

```
GET /dashboard/api/ai-agent-registry
```

#### AI Tool Registry (ai-selector plugin)

```
GET /dashboard/api/ai-config
GET /dashboard/api/ai-registry
GET/POST/DELETE /dashboard/api/namespace/:ns/ai-provider-key
```

### 4.4 Frontend: Devfile Creator List Page

Route: `/devfiles`

#### Key Features

- **"Devfiles (N)"** sidebar navigation entry with live count from Redux store
- Filterable by name and description via `SearchInput`
- Sortable columns (Name, Description, Last Modified, Projects)
- Create modal: name + description fields; creates devfile, navigates to editor
- Row actions: open editor, download as `.devfile.yaml`, delete with confirmation
- Bulk delete: select multiple rows, delete all
- Empty state prompting users to create their first devfile

#### Route Configuration

```ts
// Routes/index.tsx
export enum ROUTE {
  DEVFILES = '/devfiles',
  DEVFILE_DETAILS = '/devfile/:namespace/:devfileId',
}
```

### 4.5 Frontend: Devfile Details Page

Route: `/devfile/:namespace/:devfileId`

The page uses a PatternFly `Drawer` layout. The right panel dynamically resizes: 500 px when the agent is not connected, 50% width when the terminal is active.

#### Left Panel: YAML Editor (CodeMirror 6)

- `DevfileEditor` component with `@codemirror/lang-yaml` syntax highlighting
- **Schema linting**: `yamlSchemaLinter` extension validates with Ajv against the Devfile JSON schema; errors shown as CodeMirror diagnostics with line and column
- **Autocompletion**: `yamlSchemaCompletion` extension provides JSON Schema-driven suggestions
- `DevfileEditorTools` toolbar: Save, Refresh, Expand to full screen
- **Real-time sync**: WebSocket `CONFIGMAP` channel updates editor when the agent writes to the ConfigMap — no manual copy/paste required

#### Right Panel: AI Agent

- Empty state with **Start Agent** button when no pod is running
- `AgentPodEvents` streaming Kubernetes pod events during PENDING phase
- `AgentTerminal` component when pod is Running + ready:
  - iframe embedding ttyd at the dashboard WebSocket proxy endpoint
  - Bi-directional dark/light theme sync injected via `postMessage`
- `TerminalTools` toolbar: Clear, Copy, Toggle theme
- **Stop Agent** button deletes the pod and clears terminal URL

#### Header Actions

- Breadcrumb navigation back to Devfiles list
- **Create Workspace** button (navigates to factory flow with raw devfile URL)
- Kebab dropdown: Download as YAML, Delete with confirmation

### 4.6 Dashboard Agent Container

The dashboard-agent image is a multi-stage build producing a **scratch-based image** with no OS base layer.

#### Image Architecture

| Layer | Base | Contents |
|-------|------|----------|
| Build stage | `ubuntu:22.04` | Downloads Claude Code Bun binary, ttyd static binary, kubectl |
| Runtime stage | `scratch` | Bash + shared libs, Claude Code, ttyd, kubectl, wrapper scripts |

#### Key Design Decisions vs PoC

- **ttyd replaces wetty** — ttyd is a single static binary (~5 MB) requiring no Node.js, npm, or ES module resolution; eliminates the wetty ESM symlink issue entirely
- **scratch base** — no OS package manager, no package vulnerabilities, image under 50 MB
- **Bun standalone binary for Claude Code** — self-contained, no Node.js runtime needed
- **Dashboard WebSocket proxy** — browser connects to `/dashboard/api/namespace/:ns/agent/t/ws`; dashboard proxies to the ClusterIP Service; no cross-origin or OpenShift Route required
- **OpenShift arbitrary UID support** — wrapper detects non-writable `$HOME` and redirects to `/tmp/claude-home`
- **kubectl bundled** — agent can read pod events and patch DevWorkspaces using the user token mounted from a Secret

#### Entrypoint Flow

```
entrypoint.sh:
  1. Detect if $HOME is writable (OpenShift arbitrary UID check)
  2. If not: HOME=/tmp/claude-home; mkdir -p ~/.claude ~/.local/bin
  3. Export PATH including ~/.local/bin
  4. Start ttyd on port 8080:
       ttyd --writable bash -c "claude --dangerously-skip-permissions <initCommand>"
```

#### CLAUDE.md Agent Skills

The agent image includes a `skills/CLAUDE.md` system-prompt file injected via `--append-system-prompt` that provides:

- **Devfile schema knowledge**: schemaVersion 2.0–2.3, components, commands, events, projects
- **Critical rules**: every non-UDI container must have `args: [tail, -f, /dev/null]`; banned tools (`python3`, `awk`, `node`) — use `jq`, `sed`, `curl`
- **ConfigMap API access**: how to read/write the `devfile-creator-storage` ConfigMap using the mounted user token and `kubectl`
- **DevWorkspace troubleshooting**: how to read pod events, inspect logs, and patch DevWorkspace specs

### 4.7 Terminal Integration: ttyd via WebSocket Proxy

The terminal is rendered using **ttyd** (Tiny TTY Daemon), a single-binary web terminal that serves xterm.js as a standalone page over WebSocket.

#### Why ttyd Instead of Wetty (PoC)

| Concern | Wetty (PoC) | ttyd (v1.0) |
|---------|-------------|-------------|
| Image size | ~200 MB (Node.js + npm) | ~50 MB (binary only) |
| ESM resolution | Failed with symlinks | Not applicable (static binary) |
| OpenShift Route | Required (public endpoint) | Not required (ClusterIP + proxy) |
| Cross-origin | Required CORS config | Transparent (same-origin proxy) |

#### Terminal URL Discovery

```
Frontend polls: GET /dashboard/api/namespace/:ns/agent-terminal-url
  → Backend: resolve ClusterIP of agent-<id>-svc Service
  → Return: { url: "http://agent-<id>-svc.<ns>.svc:8080" }

Frontend: connect iframe to dashboard WS proxy
  → Browser WebSocket: wss://<dashboard>/dashboard/api/namespace/:ns/agent/t/ws
  → Dashboard: TCP proxy to http://<clusterip>:8080 (ttyd WS endpoint)
```

### 4.8 Workspace Loader — DevWorkspace Tab

The **DevWorkspace** tab appears on the workspace loading page (`/ide/:ns/:name`) when the AI Agent Registry has at least one agent configured.

- Full DevWorkspace YAML editor backed by the DevWorkspace CRD JSON schema
- Same `LoaderAgentPanel` component: editor left, agent panel right
- Agent can read pod events, inspect logs, and patch the DevWorkspace spec
- Workspace `TimeLimit` countdown **suspended** while agent is running
- Workspace start/stop dropdown added to the loader page header

---

## 5. State Management

### 5.1 `LocalDevfiles` Redux Store

```ts
interface LocalDevfilesState {
  devfiles: LocalDevfile[];
  isLoading: boolean;
  error: string | undefined;
  agentTerminalUrl: string | undefined;
  agentPodStatuses: AgentPodStatus[];
  configMapResourceVersion: string;
}

interface LocalDevfile {
  id: string;            // UUID — ConfigMap entry key
  name: string;          // from metadata.name / generateName
  description: string;   // from metadata.description
  content: string;       // raw YAML
  projectNames: string[];// parsed project names
  lastModified: string;  // ISO timestamp from ConfigMap annotation
}

interface AgentPodStatus {
  agentId: string;
  name: string;          // pod name
  phase: AgentPodPhase;  // Pending | Running | Succeeded | Failed | Unknown
  ready: boolean;        // containerStatuses[].ready
  serviceUrl: string | undefined; // in-cluster ClusterIP URL when ready
}
```

### 5.2 Actions

| Action | Description |
|--------|-------------|
| `requestDevfiles()` | Fetch all devfiles from backend; subscribe to CONFIGMAP channel |
| `createDevfile(name, desc, content)` | Create devfile; return id |
| `saveDevfile(id, content)` | PUT devfile content |
| `deleteDevfile(id)` | DELETE devfile entry |
| `startAgent(agent, instanceId)` | POST create agent pod; dispatch PENDING status |
| `stopAgent(agentId)` | DELETE agent pod; clear terminal URL |
| `sendHeartbeat(agentId)` | POST heartbeat to extend TTL |
| `fetchAgentStatus(agentId)` | GET pod status; poll while PENDING |
| `fetchAgentTerminalUrl(agentId, port)` | GET terminal URL; poll while Running |
| `subscribeToAgentPodChanges()` | Add listener on WebSocket POD channel |
| `subscribeToConfigMapChanges()` | Subscribe to CONFIGMAP WebSocket channel |
| `clearAgentTerminalUrl` | Reset terminal URL (lifecycle cleanup) |

### 5.3 `AiAgentRegistry` Redux Store

```ts
interface AiAgentRegistryState {
  agents: AiAgentDefinition[];
  defaultAgentId: string;
  isLoading: boolean;
  error: string | undefined;
}
```

`agentEnabled = agents.length > 0` gates the DevWorkspace tab on the Loader page and the AI Agent panel on Devfile Details.

---

## 6. User Flow

### 6.1 Creating a Devfile with AI Assistance

| Step | User Action | System Response |
|------|-------------|----------------|
| 1 | Click **Devfiles** in sidebar | List page loads; devfile count badge shown |
| 2 | Click **Create Devfile**; enter name | Devfile created with UUID; navigate to editor |
| 3 | View split layout | Left: CodeMirror editor with default template. Right: Start Agent empty state |
| 4 | Click **Start Agent** | Pod created; pod events stream in agent panel |
| 5 | Wait for agent startup | Pod → Running + ready; terminal URL fetched |
| 6 | ttyd terminal appears | iframe loads; Claude Code auto-launches with system prompt |
| 7 | Interact with Claude | Claude generates devfile YAML; writes to ConfigMap |
| 8 | Editor auto-updates | WebSocket CONFIGMAP event triggers Redux update; CodeMirror reflects new content |
| 9 | Click **Create Workspace** | Factory flow opens with raw devfile URL pre-filled |
| 10 | Navigate away | DELETE pod (keepalive); terminal URL cleared; WebSocket closed |

### 6.2 Agent Lifecycle States

```
                        ┌─────────────┐
                        │  No Agent   │
                        │ [Start Agent│
                        │   button]   │
                        └──────┬──────┘
                               │ POST /agent
                               ▼
                   ┌───────────────────────┐
                   │  PENDING              │
                   │  AgentPodEvents       │
                   │  [ProgressIndicator]  │
                   └──────────┬────────────┘
                              │ pod Running + ready
                              ▼
                   ┌───────────────────────┐
                   │  RUNNING              │
                   │  ttyd iframe          │
                   │  claude CLI active    │
                   │  heartbeat every 30s  │
                   └──────────┬────────────┘
                              │ navigate away / Stop
                              ▼
                   ┌───────────────────────┐
                   │  clearAgentTerminalUrl│
                   │  DELETE /agent/:id    │
                   └───────────────────────┘
```

### 6.3 Workspace Troubleshooting Flow

| Step | User Action | System Response |
|------|-------------|----------------|
| 1 | Workspace fails to start | Loader Progress tab shows error |
| 2 | Click **DevWorkspace** tab | DevWorkspace YAML editor + AI Agent panel shown |
| 3 | Click **Start Agent** | Agent pod starts in user namespace |
| 4 | Claude diagnoses failure | Reads pod events; identifies issue (e.g. missing `args`) |
| 5 | Claude patches DevWorkspace | Editor reflects fix via DevWorkspace watch |
| 6 | Click **Save** | DevWorkspace spec updated via Kubernetes API |
| 7 | Restart workspace | Workspace starts successfully |

---

## 7. File Structure

### 7.1 Dashboard Core (eclipse-che/che-dashboard, `plugins` branch)

```
packages/
  common/src/
    constants/terminalThemes.ts          # TerminalTheme, TERMINAL_THEMES
    dto/api/index.ts                     # AiAgentDefinition, IAiRegistry, …
    dto/api/webSocket.ts                 # Channel.CONFIGMAP, ConfigMapMessage
  dashboard-plugins/                     # NEW — Plugin SDK
    src/
      types.ts                           # FrontendPlugin, PluginSlots, …
      registry.ts                        # registerFrontendPlugin, getPlugin*
      frontend/PluginSlot.tsx            # React slot component + getters
  dashboard-backend/src/
    app.ts                               # Route registrations
    constants/terminal-themes.ts         # AGENT_TERMINAL_THEMES (backend)
    devfileSchemas/                      # 2.0.0 – 2.3.0 JSON schemas
    routes/api/
      agents.ts                          # Pod CRUD + WebSocket proxy
      aiAgentRegistry.ts                 # Read agent registry ConfigMap
      aiConfig.ts                        # Cluster AI config
      aiRegistry.ts                      # AI tool registry
      devfiles.ts                        # Devfile CRUD
      devfileSchema.ts                   # Static schema serving
      helpers/agentPod.ts                # Pod create/delete/cleanup logic
      helpers/terminal/index.ts          # WebSocket proxy to ttyd
    devworkspaceClient/services/helpers/
      patchOptions.ts                    # JSON_MERGE_PATCH_OPTIONS added
  dashboard-frontend/src/
    Routes/index.tsx                     # /devfiles, /devfile/:ns/:devfileId
    Layout/Navigation/
      AgentList.tsx                      # AGENT PODS sidebar section
    plugin-registry/index.ts            # NEW — runtime plugin registry
    plugins/                             # Auto-generated; ignored by git
      index.ts                           # Generated by prepare-plugins.sh
    store/rootReducer.ts                 # New slices: aiAgentRegistry, aiConfig,
                                         # devfileSchema, devWorkspaceSchema,
                                         # localDevfiles
    services/bootstrap/index.ts          # subscribeToAgentPodChanges()
    services/backend-client/websocketClient/
      index.ts                           # removeChannelMessageListener()
      subscriptionsManager.ts            # Channel.CONFIGMAP added
    components/
      Header/index.tsx                   # actions prop added
      WorkspaceProgress/StartingSteps/
        OpenWorkspace/index.tsx          # TimeLimit gated by !hasRunningAgent
        StartWorkspace/index.tsx         # same
    pages/Loader/
      index.tsx                          # DevWorkspace tab + LoaderAgentPanel
    containers/Loader/index.tsx          # Agent lifecycle management
scripts/
  fetch-plugins.sh                       # NEW — download ZIPs from GitHub Releases
  prepare-plugins.sh                     # NEW — symlink + generate src/plugins/index.ts
run/
  local-patch.sh                         # NEW — fast CRC deploy (arm64, SSH load)
build/dockerfiles/
  Dockerfile                             # fetch-plugins.sh added before build
```

### 7.2 Plugin Source (olexii4/che-dashboard-plugins)

```
ai-selector/
  plugin.json                            # enabled: true
  frontend/
    plugin.tsx                           # registers userPreferencesTab slot
    components/AiSelector/              # provider gallery with cards
    components/AiToolIcon/
    pages/UserPreferences/AiProviderKeys/
    pages/WorkspaceDetails/OverviewTab/AiTool/
    store/AiConfig/
    services/backend-client/aiConfigApi.ts
  backend/
    routes/aiConfig.ts
    routes/aiRegistry.ts
    services/aiProviderKeyApi.ts
    services/aiRegistryApi.ts

dashboard-ai-agent/
  plugin.json                            # enabled: true
  frontend/
    plugin.tsx                           # registers navigationItems slot
    components/
      AgentTerminal/                    # ttyd iframe + theme sync
      AgentPodEvents/                   # Kubernetes event stream
      DevfileEditor/                    # CodeMirror 6 with schema validation
      DevfileEditorTools/               # Save/refresh/expand toolbar
      DevfileViewer/                    # Read-only CodeMirror viewer
      LoaderAgentPanel/                 # Split layout: editor + agent
      TerminalTools/                    # Clear/copy/theme toolbar
    containers/
      DevfileDetails/                   # Redux-connected with full lifecycle
      DevfilesList/
    pages/
      DevfileDetails/                   # Split-panel page
      DevfilesList/                     # List + create modal
    navigation/AgentList.tsx            # AGENT PODS sidebar component
    store/
      AiAgentRegistry/
      DevfileSchema/
      DevWorkspaceSchema/
      LocalDevfiles/
  backend/
    routes/agents.ts
    routes/aiAgentRegistry.ts
    routes/devfiles.ts
    routes/devfileSchema.ts
    helpers/agentPod.ts
    helpers/terminal/index.ts
```

### 7.3 Agent Container (olexii4/che-dashboard-agent)

```
dockerfiles/Dockerfile                  # Multi-stage scratch image
scripts/collect-rootfs.sh              # Collects binaries + shared libs
settings/settings.json                 # Claude Code model (claude-sonnet-4-5)
settings/claude.json                   # Skip onboarding wizard
skills/CLAUDE.md                        # System prompt: devfile rules + K8s access
```

---

## 8. Security Considerations

| Concern | Mitigation |
|---------|-----------|
| Devfile data isolation | Stored in user's own namespace; Kubernetes RBAC enforced |
| Agent pod isolation | User token mounted as Secret; pod has no cluster-wide access |
| API key management | Stored as Kubernetes Secrets with `controller.devfile.io/mount-as: env`; never sent to dashboard backend |
| Terminal access | Dashboard proxies the ttyd WebSocket; browser never reaches agent directly; no Route or cross-origin |
| OpenShift arbitrary UIDs | Container runs non-root; `HOME` redirected to `/tmp/claude-home` when not writable |
| Agent cleanup on navigation | `DELETE /agent/:id` with `keepalive: true` on page leave (`beforeunload`) |
| TTL enforcement | 20-min heartbeat TTL; 5-min background cleanup job; max 3 pods per user |
| ConfigMap patch security | `JSON_MERGE_PATCH_OPTIONS` (`application/merge-patch+json`) ensures correct Content-Type |

---

## 9. Technical Challenges and Solutions

### 9.1 Real-Time Editor Sync

**Problem**: PoC required the user to manually copy AI-generated YAML from the terminal into the editor.

**Solution**: Claude Code writes devfile content directly to the Kubernetes ConfigMap. A new `Channel.CONFIGMAP` WebSocket channel was added to `@eclipse-che/common`. The backend subscribes to the ConfigMap via `watch` and broadcasts changes. The frontend's `subscribeToConfigMapChanges` Redux action adds a listener on this channel; each update re-renders the CodeMirror editor with the new content.

### 9.2 Terminal Transport: WebSocket Proxy

**Problem**: PoC served the wetty terminal via a public OpenShift Route, requiring wildcard DNS and cross-origin configuration.

**Solution**: The dashboard backend acts as a WebSocket proxy (`/dashboard/api/namespace/:ns/agent/t/ws`). The browser connects to the dashboard (same origin); the dashboard maintains a TCP connection to the ttyd process inside the agent pod via its ClusterIP Service. No public Route or DNS configuration is needed.

### 9.3 Module Identity in Webpack Bundles

**Problem**: `@eclipse-che/dashboard-plugins` (npm package) and `@/plugin-registry` (local module) were two separate webpack module instances, each with their own `frontendPlugins[]` array. Plugins registered in one were invisible to `getPlugin*` calls in the other, causing "Devfiles" to disappear from navigation.

**Solution**: All `getPlugin*` getter functions were moved into `packages/dashboard-frontend/src/plugin-registry/index.ts` — the same module that owns the `frontendPlugins` array. All components import from `@/plugin-registry`, never from `@eclipse-che/dashboard-plugins` for runtime state.

### 9.4 CodeMirror in Hidden PatternFly Tabs

**Problem**: PatternFly hides inactive tab content with `display: none`. CodeMirror initializes with 0×0 dimensions when mounted in a hidden container and remains invisible after the tab is activated.

**Solution**: The Loader page uses `React.createElement(Tabs, props, ...tabs)` to pass plugin tabs as direct children of `Tabs` — not inside a `React.Fragment` wrapper — so PatternFly's tab system renders each Tab correctly. Plugin tabs use a `<pre>` element for YAML display, which is not affected by CodeMirror initialization timing.

### 9.5 Agent Pod Name Collision on Restart

**Problem**: After a user navigates away and returns, the pod from the previous session may still be in Terminating state. Creating a new pod with the same name fails with HTTP 409 "object is being deleted".

**Solution**: Before creating a new pod, the backend checks for any existing pod (including Terminating) and force-deletes it (`gracePeriodSeconds: 0`). This clears the name within seconds, allowing the new pod to be created immediately.

### 9.6 WebSocket LOGS Retry Loop on 400

**Problem**: During workspace startup, the LOGS WebSocket channel returns HTTP 400 (container not ready for log streaming). The client resubscribed immediately, generating thousands of console error messages.

**Solution**: The LOGS error handler now returns early when `status.code === 400` without resubscribing. A 400 is a definitive Kubernetes API rejection, not a transient error to retry.

### 9.7 `agentInstanceId` Race Condition

**Problem**: `agentInstanceId` was computed in `componentDidMount` when `defaultAgent` was undefined (AI Agent Registry not yet fetched). The ID was never set, so clicking Start Agent had no effect.

**Solution**: `componentDidUpdate` now sets `agentInstanceId` on first render where `defaultAgent` becomes available (after registry fetch completes).

---

## 10. Technology Stack

| Category | Technology | Details |
|----------|-----------|---------|
| Frontend Framework | React 18 + TypeScript | |
| State Management | Redux Toolkit | `createAction`/`createReducer` pattern |
| UI Library | PatternFly 6 | PF6 components |
| YAML Editor | CodeMirror 6 | `@codemirror/lang-yaml`, custom linter + completer |
| Schema Validation | Ajv | JSON Schema → CodeMirror diagnostics |
| Backend Framework | Fastify | Node.js, monorepo |
| Container Runtime | Kubernetes | Pods + ClusterIP Services |
| Agent Base Image | scratch | Binary only; ~50 MB total |
| Web Terminal | ttyd v1.7.7 | Single static binary, xterm.js UI |
| AI CLI | Claude Code | Bun standalone binary (no Node.js/npm) |
| Build Tool | Webpack 5 / Yarn 4 | Monorepo workspaces |
| Plugin Distribution | GitHub Releases (ZIP) | `scripts/fetch-plugins.sh` |
| Local Deploy | `yarn local:patch` | arm64 Docker build → SSH load into CRC |

---

## 11. Known Limitations and Future Work

| Limitation | Notes |
|-----------|-------|
| Single agent type displayed | AI Agent Registry supports multiple agents; multi-agent selector UI not yet implemented |
| DevWorkspace schema not auto-updated | Schema fetched once at page load; does not update when CRD changes in cluster |
| Periodic cleanup silent failures | Cleanup job logs at WARN level (filtered by default log level ERROR); failures not surfaced in UI |
| Agent terminal reconnect after dashboard restart | Agent pod survives dashboard pod restart; terminal URL must be re-fetched on next heartbeat cycle |
| No integration tests for devfile CRUD | Manual testing only; unit tests cover Redux store and API client |

---

## 12. How to Test

### 12.1 Prerequisites

- CRC (OpenShift Local) or OpenShift cluster with Eclipse Che installed
- Dashboard image built from the `plugins` branch
- `ANTHROPIC_API_KEY` in the user namespace as a Kubernetes Secret with `controller.devfile.io/mount-as: env` annotation

### 12.2 AI Agent Registry ConfigMap

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

### 12.3 Testing Steps

| # | Step | Expected Result |
|---|------|----------------|
| 1 | Click **Devfiles** in sidebar | List page loads; empty state shown |
| 2 | Click **Create Devfile**; enter name | New devfile created; navigated to editor |
| 3 | View CodeMirror editor | Schema errors shown inline; autocompletion active on Ctrl+Space |
| 4 | Click **Save** | Content persisted to ConfigMap; Save button re-disables |
| 5 | Click **Start Agent** | Pod events stream in agent panel; PENDING status |
| 6 | Wait for agent | ttyd terminal appears; Claude Code auto-launches |
| 7 | Prompt: "add a Node.js project" | Claude responds; editor updates in real time |
| 8 | Click **Create Workspace** | Factory flow opens with raw devfile URL |
| 9 | Sidebar shows **AGENT PODS** | Running agent shown with status icon |
| 10 | Navigate away from devfile | Agent pod deleted; nav section clears |
| 11 | Start a workspace with missing `args` | Workspace fails; Loader Progress shows error |
| 12 | Open **DevWorkspace** tab | Editor + agent panel shown |
| 13 | Click **Start Agent** | Agent diagnoses failure; editor reflects fix |
| 14 | Save and restart workspace | Workspace starts successfully |

---

## 13. Conclusion

The production implementation of the Devfile Creator with AI Agent delivers a complete, plugin-based extension to the Eclipse Che Dashboard. Key technical validations achieved over the PoC:

- **Kubernetes ConfigMap** remains the correct storage backend for user devfiles — simple, RBAC-controlled, WebSocket-watchable
- **Plain Kubernetes Pods** as agent hosts are superior to headless DevWorkspaces: faster startup, no wildcard DNS, no DevWorkspace controller overhead
- **ttyd + scratch image** produces a minimal agent container with full terminal capability and no OS package surface
- **Real-time ConfigMap sync** via a dedicated WebSocket channel eliminates manual copy/paste, making AI-assisted authoring seamless
- **Plugin ZIP distribution** via GitHub Releases decouples feature versioning from the dashboard core release cycle — plugins can ship independently and the dashboard fetches them at build time
- **`packages/dashboard-plugins` SDK** establishes a stable, upstream-contributable API surface for future dashboard extensions

The implementation is ready for upstream contribution following the phased approach: Plugin SDK → core integration hooks → `@eclipse-che/common` additions → AI Selector PR → Devfile Creator PR.
