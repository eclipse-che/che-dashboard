---
name: fix-pr-feedback
description: Fetch all review comments from a GitHub PR, triage which are already fixed and which still need work, apply the outstanding fixes, and push. Invoke whenever the user shares reviewer feedback, pastes a PR comment, or asks to "address feedback", "fix review comments", or "respond to the review". Also use proactively after completing a PR round-trip when there are open review threads.
argument-hint: "[PR-number or PR-URL]"
---

# Fix PR Review Feedback

## Required input

A PR number or URL. If `$ARGUMENTS` is empty, ask the user.

## Workflow

### 1. Fetch all review comments

```bash
PR_NUM=<number>   # parse from $ARGUMENTS or URL

# Inline comments (on specific lines)
gh api repos/eclipse-che/che-dashboard/pulls/${PR_NUM}/comments \
  --jq '.[] | {user: .user.login, path: .path, line: .line, body: .body}' \
  | python3 -c "
import json, sys
for line in sys.stdin:
    obj = json.loads(line)
    print(f'=== [{obj[\"user\"]}] {obj[\"path\"]}:{obj[\"line\"]} ===')
    print(obj['body'][:500])
    print()
"

# General (non-inline) review comments
gh pr view ${PR_NUM} --repo eclipse-che/che-dashboard --json reviews \
  | python3 -c "
import json, sys
data = json.load(sys.stdin)
for r in data.get('reviews', []):
    if r['body']:
        print(f'[{r[\"author\"][\"login\"]}] state={r[\"state\"]}')
        print(r['body'][:500])
        print()
"
```

### 2. Read current file state

For each file mentioned in the comments, read the current version to check whether the feedback is already incorporated.

### 3. Triage

Classify each comment:

- **FIXED** — the code already matches the suggestion (the fix was in the original commit)
- **OPEN** — needs a code change

Report the triage before making any changes.

### 4. Apply fixes for OPEN items

For each open item:

1. Read the relevant file
2. Apply the minimal change that satisfies the feedback — do not over-engineer
3. If the reviewer asked for a comment addition, add only the comment; if they asked for a rename, rename only

### 5. Run tests, format, lint

```bash
# Frontend
yarn workspace @eclipse-che/dashboard-frontend test \
  --testPathPatterns "<changed-component>" --no-cache

# Backend
yarn workspace @eclipse-che/dashboard-backend test \
  --testPathPatterns "<changed-service>" --no-cache

yarn format:fix
yarn lint:fix
```

All tests must pass before committing.

### 6. Commit and push

One commit per logical group of feedback items:

```
fix: address code review findings for <context>

- <item 1 fixed>
- <item 2 fixed>

Assisted-by: {AGENT_NAME}
Signed-off-by: {AUTHOR_NAME} <{AUTHOR_EMAIL}>
```

```bash
git push origin <branch>
```

## Handling specific feedback patterns

### "Add a cross-reference comment"

Add a one-line code comment pointing to the related location:

```typescript
// Note: getProjectFromLocation.ts uses the same split('/tree/') pattern —
// if this changes (e.g. to support Bitbucket /src/ paths), update both.
```

### "Add a test for edge case X"

Add the test even if the behavior is already correct — it serves as regression documentation.

### "Rename function to Y"

Rename everywhere the function is used, including test mocks.

### "Use yarn instead of npx"

In Yarn Berry projects, `npx` may fail if `node_modules/.bin` lookup fails. Replace `npx <tool>` with `yarn <tool>`.

### "Add #!/bin/sh shebang"

Add `#!/bin/sh` as the first line of any shell script that lacks it.

### Informational comments (not actionable)

Some reviewer comments are observations marked "not a blocker". For these:

- Add a test that documents the known limitation/behavior
- Do NOT change production code
- Use a descriptive test name that explains the trade-off:

```typescript
it('should <observed behavior> (<reason it is acceptable>)', () => {
  // Known limitation: <explanation of trade-off>
  expect(result).toBe(<expected-value>);
});
```
