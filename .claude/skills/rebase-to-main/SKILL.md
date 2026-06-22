---
name: rebase-to-main
description: Rebase the current branch onto latest main and force-push. Invoke whenever the user asks to rebase, bring a branch up to date, resolve rebase conflicts, or push after a rebase. Handles .deps/ conflict resolution, license regeneration, and forbidden-trailer cleanup — all the che-dashboard-specific steps that go wrong without this.
---

# Rebase Branch to Main

## Workflow

### 1. Fetch and compare

```bash
git fetch origin main
git log --oneline FETCH_HEAD..HEAD    # commits to replay
git log --oneline HEAD..FETCH_HEAD | head -10  # what main added
```

### 2. Rebase

```bash
git rebase FETCH_HEAD
```

No conflicts → skip to step 5.

### 3. Resolve conflicts

#### `.deps/EXCLUDED/prod.md` or `.deps/EXCLUDED/dev.md`

Both sides may have added entries. Merge them — keep all of main's entries and re-apply ours:

```bash
git checkout --ours .deps/EXCLUDED/prod.md .deps/EXCLUDED/dev.md
git add .deps/EXCLUDED/prod.md .deps/EXCLUDED/dev.md
```

Then after continuing the rebase, re-run `yarn license:generate` to restore any entries our branch added.

#### `.deps/prod.md` or `.deps/dev.md`

Always regenerated. Take main's version, then regenerate:

```bash
git checkout --ours .deps/prod.md .deps/dev.md
git add .deps/prod.md .deps/dev.md
```

#### `package.json` / `yarn.lock`

Usually auto-merges. If not, reconcile manually (keep our dep additions alongside main's changes), then:

```bash
yarn install
```

#### Continue

```bash
git add <resolved-files>
git rebase --continue
```

### 4. Reinstall and regenerate licenses

```bash
yarn install 2>&1 | grep -E "(added|removed|Done|Error)" | head -5
yarn license:generate
```

**If `yarn license:generate` exits with UNRESOLVED:**

| Symptom | Fix |
|---|---|
| Package from main now missing from EXCLUDED | ClearlyDefined batch timeout — retry |
| New package our branch added | Check score; add to EXCLUDED if 0 |

Check score:
```bash
curl -s --max-time 10 \
  "https://api.clearlydefined.io/definitions/npm/npmjs/-/<package>/<version>" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('scores',{}).get('effective',0))"
```

Add to EXCLUDED if score = 0:
```markdown
| `<package>@<version>` | [clearlydefined](https://clearlydefined.io/definitions/npm/npmjs/-/<package>/<version>) |
```

### 5. Verify

```bash
yarn license:check   # must exit 0
git log --oneline -5
git show --stat HEAD
```

### 6. Strip forbidden trailers

Check for `Made-with` or `Co-authored-by` in any replayed commit:

```bash
git log FETCH_HEAD..HEAD --format='%H %s' | while read hash rest; do
  git log -1 --format='%B' "$hash" | grep -qiE '^(Made-with|Co-authored-by):' && echo "DIRTY: $hash $rest"
done
```

If dirty:
```bash
FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch -f --msg-filter \
  'sed "/^Made-with:/d; /^Co-authored-by:/d"' \
  -- FETCH_HEAD..HEAD
git update-ref -d refs/original/refs/heads/$(git branch --show-current)
```

For a single-commit branch, amending is simpler:
```bash
git commit --amend -m "$(git log -1 --format='%s')"
# add trailers manually if needed
```

### 7. Force push

```bash
git push --force origin <branch>
```

## Common `.deps/` conflict patterns

**Pattern 1 — Both sides added entries, neither is a superset**

Merge manually: keep all of main's entries, then append ours below them.

**Pattern 2 — Our branch removed a dep entry that main still has**

Take main's version and let `yarn license:generate` clean it up:
```bash
git checkout --ours .deps/prod.md
git add .deps/prod.md
```

**Pattern 3 — ClearlyDefined link vs `ecd.che` reference for the same package**

Keep the ClearlyDefined link (more complete, preferred by the tool).
