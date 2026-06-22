---
name: check-coverage
description: Run test coverage for all packages changed on this branch and identify uncovered code. Always invoke before writing a PR description, after adding new code, or when a PR receives coverage-related review feedback. Prevents CI coverage failures and catches untested code before reviewers do.
---

# Check Test Coverage

## Coverage thresholds (enforced by CI)

| Package | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| `common` | 99% | 99% | **100%** | 99% |
| `dashboard-frontend` | 92% | 88% | 85% | 92% |
| `dashboard-backend` | 86% | 80% | 86% | 86% |

## Workflow

### 1. Identify changed packages

```bash
git diff origin/main..HEAD --name-only | grep "^packages/" | cut -d/ -f2 | sort -u
```

Only run coverage for packages with changed files.

### 2. Run coverage

```bash
yarn workspace @eclipse-che/common test --coverage --no-cache
yarn workspace @eclipse-che/dashboard-frontend test --coverage --no-cache
yarn workspace @eclipse-che/dashboard-backend test --coverage --no-cache
```

Look for the `Coverage summary` block at the end:

```
Statements   : 91.5% ( 1001/1094 )   ← must be ≥ threshold
Branches     : 87.2% ( 106/122 )
Functions    : 84.6% ( 22/26 )
Lines        : 91.5% ( 1001/1094 )
Jest: "global" coverage threshold for statements (92%) not met: 91.5%
```

All thresholds met → go to step 5.

### 3. Find uncovered code

```bash
yarn workspace @eclipse-che/<package> test --coverage --no-cache \
  --coverageReporters=text 2>&1 | grep "| " | \
  awk -F'|' '{if ($3+0 < 90 || $4+0 < 85 || $5+0 < 85) print}' | head -20
```

Also check whether changed source files have corresponding test files:

```bash
# Changed source files (not tests)
git diff origin/main..HEAD --name-only | grep "^packages/<pkg>/src" | grep -v "__tests__\|spec\|mock"
# Expected test location: src/<path>/__tests__/<name>.spec.ts
```

### 4. Write missing tests

For each uncovered file or function:

1. Read the source file
2. Create or update `__tests__/<name>.spec.ts`
3. Cover happy path, error path, edge cases, and both sides of every branch

Iterate quickly with `--testPathPatterns`:

```bash
yarn workspace @eclipse-che/<package> test \
  --testPathPatterns "<FileName>" --coverage --no-cache
```

### 5. Verify thresholds

```bash
yarn workspace @eclipse-che/<package> test --coverage --no-cache 2>&1 | tail -10
```

Must show no `"coverage threshold … not met"` lines. Do not proceed to PR description until every changed package passes.

## Common patterns for untested code

### New utility function
```typescript
it('returns X for valid input', () => { ... });
it('throws for invalid input', () => { ... });
it('handles empty array', () => { ... });
```

### New React component
```typescript
it('renders without crashing', () => { renderComponent(); });
it('shows error state when prop is true', () => { ... });
it('calls callback on button click', () => { ... });
```

### New async action / Redux thunk
```typescript
it('dispatches success on 200', async () => { ... });
it('dispatches error on network failure', async () => { ... });
```

### New API route (backend)
```typescript
it('returns 200 with correct body', async () => { ... });
it('returns 403 when not authorized', async () => { ... });
```

## What NOT to test (excluded from coverage)

- `src/**/__tests__/**` — test files themselves
- `src/**/*.d.ts` — type declarations
- `src/**/*.config.ts` — config files
- `src/index.tsx`, `src/App.tsx`, `src/Routes.tsx` — frontend entry points
- `src/localRun/**`, `src/utils/**`, `src/server.ts` — backend exclusions

## Note on snapshots

Updating snapshots (`--updateSnapshot`) does not improve branch/function coverage. Add behavioral tests alongside snapshot updates when coverage is at risk.
