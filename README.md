# Code Guardian

**Code Guardian** is an open-source developer tool designed to validate and enforce architectural rules in codebases—especially valuable when dealing with AI-generated code. It automatically analyzes code after every change to preserve architectural integrity, enforce predefined standards, and reduce the risk of AI hallucinations, ensuring consistent, high-quality software structures.

## Overview

Code Guardian is a Git-aware validation tool that allows you to define complex validation rules for your codebase by composing simple, reusable primitives. It can analyze various types of changes in your repository:

- **Committed changes**: Diff between two Git branches (e.g., main and your feature branch)
- **Uncommitted changes**: Both staged and unstaged modifications in your working directory
- **Deep source analysis**: Options to analyze the entire codebase, not just changes

By default, it validates files that have been added, modified, deleted, or renamed, making it an ideal development tool for catching issues early - especially when working with AI-generated code. This focused approach helps developers quickly validate changes and prevent AI hallucinations from introducing architectural violations or security issues. It also provides options for comprehensive codebase analysis when needed.

By default, Code Guardian scans configuration files named `<filename>.codeguardian.yaml`, `<filename>.codeguardian.yml`, `<filename>.cg.yaml`, or `<filename>.cg.yml`. If a file pattern is explicitly provided, it will instead scan only the files matching that pattern, with full support for shell-style wildcards (e.g., `**/*.yaml`).

Instead of writing custom validation logic, you can combine selectors, assertions, and logical operators to create sophisticated rules that enforce coding standards, security policies, and architectural constraints on your code changes.

## Installation

```bash
npm install -g codeguardian
```

Or use locally in a project:

```bash
npm install --save-dev codeguardian
```

## Quick Start

1. Create a rule configuration file (e.g., `rules.yaml`):

```yaml
id: no-console-log
description: Ensure no console.log statements in production code
rule:
    type: for_each
    select:
        type: select_files
        path_pattern: 'src/**/*.{js,ts}'
        exclude_pattern: '**/*.test.*'
    assert:
        type: assert_match
        pattern: 'console\.log'
        should_match: false
```

2. Run check:

```bash
codeguardian check -c rules.yaml -b main
```

## Rule Primitives

### Selectors

Selectors find and return items to validate:

- **select_files** - Select files by path pattern and status
  - By default: only selects files that have changed (added/modified/deleted/renamed)
  - With `select_all: true`: selects from all files in the repository
- **select_lines** - Select lines matching a pattern within file content
- **select_ast_nodes** - Select AST nodes using ast-grep queries
- **select_file_changes** - Select files based on percentage of lines changed

### Assertions

Assertions check properties of selected items:

- **assert_match** - Check if text matches a pattern
- **assert_count** - Check the count of items
- **assert_property** - Check object properties

### Combinators

Combinators compose rules using logical operations:

- **all_of** - All rules must pass (AND)
- **any_of** - At least one rule must pass (OR)
- **none_of** - No rules should pass (NOT)
- **for_each** - Apply assertion to each selected item

## Examples

### No Hardcoded Secrets

```yaml
id: no-secrets
description: Prevent hardcoded secrets
rule:
    type: for_each
    select:
        type: select_files
        path_pattern: '**/*'
    assert:
        type: none_of
        rules:
            - type: assert_match
              pattern: 'api_key\s*=\s*["\''][^"\'']+["\'']'
            - type: assert_match
              pattern: 'AWS[A-Z0-9]{16,}'
```

### Clean Architecture

```yaml
id: clean-architecture
description: Enforce layer boundaries
rule:
    type: for_each
    select:
        type: select_files
        path_pattern: 'src/domain/**/*.ts'
    assert:
        type: assert_match
        pattern: 'from.*infrastructure'
        should_match: false
```

### AST-Based Validation

Code Guardian uses [ast-grep](https://ast-grep.github.io/) for powerful pattern matching. Here are some advanced patterns:

#### Basic Pattern with Meta Variables

```yaml
id: no-direct-dom-manipulation
description: Prevent direct DOM manipulation in React components
rule:
    type: for_each
    select:
        type: select_files
        path_pattern: '**/*.{jsx,tsx}'
    assert:
        type: for_each
        select:
            type: select_ast_nodes
            query: 'document.$METHOD($ARG)'  # Matches document.getElementById(...), etc.
            language: 'typescript'
        assert:
            type: assert_match
            pattern: '.'
            should_match: false
            message: 'Direct DOM manipulation detected. Use React refs instead.'
```

#### Capturing and Reusing Variables

```yaml
id: consistent-error-handling
description: Ensure caught errors are properly handled
rule:
    type: for_each
    select:
        type: select_files
        path_pattern: '**/*.ts'
    assert:
        type: for_each
        select:
            type: select_ast_nodes
            # $ERR matches the error variable name and ensures it's used in the catch block
            query: |
                try { $$$ } catch ($ERR) { $$CATCH_BODY }
            language: 'typescript'
        assert:
            type: assert_property
            property_path: 'text'
            expected_value: '$ERR'  # Ensures the error is referenced
            operator: 'includes'
```

#### Multi Meta Variables for Flexible Matching

```yaml
id: no-console-in-production
description: Prevent console statements with any number of arguments
rule:
    type: for_each
    select:
        type: select_files
        path_pattern: 'src/**/*.{js,ts}'
        exclude_pattern: '**/*.test.*'
    assert:
        type: for_each
        select:
            type: select_ast_nodes
            query: 'console.$METHOD($$ARGS)'  # Matches console.log(...), console.error(...), etc.
            language: 'javascript'
        assert:
            type: assert_match
            pattern: '.'
            should_match: false
            message: 'Remove console statements from production code'
```

### Check for Required Features (Absolute Validation)

```yaml
id: ensure-logging-configured
description: Verify logging is properly configured in the application
rule:
    type: for_each
    select:
        type: select_files
        path_pattern: '**/config/logger.ts'
        select_all: true # Check all files, not just changed ones
    assert:
        type: all_of
        rules:
            - type: assert_match
              pattern: 'winston|pino|bunyan'
              message: Logger configuration must use a proper logging library
            - type: assert_match
              pattern: 'createLogger|getLogger'
              message: Logger must be properly initialized
```

This example uses `select_all: true` to validate that certain features exist in the codebase regardless of what files have changed. This is useful for enforcing architectural requirements or ensuring critical configurations are in place.

## CLI Usage

### Check Command

```bash
codeguardian check [options]

Configuration Options:
  -c, --config   Path to rule configuration file or glob pattern [optional]
                 (auto-discovers if not provided)
  -e, --exclude  Glob patterns to exclude from config file search [array]

Repository Options:
  -r, --repo     Repository path                          [default: "."]
  -b, --base     Base branch for comparison               [default: "main"]
      --head     Head branch for comparison               [default: "HEAD"]

Output Options:
  -f, --format   Output format (console/json)             [default: "console"]

  -h, --help     Show help
```


### Analysis Modes

Code Guardian can analyze your codebase in different ways:

1. **Committed Changes** (default): Compare two Git branches
   ```bash
   # Compare feature branch with main
   codeguardian check -b main --head feature-branch
   ```

2. **Uncommitted Changes**: Analyze staged and unstaged modifications
   ```bash
   # Check changes in working directory against HEAD
   codeguardian check -b HEAD
   
   # Check staged changes against main
   codeguardian check -b main --head HEAD
   ```

3. **Deep Source Analysis**: Analyze entire codebase using `select_all: true`
   ```yaml
   # In your rule file:
   select:
     type: select_files
     path_pattern: '**/*.ts'
     select_all: true  # Analyzes all files, not just changes
   ```

### Configuration File Discovery

Code Guardian supports multiple ways to specify configuration files:

1. **Auto-discovery** (no --config flag): Automatically searches for:

    - `*.codeguardian.yaml`, `*.codeguardian.yml`
    - `*.cg.yaml`, `*.cg.yml`
    - `.codeguardian.yaml`, `.codeguardian.yml`
    - `.cg.yaml`, `.cg.yml`
    - `.codeguardian/*.yaml`, `.codeguardian/*.yml`
    - `.codeguardian/*.cg.yaml`, `.codeguardian/*.codeguardian.yaml`

2. **Specific file**: `codeguardian check -c my-rules.yaml`

3. **Glob pattern**: `codeguardian check -c "rules/*.yaml"`

### Multiple Configuration Files

When multiple configuration files are found, Code Guardian evaluates each file separately and reports results for each one. This allows you to:

- See which specific configuration file has violations
- Organize rules into logical groups (e.g., security.yaml, architecture.yaml)
- Get detailed feedback for each rule set

```bash
# Auto-discover and check all config files
codeguardian check

# Use glob pattern to check specific files
codeguardian check -c "rules/*.cg.yaml"

# Exclude test and vendor directories
codeguardian check --exclude "**/test/**" "**/vendor/**"
```

**Note:** Code Guardian analyzes the Git diff between the base branch and head branch/commit. Only files that have been added, modified, deleted, or renamed in this diff will be validated. This ensures efficient validation focused on actual changes rather than the entire codebase.

## Rule Configuration Schema

```yaml
id: <rule-id>
description: <description>
rule:
    type: <rule-type>
    # Rule-specific configuration
```

### File Selector

```yaml
type: select_files
path_pattern: '**/*.js' # Glob pattern to match against changed files
status: ['added', 'modified'] # Filter by Git status (added/modified/deleted/renamed)
exclude_pattern: '**/*.test.js' # Exclude files matching this pattern
select_all: false # If true, selects from all files in repo (not just diff)
```

The file selector operates on files from the Git diff between base and head branches by default. It uses minimatch for glob pattern matching. When `select_all` is set to `true`, it will select from all files in the repository, which is useful for validating that certain features or patterns exist in the codebase regardless of recent changes.

### Line Selector

```yaml
type: select_lines
pattern: 'TODO' # Regex pattern
flags: 'i' # Regex flags
include_context: 2 # Context lines
```

### AST Node Selector

```yaml
type: select_ast_nodes
query: 'function_declaration' # AST query
language: 'typescript' # Language
```

### Match Assertion

```yaml
type: assert_match
pattern: 'console\.log' # Regex pattern
should_match: false # Expected result
```

### Count Assertion

```yaml
type: assert_count
condition: '>=' # Comparison operator
value: 1 # Expected value
```

### Property Assertion

```yaml
type: assert_property
property_path: 'status' # Property path
expected_value: 'added' # Expected value
operator: '==' # Comparison operator
```

## Generating Rules with AI

Code Guardian provides a comprehensive [Cheat Sheet](Cheat_Sheet.md) that serves as both a reference guide and a foundation for AI-assisted rule generation. This document contains detailed information about all available selectors, assertions, combinators, and common patterns.

### Two Approaches for Rule Generation

#### 1. Manual Reference
Read the [Cheat Sheet](Cheat_Sheet.md) to understand how to write rules directly. The cheat sheet includes:
- Complete syntax reference for all rule types
- Common patterns and examples
- Best practices for different validation scenarios
- Special notes for task validation rules

#### 2. AI-Assisted Generation
Use the Cheat Sheet content with AI tools to generate rules automatically:

1. **Prepare your context**: Use a tool like [Repomix](https://repomix.com/) to generate a comprehensive summary of your codebase
2. **Create your prompt**: Combine:
   - The full content of [Cheat_Sheet.md](Cheat_Sheet.md)
   - Your codebase information (from Repomix or similar)
   - Your specific validation requirements
3. **Generate rules**: Ask your preferred AI (Claude, ChatGPT, etc.) to create Code Guardian rules based on your requirements

### Example AI Prompt Structure

```
Here's the Code Guardian rule syntax guide:
[paste Cheat_Sheet.md content]

Here's my codebase structure:
[paste Repomix output or codebase summary]

Please generate a Code Guardian rule that:
- Ensures no console.log statements in production code
- Validates that all async functions have try-catch blocks
- Enforces that domain layer doesn't import from infrastructure
```

### Tips for Effective Rule Generation

- **Be specific**: Clearly describe what you want to validate
- **Provide context**: Include relevant code examples or architectural decisions
- **Start simple**: Begin with basic rules and gradually add complexity
- **Test iteratively**: Generate, test, and refine your rules
- **Use task validation**: For temporary validation of specific implementations, remember to use `select_all: true`

## License

MIT
