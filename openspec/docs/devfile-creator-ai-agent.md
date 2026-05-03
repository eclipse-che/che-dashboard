# Devfile Creator with AI Agent

## Target Issue

**[eclipse-che/che#23796](https://github.com/eclipse-che/che/issues/23796)**
_[UD] Add AI coding tool selection and API key management for DevWorkspaces_

Eclipse Che Dashboard has no built-in way for users to select an AI coding tool
or manage API keys for AI providers. Users must manually configure DevWorkspace
specs and create Kubernetes Secrets, which is error-prone and not discoverable.

This issue drives two workstreams implemented in this repository:

1. **AI Selector** — let users pick an AI coding tool (e.g. Claude Code, Gemini CLI)
   on workspace creation; inject the tool automatically into the DevWorkspace spec.
2. **Devfile Creator with AI Agent** — provide a first-class UI for authoring
   devfiles, backed by an AI agent that generates and refines devfile content
   interactively, and that can troubleshoot failing workspaces.

---

## PR Description

**[eclipse-che/che-dashboard#1515](https://github.com/eclipse-che/che-dashboard/pull/1515)**
_[poc] feat: Devfile Creator and Workspace Loader with AI Agent_

### What does this PR do?

Adds a **Devfile Creator** feature to the Eclipse Che Dashboard and extends the
**Workspace Loader** with a DevWorkspace editor tab and AI agent integration.

#### Devfile Creator — `/devfiles`

- New **"Devfiles"** navigation entry in the sidebar with a badge showing the
  count of saved devfiles.
- **List view**: create, delete, download devfiles. Each devfile is stored as an
  entry in a per-user Kubernetes ConfigMap (`devfile-creator-storage`).
- **Detail / editor view** (`/devfile/:namespace/:devfileId`):
  - CodeMirror 6 YAML editor with inline devfile schema validation (Ajv → diagnostics)
    and JSON Schema-driven autocompletion.
  - **AI Agent panel** — start/stop a Claude Code agent pod; embedded ttyd
    terminal (iframe) connects to the agent for interactive devfile authoring.
  - Real-time editor sync via WebSocket ConfigMap watch: agent edits to the
    ConfigMap appear in the editor as the agent works.
  - **Create Workspace** button pre-fills the factory URL with the raw devfile
    endpoint so the workspace can be launched directly from the editor.

#### Workspace Loader — DevWorkspace Tab

- New **"DevWorkspace"** tab added to the workspace loading page.
- Full DevWorkspace YAML editor backed by the DevWorkspace CRD JSON schema
  (separate from devfile schema) for validation and autocompletion.
- Same AI agent panel available for **troubleshooting failing workspaces**:
  the agent can read pod events, inspect container logs, and patch the
  DevWorkspace spec to fix startup errors.

#### Plugin Architecture

Both features ship as independently versioned plugins in
[olexii4/che-dashboard-plugins](https://github.com/olexii4/che-dashboard-plugins):

| Plugin | Description |
|--------|-------------|
| `ai-selector` | AI tool selection widget; User Preferences API key management |
| `dashboard-ai-agent` | Devfile Creator UI, AI agent lifecycle, Loader DevWorkspace tab |

Plugins are fetched at build time from GitHub Releases:

```bash
curl -L https://github.com/olexii4/che-dashboard-plugins/releases/download/latest/ai-selector.zip \
  -o ai-selector.zip
curl -L https://github.com/olexii4/che-dashboard-plugins/releases/download/latest/dashboard-ai-agent.zip \
  -o dashboard-ai-agent.zip
```

#### Backend API additions

| Route | Description |
|-------|-------------|
| `GET /api/devfile?version=` | Devfile JSON schemas (2.0.0 – 2.3.0) |
| `GET /api/devworkspace-schema` | DevWorkspace CRD JSON schema |
| `GET/POST/PUT/DELETE /api/devfiles/namespace/:ns` | CRUD — devfiles stored as ConfigMap entries |
| `GET /api/devfiles/namespace/:ns/:id/raw` | Raw YAML (for factory URL) |
| `POST /api/namespace/:ns/agent` | Create agent pod |
| `DELETE /api/namespace/:ns/agent/:agentId` | Stop agent pod |
| `GET /api/namespace/:ns/agent/:agentId` | Agent pod status |
| `POST /api/namespace/:ns/agent/:agentId/heartbeat` | Extend TTL (20 min) |
| `GET /api/namespace/:ns/agent-terminal-url` | Discover ttyd endpoint |
| `GET /api/ai-agent-registry` | Read agent definitions from labeled ConfigMap |
| `GET /api/ai-config` | Cluster-level AI tool configuration |
| `GET /api/ai-registry` | AI tool registry from labeled ConfigMaps |
| `GET/POST/DELETE /api/namespace/:ns/ai-provider-key` | Per-user AI provider API keys |

#### Agent lifecycle

- Agent pods run [olexii4/che-dashboard-agent](https://github.com/olexii4/che-dashboard-agent)
  (Claude Code + ttyd in a minimal scratch image).
- Frontend sends a heartbeat every **30 seconds**; backend updates the
  `che.eclipse.org/last-heartbeat` annotation. Pods with no heartbeat for
  **20 minutes** are cleaned up by a server-side periodic job (every 5 min).
- Maximum **3 concurrent agent pods** per user.
- On page leave, the agent pod is stopped (DELETE with `keepalive: true`).

### How to set up the AI Agent Registry

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
          "initCommand": "claude --dangerously-skip-permissions"
        }
      ],
      "defaultAgentId": "dashboard-agent"
    }
EOF
```

### Manual testing

1. Deploy Eclipse Che with the patched dashboard image.
2. Apply the AI Agent Registry ConfigMap above.
3. Set `ANTHROPIC_API_KEY` in the user namespace (mounted as env via secret annotation).
4. Navigate to **Devfiles** in the sidebar — create a new devfile.
5. Click **Start Agent** — wait for the ttyd terminal to connect.
6. Ask the agent to generate a devfile (e.g. for a Node.js + MySQL project).
7. Observe real-time editor updates as the agent writes to the ConfigMap.
8. Click **Create Workspace** — verify the factory flow uses the generated devfile.
9. To test troubleshooting: start a workspace, break it (remove `args: [tail, -f, /dev/null]`
   from a non-UDI container), navigate to the Loader **DevWorkspace** tab, start the agent,
   and observe it diagnose and fix the failure.

### Related

- Issue: [eclipse-che/che#23796](https://github.com/eclipse-che/che/issues/23796)
- PR (AI Selector): [eclipse-che/che-dashboard#1505](https://github.com/eclipse-che/che-dashboard/pull/1505)
- PR (Devfile Creator + AI Agent): [eclipse-che/che-dashboard#1515](https://github.com/eclipse-che/che-dashboard/pull/1515)
- Agent image: [olexii4/che-dashboard-agent](https://github.com/olexii4/che-dashboard-agent)
- Plugin source: [olexii4/che-dashboard-plugins](https://github.com/olexii4/che-dashboard-plugins)
