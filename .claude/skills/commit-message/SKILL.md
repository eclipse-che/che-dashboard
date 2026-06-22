---
name: commit-message
description: Write a git commit message for any che-dashboard change. Invoke this before running git commit — for bug fixes, features, deps, a11y, refactors, or any other change type. Produces a conventional-commit subject line, optional body, and the required Assisted-by trailer in the project's human-sounding style.
---

# Write a Commit Message

## Subject line

```
type(scope): short description
```

- **≤ 50 characters**
- Lowercase after the colon
- No trailing period
- Imperative or declarative — both are fine in this repo

| type | when |
|---|---|
| `fix` | bug fix, broken behavior |
| `feat` | new user-visible feature |
| `chore` | deps, CI, tooling, housekeeping |
| `refactor` | restructuring without behavior change |
| `test` | adding or updating tests |
| `docs` | documentation only |
| `fix(deps)` | security/CVE dependency upgrade |
| `fix(a11y)` | accessibility fix |
| `feat(ui)` | UI/UX addition |

## Body (only when the subject line isn't self-explanatory)

**Add a body when:**
- The fix is non-obvious — explain the root cause, not just the symptom
- The change covers multiple independent items
- A CVE or issue tracker reference is needed

**How to write it:**
- One blank line after the subject
- 1–3 short paragraphs; keep it under 10 lines total
- Plain declarative sentences — state what changed and why
- No bullet lists unless listing 2+ separate items

**Skip the body when:**
- The subject line already says everything (`fix(a11y): add workspace name to kebab menu aria-label`)
- It's a single-line fix

## Trailers

Always add at the very end, after a blank line:

```
Assisted-by: {AGENT_NAME}
Signed-off-by: {AUTHOR_NAME} <{AUTHOR_EMAIL}>
```

Get the values from:
```bash
git config user.name   # AUTHOR_NAME
git config user.email  # AUTHOR_EMAIL
```

## Anti-patterns

| ❌ Avoid | ✅ Instead |
|---|---|
| "This commit improves..." | Just say what it does |
| "In this change we..." | State the change directly |
| "Enhanced the validation logic" | "Fix validation not triggered on empty input" |
| "Leverages PatternFly's..." | "Use PatternFly's..." |
| Long bulleted lists for a single concept | 1–2 sentences |
| Passive voice in subject | Active: "fix" not "fixed" or "is fixed" |
| Capitalized subject after colon | `fix: improve contrast` not `fix: Improve contrast` |

## Real examples from this repo

```
fix(ui): disable Save button when Gitconfig name or email fields are empty
```
*(no body — subject is complete)*

```
fix(deps): upgrade axios to 1.15.2 and follow-redirects to 1.16.0

Fixes two security vulnerabilities:
- follow-redirects < 1.16.0: custom auth headers leaked on cross-domain redirects
- axios < 1.15.1: prototype pollution enables arbitrary HTTP header injection
```

```
fix(a11y): remove prohibited aria-label from backup schedule element

The <small> element does not support aria-label per ARIA specs
(aria-prohibited-attr). The visible text already provides full context
for screen readers, making the aria-label redundant.

Fixes: https://issues.redhat.com/browse/CRW-10738
```

```
fix: enable keyboard selection in git provider dropdown

Add onSelect handler and shouldFocusFirstItemOnOpen to the Dropdown,
and value prop to each DropdownItem, so keyboard Enter/Space selects
a provider after opening the dropdown.

Resolves: https://redhat.atlassian.net/browse/CRW-10662
```

## Issue references

Add at the end of the body when relevant:

```
Fixes: https://redhat.atlassian.net/browse/CRW-XXXXX
Resolves: https://redhat.atlassian.net/browse/CRW-XXXXX
```
