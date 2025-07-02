---
description: Create a new CodeGuardian rule for code quality enforcement
allowed-tools: [WebFetch, Write, Read, Edit]
---

## Context

CodeGuardian is a tool for enforcing code quality rules through pattern matching and AST analysis.

## Your Task

Create a new CodeGuardian rule based on the following requirement:
**$ARGUMENTS**

If no requirement is provided, ask the user: "What rule would you like to create? Please describe what the rule should check for."

### Steps to follow:

1. First, fetch and read the CodeGuardian cheat sheet to understand rule syntax:

    - URL: https://raw.githubusercontent.com/Diullei/codeguardian/refs/heads/main/Cheat_Sheet.md
    - Study the rule structure, selectors, assertions, and combinators

2. Based on the requirement, determine:

    - What files/patterns to check
    - What conditions to validate
    - Whether to use positive or negative assertions
    - Appropriate error messages and suggestions

3. Create the rule file in `.codeguardian/` directory with a descriptive filename ending in `.yaml`

4. The rule should include:

    - Unique `id` field
    - Clear `description` of what the rule enforces
    - Appropriate `rule` structure with:
        - `type`: Usually `for_each` for file-based checks
        - `select`: File pattern selector
        - `assert`: Validation logic with clear `message` and `suggestion`

5. Test the rule by running:
    ```bash
    codeguardian check -c .codeguardian/[rule-filename].yaml --mode all
    ```

> IMPORTANT: In case codeguardian is not installed, provide instructions to install it:

```bash
npm install -g @diullei/codeguardian@beta
```
