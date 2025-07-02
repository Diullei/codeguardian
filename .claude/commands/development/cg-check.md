---
description: Run CodeGuardian check and fix any violations found
allowed-tools: ['read', 'write', 'edit', 'bash', 'grep', 'glob', 'ls']
---

# CodeGuardian Check and Fix

You are tasked with running CodeGuardian to check for rule violations and fix any issues found. Follow these steps carefully:

## 1. First, understand the available options

Run `codeguardian check --help` to understand all available options and parameters.

## 2. Check for npm scripts

Look in package.json for predefined check scripts that may include important exclusions:

```bash
grep -E '"check.*":' package.json
```

If npm scripts like `check`, `check:all`, or `check:staged` exist, use those instead of running codeguardian directly, as they may include important exclusions (e.g., examples, tests).

## 3. Run a comprehensive check

If npm scripts exist:
```bash
npm run check:all
```

Otherwise, execute CodeGuardian with appropriate parameters:
- Use `--mode all` to check all files in the codebase
- Use `--base master` if the repository uses master branch (check with `git branch` first)
- Use `--format console` for readable output
- Consider excluding example/test directories if they exist: `--exclude "**/examples/**" "**/tests/**"`

Example command:
```bash
codeguardian check --mode all --base master
```

## 4. Analyze the violations

When violations are found:

1. Carefully read each violation message
2. Understand what rule is being violated
3. Check the rule configuration files (usually in `.codeguardian/` directory) to understand the intent

## 5. Fix the violations

For each violation, determine the appropriate action:

### Most common case: Fix the code

- Modify the code to comply with the rules
- This is the default approach in 95% of cases
- Examples:

    - If a rule requires specific model names, update the code to use those models
    - If a rule prohibits certain imports or references, remove them
    - If a rule enforces coding standards, adjust the code accordingly

> 🚨 **DANGEROUS PATH: Update the rule only if absolutely necessary**
> Updating a rule can have wide-reaching and unintended consequences across the codebase.
> Avoid this unless you're **certain** the rule is incorrect or harmful as written.
>
> You should **only** update a rule if:
>
> - The rule is clearly inconsistent with how the system is logically designed
> - The rule contains an objective error (e.g., wrong file paths, broken regex)
> - The rule **breaks essential functionality** that cannot be reasonably worked around
>
> 🔧 **If you must change a rule:**
>
> 1. Clearly justify why the rule needs to change
> 2. Apply the **smallest possible change** to fix the issue
> 3. Double-check that the rule still fulfills its original purpose
> 4. Consider impacts on other parts of the project

> 💥 **Rule changes should be treated as high-risk interventions. Always prefer adjusting code to match the rule.**

## 6. Verify the fixes

After making changes:

1. Run CodeGuardian again to ensure all violations are resolved
2. Use the same command parameters as the initial check
3. Confirm that the output shows no violations

## 7. Summary

Provide a brief summary of:

- What violations were found
- What fixes were applied
- Whether any rules needed updating (and why)

Remember: The goal is to ensure code compliance with established standards. Always prefer fixing code over changing rules unless there's a compelling reason.

$ARGUMENTS
