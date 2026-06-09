# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for this package.

## What is an ADR?

An ADR documents a significant architectural or design decision: the context that prompted it, the options considered, the choice made, and the consequences. ADRs are immutable once accepted — they capture the reasoning at a point in time. If a decision is reversed, write a new ADR that supersedes the old one.

## File naming

```
adr-NNN-short-description-of-decision.md
```

- `NNN` — zero-padded sequence number (001, 002, …)
- Use lowercase kebab-case for the description

## Template

```markdown
# ADR-NNN: Title

- **Status:** Draft | Accepted | Deprecated | Superseded by ADR-NNN
- **Date:** YYYY-MM-DD
- **PR:** [#NNN](https://github.com/eclipse-che/che-dashboard/pull/NNN)

## Context

<Why this decision was needed. The problem, constraints, and forces at play.>

## Options considered

### 1. Option name

<Brief description and trade-offs.>

### 2. Option name

<Brief description and trade-offs.>

## Decision

<The chosen option and the key reason.>

## Consequences

<What becomes easier or harder. Side-effects. Follow-up work.>
```

## Status values

| Status                | Meaning                                 |
| --------------------- | --------------------------------------- |
| Draft                 | Under discussion                        |
| Accepted              | In effect                               |
| Deprecated            | No longer relevant; context has changed |
| Superseded by ADR-NNN | Replaced by a later decision            |
