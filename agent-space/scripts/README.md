# Agent Space sample preparation

These scripts fetch the Getting Started sample manifests shown on the Agent Space
**Getting Started** page and verify them before a build.

They mirror the dashboard's `scripts/airgap.sh` flow, with one difference: agent-sandbox samples
are plain Kubernetes manifests rather than devfile + project-zip pairs, so each index entry
resolves to a single YAML file.

## Requirements

`jq`, `git` and `yq` must be on `PATH`.

Two incompatible tools are both called `yq` — the Go one ([mikefarah](https://github.com/mikefarah/yq),
what Homebrew installs) and the Python jq wrapper ([kislyuk](https://github.com/kislyuk/yq), what
CI uses). The scripts detect which one is present and adapt their flags, so either works.

## `prepare-samples.sh`

Clones each sample's upstream repository at the pinned ref and copies the referenced manifest into
the output directory under a deterministic `<id>.yaml` name.

```bash
./scripts/prepare-samples.sh -i packages/registry/sandbox/index.json
# or, from agent-space/
yarn samples:prepare
```

| Option                        | Meaning                                                              |
| ----------------------------- | -------------------------------------------------------------------- |
| `--src-index-json-path`, `-i` | Path to the JSON file listing the samples (required)                 |
| `--output-dir`, `-o`          | Where manifests are written (defaults to the `index.json` directory) |
| `--help`, `-h`                | Usage                                                                |

Only `https://github.com` sources are accepted, and only manifests whose `kind` is `Sandbox` —
the frontend creates exactly that resource and nothing else. A `source.url` on any other host is
rejected before anything is cloned.

`index.json` is an input, never an output: it is tracked, and the script leaves it untouched so a
run never dirties the working tree. An entry whose `manifest.filename` disagrees with the
`<id>.yaml` the script writes is reported as an error in the index rather than silently rewritten.
An entry may also omit `manifest.filename` — both the frontend and `check-samples.sh` fall back to
`<id>.yaml`.

The index is also the only list of samples there is. Nothing outside it is downloaded, and a
manifest left over from an entry that has since been removed is deleted on the next run — the
`*.yaml` files are gitignored, so a stale one would otherwise survive every checkout and keep
being served by the registry with nothing linking to it.

`defaults.image` pins the image the local copy runs. Upstream examples are written for their own
test scripts, which either substitute a `${IMAGE}` placeholder or build an image locally and refer
to it by a tag that exists nowhere else; `defaults.image` covers both — it replaces the
placeholder where there is one, and otherwise overwrites the image of every container in the
manifest.

## `check-samples.sh`

Verifies that every entry in `index.json` has a local manifest next to it and that each manifest
parses as a `kind: Sandbox` resource. Run it in CI after `prepare-samples.sh` and before building
the frontend — a broken index fails at runtime, not at build time.

```bash
./scripts/check-samples.sh -i packages/registry/sandbox/index.json
# or, from agent-space/
yarn samples:check
```

Expected output:

```text
[OK]   hello-world -> hello-world.yaml
[OK]   python-sandbox -> python-sandbox.yaml
[OK]   python-runtime -> python-runtime.yaml
[OK]   playwright-sandbox -> playwright-sandbox.yaml
[INFO] All 4 sample(s) are valid.
```

## Adding a sample

1. Add an entry to `packages/registry/sandbox/index.json`:

   ```json
   {
     "id": "my-sample",
     "displayName": "My Sample",
     "description": "What this sandbox demonstrates.",
     "tags": ["Agent"],
     "icon": "/images/sandbox.svg",
     "source": {
       "url": "https://github.com/kubernetes-sigs/agent-sandbox",
       "ref": "main",
       "path": "examples/my-sample/my-sample.yaml"
     },
     "manifest": { "filename": "my-sample.yaml" }
   }
   ```

   Optional fields: `defaults.image` (the image the local copy runs) and `notes` (caveats the
   user has to know before creating the sandbox).

2. Run `yarn samples:prepare`, then `yarn samples:check`.
3. Create the sandbox on a real cluster and confirm it reaches a useful state.
4. Commit `index.json` only — the downloaded `*.yaml` manifests are gitignored.

## Which upstream examples work here

Most of the ~65 examples in `kubernetes-sigs/agent-sandbox` are written for a specific cloud or a
specific add-on and cannot be created from this UI. Before adding one, check it against all of
these:

| Requirement                                                    | Why                                                                                                                                                               |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kind: Sandbox`, single document                               | The frontend creates one Sandbox. `SandboxTemplate`, `SandboxClaim` and `SandboxWarmPool` live in `extensions.agents.x-k8s.io`, which the backend does not proxy. |
| No `runAsUser`, `runAsGroup` or `fsGroup`                      | OpenShift's `restricted-v2` SCC assigns a per-namespace UID range and rejects the pod outright for any value outside it. This disqualifies most examples.         |
| No `runtimeClassName`                                          | gVisor, Kata and Firecracker are not installed on a stock cluster.                                                                                                |
| No `nodeSelector`, `hostPath`, `privileged`, or GPU requests   | Cloud- or node-specific; they will not schedule.                                                                                                                  |
| A publicly pullable image                                      | Many examples refer to `:local` or `:latest` tags their own scripts build. Pin a published image with `defaults.image` if one exists.                             |
| No ServiceAccount, ConfigMap or Secret that has to exist first | A missing ServiceAccount fails pod creation with `ReconcilerError` and nothing starts.                                                                            |
| Modest `resources.requests`                                    | A 2Gi request will not schedule on a default CRC node once Che itself is running.                                                                                 |

A container that exits is fine, but say so in `notes` — under `restartPolicy: Never` the sandbox
settles on **Completed**, which looks like a failure if the card does not warn about it.

Samples are upstream Apache-2.0 manifests from
[kubernetes-sigs/agent-sandbox](https://github.com/kubernetes-sigs/agent-sandbox); they are
downloaded at build time rather than vendored into this repository.
