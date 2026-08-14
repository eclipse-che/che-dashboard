### What does this PR do?

Improves aria-labels in the Container Registry modal to include programmatic context for screen reader users.

Generic aria-labels like "open registry" and "show" lack sufficient context when read out of visual context (e.g., when a screen reader lists all buttons/links on the page). This fix adds descriptive context to two interactive elements:

1. **Open registry URL button** — `aria-label="open registry"` → `aria-label="Open container registry"`
2. **Show password toggle button** — `aria-label="show"` → `aria-label="Show password"`

### Screenshot/screencast of this PR

N/A

### What issues does this PR fix or reference?

Accessibility improvement — no specific ticket.

### Is it tested? How?

1. Deploy Eclipse Che with the dashboard image from this PR.
2. Navigate to **User Preferences** → **Container Registries** → **Add Container Registry** (or edit an existing registry).
3. Inspect the DOM with browser DevTools:
   - The external link button next to the Registry URL field has `aria-label="Open container registry"`.
   - The eye icon button next to the Password field has `aria-label="Show password"`.
4. Verify with a screen reader (e.g., NVDA, JAWS, VoiceOver) or browser accessibility tools that both buttons announce with clear context.

All existing tests pass — no logic changed, only aria-label attribute values updated.

#### Release Notes

Improved accessibility labels for Container Registry modal buttons.

#### Docs PR

N/A
