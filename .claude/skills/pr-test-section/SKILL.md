---
name: pr-test-section
description: Write the "Is it tested? How?" section of a che-dashboard PR description. Invoke any time you need to fill in the test section — UI fixes needing deploy-and-verify steps, logic fixes needing unit test counts, or dependency upgrades needing the license-check checklist. Also use when a reviewer asks for better test documentation.
---

# Write "Is it tested? How?"

Pick the template that matches the change, then fill in the specifics.

## Choose by change type

| Change type | Template |
|---|---|
| UI fix or feature | Deploy + navigate + verify steps |
| Accessibility fix | Deploy + navigate + DOM/keyboard/reader check |
| Bug fix with observable behavior | Deploy + reproduce original bug + verify fix |
| Unit test only | Test suite name + count + pass statement |
| Dependency / CVE upgrade | `yarn install` + `yarn license:generate` + test suite pass |
| Pure refactor / rename / N/A | `N/A` or test count only |
| Platform / hardware specific | Hardware env + build + test pass |

---

## Template 1 — Deploy and verify (UI fix, feature, bug fix)

```
1. Deploy Eclipse Che with the dashboard image from this PR.
2. Navigate to **<Page>** → **<Tab or section>**.
3. <Perform the action that was broken or is new>.
4. Verify: <what the reviewer should see>.
```

**Tips:**
- Step 1 is almost always "Deploy Eclipse Che with the dashboard image from this PR" — include it even if obvious.
- Use **bold** for UI element names, backticks for terminal commands or DOM attributes.
- Add a contrast line when useful: "Without this fix: <old wrong behavior>."
- For multi-scenario fixes, add separate numbered paths ("Idle path:" / "Active path:").

**Real examples:**

```
1. Deploy Eclipse Che with the dashboard image from this PR.
2. Start a workspace and verify the kebab (⋮) appears in the loader page header with Start and Stop items.
3. Press Stop — confirm the workspace stops and the Events tab still shows events collected during startup.
4. Press Start from the kebab on a stopped workspace — confirm the workspace starts again.
```

```
1. Deploy Eclipse Che with the image from this PR.
2. Create a workspace from a sample with "Create New" OFF.
3. Navigate to the same factory URL — existing workspace is opened, no duplicate.
4. Repeat with an airgap sample — same behaviour.
```

---

## Template 2 — Accessibility fix

```
1. Deploy Eclipse Che with the dashboard image from this PR.
2. Navigate to **<Page>**.
3. <Inspect DOM / run axe / use Tab / use screen reader>.
4. Verify: <no violation / focus order / announcement>.
```

**Real examples:**

```
1. Deploy Eclipse Che with the dashboard image from this PR.
2. Click the hamburger button (top-left) to collapse the left sidebar.
3. Press Tab repeatedly — verify focus never enters the collapsed sidebar.
4. Expand the sidebar again — verify all navigation links are reachable with Tab.
```

```
Existing snapshot tests updated to include the new live region elements (25 snapshots updated).
Manually verified with macOS VoiceOver on Chrome (Command+F5) that status changes are announced without user focus movement.
```

---

## Template 3 — Unit tests + build only (no deploy needed)

```
All <N> <SuiteName> tests pass. Full `yarn build` completes with zero errors.
```

Or for multiple suites:

```
- All <N> <Suite A> tests pass (<M> suites).
- All <N> <Suite B> tests pass.
- `yarn build` (webpack with ts-loader) completes with zero errors.
```

Use when the fix is pure logic, a new test, a snapshot update, or a mock fix — when no visual change requires a live deploy to verify.

---

## Template 4 — Dependency / CVE upgrade

```
- No runtime logic changed — pure dependency upgrade.
- `yarn install` resolves cleanly: `<package>@<new-version>` installed, `<package>@<old-version>` removed.
- `yarn license:generate` completes without unresolved dependencies.
- `yarn license:check` passes.
```

---

## Template 5 — Platform / hardware specific

```
Tested end-to-end on <hardware/platform>:

1. Native image build — `podman build -f build/dockerfiles/rhel.Dockerfile` completed successfully on <arch>.
2. Architecture verification — `podman inspect` confirms `OS/Arch: linux/<arch>`.
3. Full unit test suite — `yarn test` ran natively: <N> tests passed.
```

---

## Template 6 — N/A

Use only for pure refactoring, doc/comment/whitespace changes, or changes fully covered by existing tests with no new scenarios:

```
N/A
```

---

## CLI commands in steps

When the fix requires a cluster command to reproduce, include it inline:

```
2. Shorten the session timeout to trigger the scenario quickly:
   ```bash
   kubectl patch checluster/eclipse-che -n eclipse-che --type=merge \
     -p '{"spec":{"networking":{"auth":{"gateway":{"oAuthProxy":{"cookieExpireSeconds":120}}}}}}'
   ```
3. Idle path: open the dashboard, do not move the mouse. Modal appears at 60 s; sign-out at 120 s.
4. Active path: keep moving the mouse. Modal must not appear.
```

---

## What NOT to write

- "Tested" with no specifics — reviewers can't reproduce it
- The template comment (`<!-- Please provide instructions... -->`)
- What the code does — describe what the reviewer should DO and SEE
- Passive voice ("it was verified that") — write in imperative ("verify", "confirm", "run")
