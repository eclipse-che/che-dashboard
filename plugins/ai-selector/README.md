# AI Selector Widget Plugin

Adds an AI provider selection widget to the Eclipse Che Dashboard. Users can choose AI coding tools (Claude Code, Gemini CLI, OpenCode, etc.) to inject into their workspaces as sidecar containers.

## Features

- **Workspace creation**: Accordion selector on the "Create Workspace" page to pick AI providers
- **Workspace details**: Form group in workspace Overview tab to view/change the injected AI tool
- **Workspaces list**: Column showing which AI tool is injected into each workspace
- **User preferences**: Tab for managing API keys per AI provider
- **Factory URL support**: `?ai-provider=anthropic/claude` parameter for automated workspace creation
- **Workspace lifecycle hooks**: Injects init containers and environment variables at creation; sanitizes stale tools at start

## How It Works

1. An administrator deploys an **AI Tool Registry** ConfigMap (see below) to the Che namespace
2. The dashboard backend reads the ConfigMap and serves it at `GET /dashboard/api/ai-registry`
3. The frontend plugin fetches the registry at bootstrap and renders provider cards
4. When a user selects a provider, the plugin injects an init container (or bundle) from the tool's `injectorImage` into the DevWorkspace
5. API keys are stored as labeled Kubernetes Secrets that auto-mount into workspaces via `controller.devfile.io/mount-to-devworkspace`

## AI Tool Registry ConfigMap

The plugin reads from a ConfigMap labeled:

```
app.kubernetes.io/component=ai-tool-registry
app.kubernetes.io/part-of=che.eclipse.org
```

Create it with:

```bash
NS="${CHE_NAMESPACE:-eclipse-che}"

oc create configmap ai-tool-registry \
  --from-file=registry.json=registry.json \
  -n "$NS" \
  --dry-run=client -o yaml | \
  oc label --local -f - \
    app.kubernetes.io/component=ai-tool-registry \
    app.kubernetes.io/part-of=che.eclipse.org \
    -o yaml | \
  oc apply -f -
```

See [che-ai-tool-images](https://github.com/olexii4/che-ai-tool-images) for the `registry.json` format and pre-built injector images.

## Directory Structure

```
ai-selector/
  plugin.json                  # Manifest (id, name, version, enabled)
  frontend/
    plugin.tsx                 # FrontendPlugin registration (slots, bootstrap, hooks)
    components/
      AiSelector/              # Accordion widget with provider gallery
      AiToolIcon/              # Workspace list column icon
    pages/
      UserPreferences/
        AiProviderKeys/        # API key management tab
      WorkspaceDetails/
        OverviewTab/
          AiTool/              # Workspace details form group
    store/
      AiConfig/                # Redux slice (actions, reducer, selectors)
    services/
      backend-client/
        aiConfigApi.ts         # HTTP client for /api/ai-registry and /api/ai-provider-key
      helpers/
        aiTools.ts             # DevWorkspace injection logic (init containers, env vars, commands)
  backend/
    routes/
      aiConfig.ts              # CRUD routes for API key Secrets
      aiRegistry.ts            # GET /api/ai-registry endpoint
    services/
      aiProviderKeyApi.ts      # K8s Secret management (create/replace/delete)
      aiRegistryApi.ts         # ConfigMap registry reader
```

## Backend API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/dashboard/api/ai-registry` | Returns the AI tool registry (providers, tools, defaults) |
| GET | `/dashboard/api/namespace/:ns/ai-provider-key` | Lists provider IDs that have a stored API key |
| POST | `/dashboard/api/namespace/:ns/ai-provider-key` | Creates/replaces an API key Secret |
| DELETE | `/dashboard/api/namespace/:ns/ai-provider-key/:toolId` | Deletes an API key Secret |

## Kubernetes Labels

The plugin uses these labels/annotations on API key Secrets:

| Label/Annotation | Value | Purpose |
|---|---|---|
| `che.eclipse.org/ai-provider-id` | sanitized provider ID | Identifies which provider the key belongs to |
| `controller.devfile.io/mount-to-devworkspace` | `true` | Auto-mounts the secret into workspaces |
| `controller.devfile.io/watch-secret` | `true` | Enables hot-reload on secret changes |
| `controller.devfile.io/mount-as` (annotation) | `env` | Mounts secret data as environment variables |

## Disabling

Set `"enabled": false` in `plugin.json` and re-run `bash scripts/prepare-plugins.sh`. The plugin will not be registered and all UI elements will disappear.
