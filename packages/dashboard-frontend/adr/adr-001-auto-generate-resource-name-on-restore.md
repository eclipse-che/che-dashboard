# ADR-001: Auto-generate K8s resource name when restoring from backup

- **Status:** Accepted
- **Date:** 2026-05-13
- **PR:** [#1565](https://github.com/eclipse-che/che-dashboard/pull/1565)

## Context

Eclipse Che workspaces have two names:

- **`metadata.name`** — the immutable Kubernetes resource identifier, set at creation time (e.g., `empty-1234`). Never shown to users in the dashboard UI.
- **Display name** — stored in the `kubernetes.io/metadata.name` label, changeable by the user (e.g., `not-empty-1234`). Shown everywhere in the UI: workspace list, sidebar, breadcrumbs, details page.

The restore-from-backup flow currently sets `metadata.name` directly from the user's text input. This creates a UX problem after workspace rename:

1. User creates workspace `empty-1234` (this becomes `metadata.name`)
2. User renames it to `not-empty-1234` (sets the display name label; `metadata.name` stays `empty-1234`)
3. User sees `not-empty-1234` everywhere — the name `empty-1234` is invisible
4. DWO backs up the workspace under `empty-1234` (uses `metadata.name`)
5. User tries to restore a backup with name `empty-1234`
6. Conflict error: "A workspace with this name already exists" — but the user cannot see any workspace named `empty-1234`

This looks like a bug to the user.

## Options considered

### 1. Improve the error message

Show the display name alongside the resource name in the conflict error: *"A workspace named 'not-empty-1234' (resource: empty-1234) already exists."*

- **Pros:** Minimal change, transparent, shippable immediately
- **Cons:** Leaks K8s internals (`metadata.name`) to users who have no mental model for it. Every other UI surface hides this identifier — the restore form would be the only place exposing it. Fixes the confusion but preserves the broken interaction model.

### 2. Validate display names only, handle K8s 409 at API level

The frontend checks only display names for conflicts. If the K8s API rejects the create with a 409 (resource name collision), surface an error after submission.

- **Pros:** UX is intuitive from the user's perspective — if they can't see the name, no conflict is shown
- **Cons:** Error surfaces late (after clicking Restore), not in the form. The K8s 409 error message is cryptic and hard to translate into a user-friendly message. Split validation model (frontend checks one thing, backend checks another) is fragile.

### 3. Auto-generate `metadata.name` at restore time

The user types a display name. The system generates a unique `metadata.name` using `generateWorkspaceName()` (appends a random 4-character suffix), and stores the user-typed name as the display name label. Conflict validation checks display names instead of resource names.

- **Pros:** Eliminates K8s resource name conflicts entirely. Consistent with the factory workspace creation flow, which already uses `generateWorkspaceName()`. Users never encounter errors referencing invisible identifiers. Proven pattern in production.
- **Cons:** `metadata.name` of a restored workspace differs from the original backup's workspace name (e.g., `my-ws-x7q2` instead of `my-ws`). Users who `kubectl get devworkspaces` see the suffixed name. Display name collisions are possible (two workspaces with the same display name but different resource names).

### 4. Try exact name, append suffix on conflict

Use the user-typed name as `metadata.name`. If K8s rejects with a 409, retry with an auto-generated suffix.

- **Pros:** Clean names when no conflict exists
- **Cons:** Inconsistent behavior — sometimes the user gets what they typed, sometimes they don't. Requires two API calls in the conflict case. Factory creation always generates a suffix; restore should be consistent.

### 5. Fix at DWO level

Make workspace rename update `metadata.name` by deleting and recreating the DevWorkspace resource with the new name.

- **Pros:** Eliminates the dual-name problem at the source
- **Cons:** Requires DWO changes (different repository, different release cycle). Recreating a DevWorkspace loses UID, events, and status history. Complex and risky.

## Decision

**Option 3: Auto-generate `metadata.name` at restore time.**

### Motivation

The restore flow creates a new DevWorkspace resource — it does not patch an existing one. The sequence is:

1. Build a restore devfile with `RESTORE_WORKSPACE=true` and `RESTORE_SOURCE_IMAGE` attributes
2. Call `fetchResources()` to generate DevWorkspace + DevWorkspaceTemplate resources
3. `DwtApi.createTemplate()` — creates new DevWorkspaceTemplate
4. `DwApi.createWorkspace()` — creates new DevWorkspace
5. Set ownerReference linking the two

This is the same create-resource pattern that factory workspace creation uses. Factory creation already calls `generateWorkspaceName()` to produce suffixed names like `my-project-a1b2`. Applying the same pattern to restore is architecturally consistent.

Every "negative" consequence of this approach (suffixed `metadata.name`, display name collisions, kubectl showing a different name) already exists in factory workspace creation and is accepted as a trade-off. Restore should not behave differently from creation.

The other options either expose K8s internals to users (option 1), push errors to submission time (option 2), behave inconsistently (option 4), or require changes outside the dashboard (option 5).

### What changes

In `restoreWorkspaceFromBackup.ts`, instead of:

```typescript
devWorkspaceResource.metadata.name = workspaceName;
```

Do:

```typescript
devWorkspaceResource.metadata.name = generateWorkspaceName(workspaceName);
if (!devWorkspaceResource.metadata.labels) {
  devWorkspaceResource.metadata.labels = {};
}
devWorkspaceResource.metadata.labels[DEVWORKSPACE_LABEL_METADATA_NAME] = workspaceName;
```

The conflict validation in `RestoreFromBackup/index.tsx` shifts from checking K8s resource names to checking display names:

```typescript
// Before: checked metadata.name (invisible to user)
const existingWorkspaceNames = new Set(allWorkspaces.map(ws => ws.resourceName));

// After: check display names (what the user sees)
const existingWorkspaceNames = new Set(allWorkspaces.map(ws => ws.name));
```

## Consequences

### Positive

- K8s resource name conflicts become structurally impossible during restore
- Restore behavior is consistent with factory workspace creation
- Users never encounter errors referencing invisible identifiers
- The conflict check validates what the user actually sees

### Negative

- `metadata.name` of a restored workspace will differ from the original backup's workspace name. This is the same trade-off factory creation makes.
- Users who `kubectl get devworkspaces` will see the suffixed name, not the display name. This is also consistent with factory-created workspaces.
- Display name collisions are possible (two workspaces with the same display name but different resource names). This is already possible with factory-created workspaces and is not a new risk.

### Migration

No migration needed. This change only affects new restore operations. Existing workspaces are unaffected.
