---
name: update-che-e2e-tests
description: Update E2E tests in the eclipse-che/che repository based on a GitHub pull request from an upstream repository. Analyzes PR selector changes, identifies affected test files in tests/e2e/, and applies locator updates following Che test conventions.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Agent
  - Skill
  - AskUserQuestion
---

# update-che-e2e-tests

Update E2E tests in the [eclipse-che/che](https://github.com/eclipse-che/che) repository based on a GitHub pull request from an upstream repository.

The user provides:
- A source PR URL via `{{.PullRequestURL}}`

The target repository is always `https://github.com/eclipse-che/che`, with tests located under `tests/e2e/`.

## Che E2E Test Conventions Reference

The tests use **Selenium WebDriver + Mocha (TDD style) + TypeScript** with **inversify** for dependency injection. You MUST follow these conventions exactly:

### File Structure
| Directory | Purpose |
|---|---|
| `tests/e2e/pageobjects/` | Page Object classes (dashboard/, ide/, login/, git-providers/, openshift/, webterminal/) |
| `tests/e2e/specs/` | Test spec files (api/, factory/, miscellaneous/, web-terminal/) |
| `tests/e2e/utils/` | DriverHelper, Logger, API handlers |
| `tests/e2e/tests-library/` | Reusable helpers (LoginTests, WorkspaceHandlingTests) |
| `tests/e2e/constants/` | Environment variables and timeouts |
| `tests/e2e/configs/` | Inversify DI container, Mocha config |


### Page Object Pattern
```typescript
@injectable()
export class MyPage {
    // Static locators: private static readonly fields of type By
    private static readonly BUTTON: By = By.xpath('//button');

    constructor(@inject(CLASSES.DriverHelper) private readonly driverHelper: DriverHelper) {}

    // Public methods: no "public" keyword, Logger.debug() at start, explicit return types
    async clickButton(): Promise<void> {
        Logger.debug();
        await this.driverHelper.waitAndClick(MyPage.BUTTON);
    }

    // Dynamic locators: private methods returning By
    private getDynamicLocator(name: string): By {
        return By.xpath(`//div[text()="${name}"]`);
    }
}
```

### Locator Rules
- **Static locators** → `private static readonly NAME: By = By.xpath('...');`
- **Dynamic locators** → `private methodName(param: string): By { return By.xpath(...); }`
- **Never** declare locators as constants inside methods

### Test Structure (TDD, No Arrow Functions)
```typescript
suite('Suite Name', function (): void {
    const dashboard: Dashboard = e2eContainer.get(CLASSES.Dashboard);

    suiteSetup('Setup', async function (): Promise<void> { /* ... */ });
    test('Test case', async function (): Promise<void> { /* ... */ });
    suiteTeardown('Cleanup', async function (): Promise<void> { /* ... */ });
});
```

### Style Rules
- Single quotes for strings
- Explicit return types on ALL functions
- `@injectable()` on all page objects and utilities
- `Logger.debug()` at start of every public method
- Comments start lowercase: `// todo issue crw-1010`
- No arrow functions in Mocha declarations

### Adding New Components
- **New page object**: create in `pageobjects/<category>/`, register in `configs/inversify.types.ts` and `configs/inversify.config.ts`
- **New test**: create in `specs/<category>/TestName.spec.ts`

## Workflow

Follow these steps in order. Do not skip steps.

---

### Step 1: Analyze the Source PR

Parse `{{.PullRequestURL}}` to extract `<owner>/<repo>` and `<PR_NUMBER>`.

**1a. Fetch changed files and diff:**
```bash
gh pr view <PR_NUMBER> --repo <owner>/<repo> --json title,body,files,labels,state,url,number
gh pr diff <PR_NUMBER> --repo <owner>/<repo>
```

**1b. Fetch PR comments for context:**
```bash
gh pr view <PR_NUMBER> --repo <owner>/<repo> --json comments,reviews,reviewDecision
```

**1c. Extract selector changes from the diff:**

Scan the diff for changes to UI selectors. Look for these patterns:
- `aria-label` changes (e.g., `"Actions"` → `"Actions for {name}"`)
- `data-testid` changes
- CSS class changes
- XPath-relevant text or attribute changes
- Button/element text changes
- Any DOM selector or attribute changes

For each changed selector, record:
- **Old value** (from removed `-` lines)
- **New value** (from added `+` lines)
- **File where the change occurred** (for context on the component)

**1d. Discover related PRs, issues, and tickets:**

Parse the PR body and comments for references to:
- Other PRs: patterns like `#123`, `org/repo#123`, or full GitHub PR URLs
- Issues: patterns like `fixes #123`, `closes #123`, `resolves #123`
- Issue tracker tickets: Jira URLs, Linear IDs, or other tracker references

Record any ticket references for the commit message.

---

### Step 2: Clone the Che Repository

```bash
git clone https://github.com/eclipse-che/che.git
cd che
```

All subsequent commands run from inside this directory. The E2E tests live under `tests/e2e/`.

---

### Step 3: Read Existing Conventions and Context

Before making changes, read the project's own guidance:

**3a. Read the project documentation:**
```bash
cat tests/e2e/CLAUDE.md
cat tests/e2e/CODE_STYLE.md
```

**3b. Read the inversify DI configuration** to understand registered classes:
```bash
cat tests/e2e/configs/inversify.types.ts
cat tests/e2e/configs/inversify.config.ts
```

**3c. Read a few existing page object files** relevant to the area being changed (e.g., if the PR modifies dashboard UI, read `tests/e2e/pageobjects/dashboard/` files) to understand patterns in practice.

**3d. Record the conventions** observed. Always match the existing patterns exactly — do not impose external conventions.

---

### Step 4: Search for Affected E2E Test Files

For each old selector value extracted in Step 1c, search the test codebase:

**4a. Search in page objects / locators first:**
```bash
grep -rn "<old-aria-label>" tests/e2e/ --include="*.ts"
grep -rn "<old-data-testid>" tests/e2e/ --include="*.ts"
grep -rn "<old-css-class>" tests/e2e/ --include="*.ts"
```

**4b. Search broader if needed:**
```bash
grep -rn "<old-selector>" tests/e2e/ --include="*.ts"
```

**4c. Read each affected file fully:**

For each file found, use the `Read` tool to examine:
- The locator definitions that reference the old selectors
- The methods that use those locators
- Whether the locator is static (`private static readonly`) or dynamic (private method returning `By`)
- Whether existing method signatures need new parameters for dynamic values
- All callers of affected methods (search for method name usage across `tests/e2e/`)

---

### Step 5: Apply Changes

For each affected test file:

1. Identify the exact locator definitions or methods that need updating
2. Update the locators to match the new selectors from the source PR
3. If the new selector includes dynamic values (e.g., an entity name), convert from static to dynamic following Che conventions
4. Preserve the code style, patterns, and structure of the existing codebase

**When a static locator becomes dynamic (Che pattern):**

```typescript
// BEFORE: static locator
private static readonly ACTIONS_BUTTON: By = By.xpath('//button[@aria-label="Actions"]');

// AFTER: dynamic locator (private method returning By)
private getActionsLocator(name: string): By {
    return By.xpath(`//button[@aria-label="Actions for ${name}"]`);
}
```

Update ALL callers of the old locator to use the new method with the required parameter.

**When adding new page objects or utilities:**
1. Create the file in the appropriate `pageobjects/<category>/` directory
2. Add the class to `tests/e2e/configs/inversify.types.ts`
3. Register the binding in `tests/e2e/configs/inversify.config.ts`
4. Include the required file header

**Applying changes:**
- Use the `Edit` tool to surgically update only the affected locators and methods. Do not rewrite entire files.
- If adding new methods, place them near related existing methods.
- Ensure `Logger.debug()` is at the start of every new public method.
- Use `@injectable()` on any new classes.
- Use explicit return types on all functions.

---

### Step 6: Validate

Run the Che E2E validation toolchain from the `tests/e2e/` directory:

```bash
cd tests/e2e
npm ci
npm run prettier
npm run tsc
npm run lint
```

Fix any errors before proceeding. Common issues:
- Missing imports (especially `By`, `Logger`, `CLASSES`, `@injectable`, `@inject`)
- Missing inversify registrations for new classes
- Formatting inconsistencies (Prettier)
- Lint violations (ESLint)
- Type errors from mismatched method signatures after adding parameters
- Missing `Logger.debug()` calls in public methods

---

### Step 7: Create Branch, Commit, Push, and Open PR

**7a. Create a descriptive branch:**
```bash
git checkout -b fix-e2e-<short-description>-pr-<PR_NUMBER>
```

Example: `fix-e2e-actions-locator-pr-1544`

**7b. Commit with a structured message:**

```bash
git add tests/e2e/
git commit --signoff -m "fix(e2e): update <locator-name> for <reason>

<source-repo> changed <old-selector> to <new-selector> (<owner>/<repo>#<PR_NUMBER>).
Updated <method-names> in <page-object-file> to use the new selector pattern.

Fixes <TICKET_URL>"
```

Omit the `Fixes` line if no ticket was referenced in the source PR.

**7c. Push the branch:**
```bash
git push origin fix-e2e-<short-description>-pr-<PR_NUMBER>
```

**7d. Create the PR:**
```bash
gh pr create --draft --no-fork --fill --base main
```

The PR title should follow: `fix(e2e): update <locator> for <reason>`

The PR body should include:
- What changed in the source PR
- Which e2e locators/page objects were affected
- How the fix addresses the breaking change
- Reference to the original source PR (`<owner>/<repo>#<PR_NUMBER>`)
- Reference to any related tickets

**7e. Print summary:**

```
## Done

**Source PR:** <source PR URL>
**Target repo:** eclipse-che/che
**Branch:** fix-e2e-<short-description>-pr-<PR_NUMBER>
**Files changed:** <list of changed files>
**PR created:** <new PR URL>

### Next steps
1. Review the changes
2. Wait for CI checks (Prettier, TSC, ESLint, minikube tests)
3. Run affected tests manually if possible
```

---

## Error Handling

- If `gh` is not installed or not authenticated, tell the user to install and authenticate the GitHub CLI first.
- If the PR URL is invalid or the PR cannot be fetched, report the error and ask the user to verify the URL.
- If no e2e files in `tests/e2e/` reference the changed selectors, report that no e2e updates are needed and explain why.
- If you cannot determine the correct locator from the PR diff alone, add a `// todo` comment (lowercase, per Che convention) and flag it in the summary.
- If validation fails after your changes, fix the errors before creating the PR.
