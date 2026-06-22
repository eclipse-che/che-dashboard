# che-dashboard Development Conventions

---

## 1. Commit Trailers

Only these trailers are permitted:

```
Assisted-by: {AGENT_NAME}
Signed-off-by: {AUTHOR_NAME} <{AUTHOR_EMAIL}>
```

`{AGENT_NAME}` — specific agent name, e.g. `Claude Sonnet 4.6`.  
`{AUTHOR_NAME}` / `{AUTHOR_EMAIL}` — from `git config user.name` / `git config user.email`.

**Do NOT add:** `Made-with`, `Co-authored-by`, or duplicate trailers.  
**Do NOT add** AI explanation comments inside source code.  
**On amend:** always pass the full message with `-m "..."` so trailers are not stacked.

### Commit message format

- Subject line ≤ 50 chars, conventional commits: `type(scope): short description`
- Common types: `fix`, `feat`, `chore`, `refactor`, `test`, `docs`

### Example

```
fix(ui): prevent error message from overflowing the ErrorReporter widget

Assisted-by: Claude Sonnet 4.6
Signed-off-by: Jane Developer <jane@example.com>
```

---

## 2. Pre-commit Checks

**Before each commit** (fast — run every time):

```bash
yarn lint:fix
yarn format:fix
yarn workspace @eclipse-che/dashboard-frontend test --testPathPatterns="ComponentName" --no-cache
```

**Before pushing / opening a PR** (full suite):

```bash
yarn build
yarn test
```

Follow the Surgical Change Workflow in `AGENTS.md` — targeted test runs before commit, full suite before push.

### Updating snapshots

When rendering changes break existing snapshots:

```bash
yarn workspace @eclipse-che/dashboard-frontend test --testPathPatterns="ComponentName" --updateSnapshot
```

Always verify the snapshot diff makes sense before committing.

---

## 3. Dependency Changes — License Regeneration

When `package.json` or `yarn.lock` changes:

```bash
yarn license:generate
```

If it exits with **"UNRESOLVED dependencies"**, add the missing package to `.deps/EXCLUDED/dev.md` (dev dep) or `.deps/EXCLUDED/prod.md` (runtime dep):

```markdown
| `package-name@X.Y.Z` | [clearlydefined](https://clearlydefined.io/definitions/npm/npmjs/-/package-name/X.Y.Z) |
```

Then re-run `yarn license:generate`. Remove entries for packages no longer in `yarn.lock`.

---

## 4. CSS Property Ordering

This project uses `stylelint-config-clean-order`. Follow these group conventions:

| Group | Properties |
|-------|-----------|
| Layout | `position`, `z-index`, `overflow`, `overflow-x`, `overflow-y`, `display`, `flex-*`, `grid-*` |
| Box/Size | `box-sizing`, `width`, `min-width`, `max-width`, `height`, `margin`, `padding` |
| Typography | `font-*`, `color`, `text-*`, `word-break`, `white-space`, `line-height` |
| Visual | `background`, `background-color`, `border*`, `border-radius`, `box-shadow` |
| Animation | `transition`, `animation` |

- Empty lines **between groups** when rule has ≥ 5 properties
- **No empty lines within a group**

---

## 5. Error Handling

Use typed error classes with status codes instead of string matching:

```typescript
export class GitClientError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
    this.name = 'GitClientError';
  }
}

// In route handler:
const statusCode = e instanceof GitClientError ? e.statusCode : 500;
reply.status(statusCode).send(helpers.errors.getMessage(e));
```

---

## 6. Git Workflow Patterns

### Squash all branch commits into one

```bash
git reset $(git merge-base origin/main HEAD)
git add -A
git commit -m "feat: ..."
```

### Strip forbidden trailers from new local commits (not yet pushed)

Use only on commits that have never been pushed. Once a branch has a remote tracking branch, use `git rebase -i` to reword commit messages instead.

```bash
FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch -f --msg-filter \
  'sed "/^Made-with:/d; /^Co-authored-by:/d"' \
  -- HEAD~1..HEAD

git update-ref -d refs/original/refs/heads/$(git branch --show-current)
```

Note: `--msg-filter` only rewrites commit messages — no stash needed.

### Resolve .deps merge conflicts

```bash
git checkout --theirs .deps/EXCLUDED/dev.md .deps/EXCLUDED/prod.md
git add .deps/EXCLUDED/dev.md .deps/EXCLUDED/prod.md
```

Then re-run `yarn license:generate` after the rebase continues.

---

## 7. Accessibility and UI Conventions

- Icon hover color: `var(--pf-t--global--icon--color--subtle)` default, `var(--pf-t--global--text--color--link--default)` on hover
- Tooltip `<a>` link colors: inverse background — use dark tokens in light theme, light tokens in dark theme (see the tooltip CSS module)
- Keyboard toggle for `Switch`: wrap in `<div onKeyDown>` and handle `Enter`
- Keyboard selection in `Select`/`SelectOption` with `hasCheckbox`: add explicit `onKeyDown` on each `SelectOption`
- `ErrorReporter` overlay: `position: fixed; inset: 0; z-index: 9999`
- Error `<pre>` blocks: `max-width: 100%; overflow-x: auto`
