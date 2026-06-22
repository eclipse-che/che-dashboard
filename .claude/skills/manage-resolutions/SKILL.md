---
name: manage-resolutions
description: Audit and clean up the resolutions field in package.json — find orphaned pins, verify which are still needed, and safely remove stale ones. Invoke when asked to "check resolutions", "remove stale pins", "clean up package.json resolutions", or after a CVE fix adds a new resolution override that needs validation.
---

# Manage `resolutions` in package.json

The `resolutions` field forces yarn to use a specific version of a package across the entire dependency tree. Resolutions serve two purposes:

1. **Version floor** — prevent a vulnerable or broken version even if a transitive dep requests it
2. **Deduplication anchor** — collapse conflicting ranges into one version, reducing bundle size

Static analysis of yarn.lock is not enough to decide whether a resolution is safe to remove — it might look redundant but still be acting as a deduplication anchor across hidden transitive deps. Always test removal.

## Quick audit

This project has a built-in check script:

```bash
yarn resolutions:check
```

It reads `package.json` and `yarn.lock` and prints each resolution with its status:
- **⚠️ KEEP** — overrides older ranges that would resolve to a lower version
- **✅ POSSIBLY REMOVABLE** — no older ranges found (but still verify before removing)
- **❓ NOT FOUND IN LOCK** — package no longer in the tree (orphan — remove immediately)

## Detailed audit (alternative)

If you need more detail than the script provides:

```bash
python3 << 'EOF'
import re, json

with open('package.json') as f:
    resolutions = json.load(f).get('resolutions', {})
with open('yarn.lock') as f:
    lock = f.read()

for res_key, res_val in sorted(resolutions.items()):
    bare = ('@' + res_key.split('@')[1]) if res_key.startswith('@') \
           else (res_key.split('@')[0] if '@' in res_key else res_key)

    pattern = rf'"({re.escape(bare)}@npm:[^"]+(?:, {re.escape(bare)}@npm:[^"]+)*)":\n  version: "?([^"\n]+)'
    matches = re.findall(pattern, lock)

    if not matches:
        print(f'[ORPHAN]  {res_key}: {res_val}')
        continue

    for descriptor, version in matches:
        ranges = re.findall(rf'{re.escape(bare)}@npm:([^,>"]+)', descriptor)
        print(f'[ACTIVE]  {res_key}: {res_val}  →  v{version.strip()}  (requesters: {[r.strip() for r in ranges]})')
EOF
```

| Status | Meaning | Action |
|---|---|---|
| `[ORPHAN]` | Not in yarn.lock | Remove immediately |
| `[ACTIVE]` exact pin | Prevents resolution to a different version | Keep unless CVE is fixed upstream |
| `[ACTIVE]` cross-major | Forces upgrade past semver boundary | Keep — transitive dep hasn't updated |
| `[ACTIVE]` `^` range, multiple conflicting requesters | Deduplication anchor | Keep |
| `[ACTIVE]` `^` range, sole requester = same range | Possible no-op | Test before removing |

## Safe removal — always test individually

Never remove multiple resolutions at once:

```bash
# 1. Remove ONE entry from resolutions in package.json
# 2. Reinstall:
yarn install

# 3. Check what changed:
git diff yarn.lock | grep "^[+-]  version:" | head -20

# Safe to remove if the package version did not change and no other packages split.
# Revert if the package downgraded or other packages multiplied:
git checkout -- package.json yarn.lock
```

**Real example from this project:** removing `"glob": "^11.1.0"` caused glob to downgrade from `11.1.0` to `10.5.0` because a transitive dependency requests `^10.x`. The static analysis (only one visible requester at `^11.1.0`) missed this. Always test.

## Add a resolution (CVE fix)

### `^` range — minimum floor within the major

```json
"follow-redirects": "^1.16.0"
```

Use when you want a minimum floor but allow upgrades within the major.

### Exact pin — for ClearlyDefined indexing constraints

```json
"axios": "1.16.1"
```

Use when the package isn't indexed at higher versions (check: `curl -s "https://api.clearlydefined.io/definitions/npm/npmjs/-/axios/1.18.0" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['scores']['effective'])"`) or you need to prevent automatic resolution to a newer un-tested version.

### Cross-major override — when requester declares a lower major

```json
"ip-address": "10.2.0"
```

Use when the CVE fix is in a new major version and the requester hasn't updated its `^9.x` range yet.

### Scoped version override — force a specific range only

```json
"ajv@^6.0.0": "6.14.0"
```

Use when you want to force only the `^6.x` range to a safe 6.x version without affecting the `^8.x` range.

## After adding a resolution

```bash
yarn install
grep -A 3 '"<package>@npm' yarn.lock | head -5   # confirm correct version
yarn license:generate
```

If `yarn license:generate` fails with UNRESOLVED, see the `fix-cve-dep` skill.
