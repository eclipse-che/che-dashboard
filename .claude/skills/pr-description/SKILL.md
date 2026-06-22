---
name: pr-description
description: Generate a full PR description following the che-dashboard template and save it to openspec/docs/. Invoke when asked to "write a PR description", "prepare the PR", "create a description for this branch", or "document what this PR does". Always run check-coverage first — do not write the PR description if any changed package fails its coverage threshold.
argument-hint: "[branch or ticket-id]"
---

# Generate PR Description

> **Prerequisite:** Run the `check-coverage` skill first. Do not write the PR description if any changed package fails its coverage threshold.

## Related skills

- **`check-coverage`** — run before writing the PR (coverage must pass first)
- **`pr-test-section`** — use for the "Is it tested? How?" section

## Workflow

### 1. Gather context

```bash
git log --oneline origin/main..HEAD   # commits on this branch
git diff origin/main..HEAD --stat     # changed files
git branch --show-current             # branch name / ticket
```

For a CVE/dependency fix, also read the Jira ticket description if provided.

### 2. Choose save path and filename

- Frontend-only changes: `packages/dashboard-frontend/openspec/docs/<name>.md`
- General / backend / security changes: `openspec/docs/<name>.md`

Filename: `pr-<jira-id>-<short-kebab-topic>.md`

### 3. Write the PR description

Follow the project template **exactly** (from `.github/PULL_REQUEST_TEMPLATE.md`):

```markdown
### What does this PR do?

<one-sentence summary of the primary change>

<Root Cause + Fix subsections for bugs; numbered bold list for multiple changes>

### Screenshot/screencast of this PR

<omit section if not applicable>

### What issues does this PR fix or reference?

fixes https://redhat.atlassian.net/browse/<TICKET>

### Is it tested? How?

<use the pr-test-section skill>

#### Release Notes

<single past-tense user-facing sentence>

#### Docs PR

N/A
```

### 4. Writing style

**Lead with an action verb.** First sentence starts with `Fixes / Adds / Upgrades / Prevents / Removes` — present tense, no passive voice.

**For bugs — include Root Cause + Fix:**

```markdown
### Root Cause

<Exact technical mechanism. Name the function, variable, or condition.>

### Fix

<What changed and why it works. Show a diff block for 1–3 line changes.>
```

**For multiple independent changes — numbered bold list:**

```markdown
1. **Thing A** — short explanation of what it fixes/adds and why
2. **Thing B** — short explanation
```

**Show diffs for small changes:**

````markdown
```diff
-function isPollStopPhase(phase: string): boolean {
+function isTerminalPhase(phase: string): boolean {
   return (
-    phase === DevWorkspaceStatus.RUNNING ||
     phase === DevWorkspaceStatus.FAILED ||
```
````

**Release Notes:** Single past-tense sentence from the user's perspective — no internal component names, no TypeScript.

**Avoid:** "This PR implements…", "In order to fix…", "Please note that…", em dash overuse, nested bullet lists.

### 5. Security/CVE format

```markdown
### What does this PR do?

Upgrades `<package>` to <version> to fix a <vulnerability-type> vulnerability.

`<package>` versions prior to <fix-version> <vulnerability description>. The
dependency is transitively required by <requester>, so the upgrade requires a
`resolutions` override in the root `package.json`.

### What issues does this PR fix or reference?

fixes https://redhat.atlassian.net/browse/<JIRA>

### Is it tested? How?

- No runtime logic changed — pure dependency upgrade.
- `yarn install` resolves cleanly: `<package>@<new-version>` installed, `<package>@<old-version>` removed.
- `yarn license:generate` completes without unresolved dependencies (`<package>@<version>` ClearlyDefined score <N>, <LICENSE>).
- `yarn license:check` passes.

#### Release Notes

Updated <package> to <version> to address a <type> vulnerability.
```

### 6. Save and confirm

Write the file to the determined path, then confirm:

```bash
ls <path>/<filename>.md
```
