# Project Rules

See @../AGENTS.md for project guidelines.

See @../redhat-compliance-and-responsible-ai.md for Red Hat compliance and responsible AI rules.

See @rules/che-dashboard-dev.md for development conventions — commits, CSS, deps, git patterns, accessibility.

## Available Skills

Project-specific skills live in `.claude/skills/`. Invoke with `/skill-name`:

| Skill | When to use |
|---|---|
| `commit-message` | Write a human-style commit message following project conventions |
| `manage-resolutions` | Audit and clean up the `resolutions` field in `package.json` |
| `fix-cve-dep` | Upgrade a vulnerable npm dependency (CVE/Jira ticket) |
| `rebase-to-main` | Rebase a branch onto latest main, resolve `.deps/` conflicts, force-push |
| `fix-pr-feedback` | Fetch PR review comments, triage fixed vs open, apply outstanding fixes |
| `check-coverage` | Verify test coverage meets thresholds before opening a PR |
| `pr-test-section` | Write the "Is it tested? How?" section of a PR description |
| `pr-description` | Generate a PR description and save to `openspec/docs/` (run `check-coverage` first) |

## Hard Rules

- **No `any` type**: NEVER use `any` or cast to `any` in TypeScript code. Use proper types, type guards, `unknown`, or specific interfaces instead.
