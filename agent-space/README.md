# Agent Space MVP

A standalone, client-side UI for managing [Kubernetes Agent Sandbox](https://agent-sandbox.sigs.k8s.io/)
resources (`sandboxes.agents.x-k8s.io/v1beta1`), shipped alongside the Eclipse Che Dashboard.

`packages/frontend` is a yarn workspace of the dashboard monorepo
(`@eclipse-che/agent-space-frontend`), so it shares the root `yarn.lock`, the root tooling
configuration and the root `yarn build` / `yarn test`. It keeps its own webpack configuration and
emits into the dashboard's own output tree, and it follows the same structure and conventions as
`packages/dashboard-frontend` so the two stay easy to read side by side.

## Why a separate bundle

The Agent Space UI targets a Kubernetes API group that the dashboard backend does not proxy. It
is a separate bundle rather than a set of dashboard routes so it can be iterated on, enabled and
disabled independently while the feature is a work in progress.

## Layout

```text
agent-space/
├── packages/
│   ├── frontend/                      # React 18 + PatternFly 6 SPA (yarn workspace)
│   │   ├── src/
│   │   │   ├── components/            # Presentational components
│   │   │   ├── hooks/                 # usePolling
│   │   │   ├── Layout/                # Masthead, sidebar, 'Workspaces' back link
│   │   │   ├── pages/                 # GettingStarted, CreateSandbox, SandboxList, SandboxDetails
│   │   │   ├── Routes/                # Hash routes
│   │   │   ├── services/              # Config, samples, Sandbox model helpers
│   │   │   │   └── client/            # AgentSandboxClient: Kubernetes + mock implementations
│   │   │   ├── store/                 # Redux store: Bootstrap, Sandboxes, SandboxDetails, Samples
│   │   │   └── testUtils/             # Shared render helpers (excluded from coverage)
│   │   ├── static/config.json         # Runtime configuration, overridable per deployment
│   │   ├── index.html
│   │   ├── jest.config.js
│   │   └── webpack.config.{common,dev,prod}.js
│   └── registry/
│       ├── sandbox/                   # index.json (tracked) + downloaded manifests (ignored)
│       └── images/
└── scripts/                           # Sample preparation, see scripts/README.md
```

## Getting started

```bash
yarn install                      # from the repository root, installs every workspace
cd agent-space/packages/frontend
yarn samples:prepare              # downloads the Getting Started manifests, see ../../scripts/README.md
yarn build:watch                  # rebuilds into the dashboard's output tree on every change
```

The bundle is served by the dashboard backend, so run the dashboard itself (`yarn start` from the
repository root) and open `/dashboard/agent-space`. There is deliberately no webpack dev server
here: it would pull a second HTTP stack into the dependency tree and shadow production
dependencies in `.deps/prod.md`, which feeds the Eclipse Dash IP review.

Without `samples:prepare` the app still runs; the Getting Started page then tells you which
manifests are missing and how to fetch them.

## Scripts

Run from `agent-space/packages/frontend`, or from the repository root with
`yarn workspace @eclipse-che/agent-space-frontend <script>`:

| Script                                  | Purpose                                                                                |
| --------------------------------------- | -------------------------------------------------------------------------------------- |
| `yarn build`                            | Production bundle into `packages/dashboard-frontend/lib/public/dashboard/agent-space/` |
| `yarn build:dev`                        | Development bundle                                                                     |
| `yarn build:watch`                      | Development bundle, rebuilt on change                                                  |
| `yarn test`                             | Jest suite                                                                             |
| `yarn test:coverage`                    | Jest with coverage                                                                     |
| `yarn lint:check` / `yarn lint:fix`     | `tsc --noEmit` + ESLint (+ stylelint)                                                  |
| `yarn format:check` / `yarn format:fix` | Prettier                                                                               |
| `yarn samples:prepare`                  | Download the indexed sample manifests, prune the rest; `index.json` is left untouched  |
| `yarn samples:check`                    | Verify every indexed sample has a valid local manifest                                 |

The root `yarn build`, `yarn test`, `yarn lint:fix` and `yarn format:fix` fan out over every
workspace, this one included.

Follow the Surgical Change Workflow from the repository `AGENTS.md`: targeted tests, then
`format:fix`, then `lint:fix`.

## State

All application state lives in a Redux Toolkit store (`src/store`) built the same way as the
dashboard's, with one directory per slice holding `actions.ts`, `reducer.ts` and `selectors.ts`:

| Slice            | Holds                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------- |
| `Bootstrap`      | The runtime config, the resolved namespace and the client mode; everything else waits on it |
| `Sandboxes`      | The sandbox list plus the pending lifecycle action and its error                            |
| `SandboxDetails` | One sandbox with its events, reset whenever another name is requested                       |
| `Samples`        | The Getting Started index plus the pending create and its error                             |

The store is checked with `serializableCheck`, so the API client is not kept in it: the bootstrap
thunk installs it in a module-level singleton (`services/client/instance.ts`) that the other
thunks read, and errors are stored as plain `SandboxError` objects rather than `Error` instances.

## Runtime configuration

`static/config.json` is copied verbatim into the bundle and read at startup, so a deployment can
change it without a rebuild (for example by mounting a ConfigMap over it).

| Key               | Default                         | Meaning                                                                                                        |
| ----------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `mode`            | `auto`                          | `cluster` talks to the dashboard backend, `mock` serves demo data, `auto` probes once and falls back to `mock` |
| `kubeApiBaseUrl`  | `""`                            | Origin in front of `/dashboard/api/...`. Empty means same origin                                               |
| `namespace`       | `""`                            | Pins the namespace. Empty means resolve it at startup                                                          |
| `samplesIndexUrl` | `./registry/sandbox/index.json` | Getting Started index                                                                                          |
| `dashboardUrl`    | `../#/workspaces`               | Target of the 'Workspaces' back link                                                                           |

### How the cluster is reached

The UI is client-side only: there is no Agent Space backend. `KubeSandboxClient` reaches Sandboxes
through the dashboard backend instead, under `/dashboard/api/namespace/:namespace/sandboxes`.

Calling the Kubernetes API straight from the browser does not work on a dashboard origin: the Che
gateway routes `/api` to the Che server and that rule also catches `/apis/...`, so a list silently
returns the SPA and a create comes back as a `404` from the Che server. The dashboard backend is
routed to, and it relays each call with the caller's own token. Nothing in this project adds RBAC —
a user sees exactly the sandboxes their own permissions allow, and a `403` is surfaced as such.

In the default `auto` mode the startup probe asks the backend whether the cluster serves the
`agents.x-k8s.io` group; when it does not, the app falls back to `MockSandboxClient` and the
masthead shows an explicit **Demo data** label so a demo is never mistaken for a live cluster.

The namespace is resolved from Che's own `/api/kubernetes/namespace` endpoint when `namespace` is
left empty, falling back to the first namespace the user can list, then to `default`.

## Relationship to the dashboard

The dashboard shows an **Agent Space** navigation item only when the CheCluster CR has
`spec.agentSandbox.enabled: true` (see
[che-operator#2184](https://github.com/eclipse-che/che-operator/pull/2184)). The item is an
ordinary in-SPA link to `#/agent-space`; that route performs a full-page navigation to
`<dashboard-root>/agent-space/`, where this bundle is served. If the bundle is not deployed, the
route shows an explanatory page with a manual link rather than failing silently.

The Agent Space masthead has a **Workspaces** button that navigates back to `#/workspaces`.

## Licensing note

Dependencies of this workspace are resolved through the repository-root `yarn.lock` and are
therefore covered by the root `.deps/` license tooling. Run `yarn license:generate` from the
repository root after changing `agent-space/packages/frontend/package.json`.
