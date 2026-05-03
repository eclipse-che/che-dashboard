# Plugin System — `packages/dashboard-plugins`

## Overview

The `plugins` branch introduces a lightweight plugin system to the Eclipse Che
Dashboard. It lets optional features be developed, versioned, and distributed
independently of the dashboard core, without forking the main repository.

The system has three parts:

1. **`packages/dashboard-plugins`** — shared type package and runtime registry
   (the "plugin SDK"). Published as `@eclipse-che/dashboard-plugins`.
2. **Plugin bundles** — independent source trees in a separate repository
   ([olexii4/che-dashboard-plugins](https://github.com/olexii4/che-dashboard-plugins)),
   released as ZIP archives on GitHub Releases.
3. **Dashboard integration** — a thin wiring layer (`scripts/fetch-plugins.sh`,
   `scripts/prepare-plugins.sh`, `src/plugins/`) that downloads and mounts
   plugins into the dashboard build.

---

## `packages/dashboard-plugins` — the Plugin SDK

### Purpose

Defines the TypeScript contracts (types, interfaces) that both the dashboard
core and plugin authors depend on. Also provides the runtime plugin registry
used by the frontend at startup.

**No business logic lives here.** The package exists purely to establish a
stable API surface between the dashboard and its plugins.

### Package contents

```
packages/dashboard-plugins/
├── src/
│   ├── types.ts         # All plugin interfaces (FrontendPlugin, PluginSlots, …)
│   ├── registry.ts      # Runtime plugin registration and retrieval
│   ├── index.ts         # Public re-exports
│   └── frontend/
│       └── PluginSlot.tsx  # React slot component + slot getter functions
```

### Type reference

#### `PluginManifest`

```ts
interface PluginManifest {
  id: string;          // unique plugin identifier
  name: string;
  version: string;
  description: string;
  enabled: boolean;    // if false, plugin is ignored at registration time
}
```

#### `FrontendPlugin`

```ts
interface FrontendPlugin {
  manifest: PluginManifest;
  reducerKey: string;          // key in the Redux root reducer
  reducer: Reducer;            // Redux reducer for plugin state
  bootstrap?: (store: Store) => Promise<void>;  // called once after store init
  slots: PluginSlots;
  workspaceHooks?: WorkspaceHooks;
}
```

#### `PluginSlots` — extension points

| Slot | Type | Where rendered |
|------|------|----------------|
| `workspaceCreation` | `ComponentType` | Create Workspace page |
| `workspaceDetailsOverview` | `ComponentType` | Workspace Details — Overview tab |
| `workspacesListColumn` | `ColumnDefinition` | Workspaces list table — extra column |
| `userPreferencesTab` | `TabDefinition` | User Preferences — extra tab |
| `factoryParams` | `FactoryParamExtension` | Factory URL parameter parsing |
| `navigationItems` | `NavigationItemDefinition[]` | Sidebar navigation |
| `loaderTabs` | `LoaderTabDefinition[]` | Starting workspace — loader tabs |

#### `NavigationItemDefinition`

```ts
interface NavigationItemDefinition {
  to: string;                               // route path, e.g. '/devfiles'
  label: string;                            // static label fallback
  labelSelector?: (state: unknown) => string; // dynamic label from Redux state
  insertAfter?: string;                     // to-path of the item to insert after
}
```

`insertAfter` controls ordering without the plugin knowing the full nav list.
Example: `insertAfter: '/create-workspace'` places "Devfiles" immediately after
"Create Workspace".

#### `LoaderTabDefinition`

```ts
interface LoaderTabDefinition {
  key: string;          // tab eventKey, e.g. 'DevWorkspace'
  title: string;        // tab label
  component: ComponentType<{ workspace: unknown; isActive: boolean }>;
  insertAfter?: string; // key of the tab to insert after
}
```

#### `WorkspaceHooks`

```ts
interface WorkspaceHooks {
  // Called when a workspace is created — lets a plugin inject DevWorkspace patches
  onWorkspaceCreate?: (workspace, factoryParams) => workspace;
  // Called when a workspace is started — lets a plugin block or mutate the start
  onWorkspaceStart?: (workspace) => workspace | null;
}
```

### Registry API (used by the dashboard core)

```ts
// Register on startup (called from src/plugins/index.ts)
registerFrontendPlugin(plugin: FrontendPlugin): void

// Read at render time (called by Navigation, Loader, UserPreferences, etc.)
getRegisteredFrontendPlugins(): FrontendPlugin[]
getPluginNavigationItems(): NavigationItemDefinition[]
getPluginLoaderTabs(): LoaderTabDefinition[]
getPluginTabs(): TabDefinition[]       // User Preferences tabs
getPluginColumns(): ColumnDefinition[] // Workspaces list columns
```

> **Important — module identity.**
> All calls to `registerFrontendPlugin` and all calls to `getPlugin*` must
> resolve to the **same JavaScript module instance**. If `@eclipse-che/dashboard-plugins`
> and `@/plugin-registry` were two separate webpack modules, the `frontendPlugins`
> arrays would be independent and registrations would not be visible to readers.
>
> The dashboard resolves this by keeping `getPlugin*` getters in
> `packages/dashboard-frontend/src/plugin-registry/index.ts` (the same module
> that holds the `frontendPlugins` array), and importing from `@/plugin-registry`
> everywhere — never from `@eclipse-che/dashboard-plugins` directly for runtime
> state.

---

## Plugin build and distribution

### Repository layout

Plugin source lives in a separate repository, not in `eclipse-che/che-dashboard`:

```
olexii4/che-dashboard-plugins/
├── ai-selector/
│   ├── plugin.json       # manifest (id, version, enabled)
│   ├── frontend/         # React components, Redux stores
│   └── backend/          # Fastify route registrations
├── dashboard-ai-agent/
│   ├── plugin.json
│   ├── frontend/
│   └── backend/
└── packages/
    └── dashboard-plugins/ # local shim of @eclipse-che/dashboard-plugins
                           # for standalone type-checking and tests
```

### Release workflow

On every push to `main` in the plugins repo, a GitHub Actions workflow:
1. Diffs changed plugin directories against the parent commit.
2. Also checks which plugins are missing from the `latest` GitHub Release (bootstrap).
3. Builds a ZIP per changed plugin (source only — no tests, no compiled `.d.ts`).
4. Uploads ZIPs to a rolling `latest` pre-release.

```
https://github.com/olexii4/che-dashboard-plugins/releases/download/latest/ai-selector.zip
https://github.com/olexii4/che-dashboard-plugins/releases/download/latest/dashboard-ai-agent.zip
```

### Dashboard fetch (`scripts/fetch-plugins.sh`)

Called before `yarn build` and inside both Dockerfiles:

```bash
# Download latest published plugins
bash scripts/fetch-plugins.sh

# Pin to a specific release tag
bash scripts/fetch-plugins.sh --ref v1.2.0

# Use a local clone instead of downloading (active plugin development)
LOCAL_PLUGINS=~/workspace/olexii4/che-dashboard-plugins bash scripts/fetch-plugins.sh
```

### Prepare step (`scripts/prepare-plugins.sh`)

After fetch:
1. Symlinks `plugins/<id>/frontend` → `packages/dashboard-frontend/src/plugins/<id>`
2. Symlinks `plugins/<id>/backend` → `packages/dashboard-backend/src/plugins/<id>`
3. Auto-generates `packages/dashboard-frontend/src/plugins/index.ts` listing all
   **enabled** plugins so the frontend registers them at startup.

In Docker (production), symlinks are replaced with `cp -r` copies to avoid
symlink resolution issues in the container layer.

---

## Upstream vs downstream

### Upstream — `eclipse-che/che-dashboard` `main`

The upstream repository is the community source of truth. It contains:

- Core workspace management (DevWorkspace CRUD, factory flow, editor selection)
- Shared type packages (`@eclipse-che/common`, `@eclipse-che/dashboard-plugins`)
- The plugin SDK (`packages/dashboard-plugins`) with empty slot registrations
- No plugin bundles — the `plugins/` directory is `.gitignore`d

The upstream dashboard builds and ships **without any plugin** loaded. All
AI-related features are invisible unless plugins are fetched and registered.

### Downstream — `plugins` branch

The `plugins` branch is a **downstream fork** of `main` with four commits on top:

| Commit | Description |
|--------|-------------|
| `665cc9f` | `feat`: Plugin system + AI Selector + Dashboard AI Agent (full implementation) |
| `2539b15` | `refactor`: Remove bundled plugin source; fetch from GitHub Releases instead |
| `9c1382a` | `docs(openspec)`: Feature specification |
| `9005643` | `docs(openspec)`: Upstream PR description |

#### What the downstream adds

**New package**

- `packages/dashboard-plugins` — plugin SDK (types, registry, slot components).
  This package is the intended upstream contribution; it is minimal and has no
  AI-specific code.

**Core dashboard changes (intended for upstream)**

| Area | Change |
|------|--------|
| `packages/common` | New types: `AiAgentDefinition`, `AiToolDefinition`, `IAiRegistry`, `IAiAgentRegistry`, `TerminalTheme*`, `ConfigMapMessage`, `Channel.CONFIGMAP` |
| `packages/dashboard-frontend/src/Routes` | `/devfiles` and `/devfile/:namespace/:devfileId` routes |
| `packages/dashboard-frontend/src/Layout/Navigation` | Plugin-contributed nav items (`NavigationAgentList`) |
| `packages/dashboard-frontend/src/pages/Loader` | DevWorkspace tab with `LoaderAgentPanel`; workspace actions dropdown; `TimeLimit` gated by agent status |
| `packages/dashboard-frontend/src/components/Header` | `actions` prop for injecting a dropdown into the title row |
| `packages/dashboard-frontend/src/store` | `AiAgentRegistry`, `AiConfig`, `DevfileSchema`, `DevWorkspaceSchema`, `LocalDevfiles` Redux slices |
| `packages/dashboard-backend/src/app.ts` | Registration of all new API routes |
| `packages/dashboard-backend/src/devworkspaceClient/services/helpers/patchOptions.ts` | `JSON_MERGE_PATCH_OPTIONS` |
| `build/dockerfiles/` | Plugin fetch step before build |
| `scripts/` | `fetch-plugins.sh`, `prepare-plugins.sh` |
| `run/local-patch.sh` | Fast CRC deploy (arm64, SSH load, no registry push) |

**Plugin-specific code (lives in plugins repo, not upstream)**

Everything under `plugins/ai-selector/` and `plugins/dashboard-ai-agent/` is
**not** part of the upstream PR. It ships via GitHub Releases and is fetched at
build time.

### Rebase strategy

Because the `plugins` branch is a strict extension of `main` (no cherry-picks,
no history rewrites), rebasing onto a new `main` tip is mechanical:

```bash
git fetch origin
git rebase origin/main
# resolve any conflicts in:
#   packages/common/src/dto/api/index.ts  (new types alongside upstream additions)
#   packages/dashboard-frontend/src/store/rootReducer.ts  (new reducers)
#   packages/dashboard-backend/src/app.ts  (new route registrations)
git push --force-with-lease origin plugins
```

### Upstream contribution path

The intended upstreaming sequence:

1. **`packages/dashboard-plugins`** — plugin SDK only. No AI code, no slots
   other than the generic ones. Reviewed as infrastructure, not a feature.
2. **Core integration hooks** — `scripts/fetch-plugins.sh`,
   `scripts/prepare-plugins.sh`, Dockerfile changes, `src/plugin-registry/`.
3. **`packages/common` additions** — only the generic types (`TerminalTheme*`,
   `ConfigMapMessage`, `Channel.CONFIGMAP`, `removeChannelMessageListener`).
   AI-specific types (`AiAgentDefinition`, etc.) belong in the plugin SDK or
   a separate PR.
4. **AI Selector** — tracked as [eclipse-che/che-dashboard#1505](https://github.com/eclipse-che/che-dashboard/pull/1505).
5. **Devfile Creator + AI Agent** — tracked as [eclipse-che/che-dashboard#1515](https://github.com/eclipse-che/che-dashboard/pull/1515).

Each step can be reviewed and merged independently. Steps 1–3 unblock the
plugin infrastructure for any downstream use case; steps 4–5 are the specific
AI features built on top.
