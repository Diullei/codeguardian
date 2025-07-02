# Code Guardian Technical Guide

This document provides detailed technical information about Code Guardian's rule system and implementation.

## Rule System Architecture

Code Guardian is built on three core abstractions:

### 1. Rule Hierarchy

- **Selectors**: Find items to validate (files, lines, AST nodes)
- **Assertions**: Check properties of selected items
- **Combinators**: Compose rules using logical operations

All rules extend from `BaseRule` and implement the `Rule` interface with an `evaluate(context)` method.

### 2. Rule Composition Pattern

Rules are composed using a factory pattern. The most common pattern is:

```yaml
for_each -> select -> assert
```

Example: For each TypeScript file, assert no console.log statements exist.

### 3. Key Interfaces

- `EvaluationContext`: Carries repository, diff, cache through evaluation
- `RuleResult`: Standardized output with violations
- `RuleFactory`: Creates rules from YAML configuration

### 4. Git Integration

The `GitRepository` adapter provides diff information between branches (e.g., `main` and `HEAD`). Only files that have been added, modified, deleted, or renamed in this diff are available for validation. Files are loaded on-demand when assertions need content. This Git-aware approach ensures efficient validation focused on actual changes rather than scanning the entire repository.

## Rule Primitives

### Selectors

Selectors find and return items to validate:

- **select_files** - Select files by path pattern and status
  - By default: only selects files that have changed (added/modified/deleted/renamed)
  - With `select_all: true`: selects from all files in the repository
- **select_lines** - Select lines matching a pattern within file content
- **select_ast_nodes** - Select AST nodes using ast-grep queries
- **select_file_changes** - Select files based on percentage of lines changed
- **select_command_output** - Execute shell commands and capture their output (stdout, stderr, exit code)

### Assertions

Assertions check properties of selected items:

- **assert_match** - Check if text matches a pattern
- **assert_count** - Check the count of items
- **assert_property** - Check object properties (supports regex extraction from strings)
- **assert_command_output** - Validate command execution results (exit code, stdout, stderr)
- **assert_line_count** - Validate the number of lines in files or text content

### Combinators

Combinators compose rules using logical operations:

- **all_of** - All rules must pass (AND)
- **any_of** - At least one rule must pass (OR)
- **none_of** - No rules should pass (NOT)
- **for_each** - Apply assertion to each selected item

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
suggestion: 'Remove console.log statements' # Optional help text
documentation: 'https://example.com/docs' # Optional reference URL
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
extract_pattern: 'Total: (\d+)' # Optional regex extraction
```

### Line Count Assertion

```yaml
type: assert_line_count
operator: '<=' # Comparison operator: ==, !=, >, <, >=, <=
max_lines: 450 # The line count to compare against
message: 'Custom error message' # Optional
suggestion: 'Consider breaking this file into smaller modules' # Optional
documentation: 'https://example.com/coding-standards' # Optional
```

### Command Output Assertion

```yaml
type: assert_command_output
target: 'exitCode' # What to check: 'exitCode', 'stdout', or 'stderr'
# For exitCode:
condition: '==' # Comparison operator
value: 0 # Expected value
# For stdout/stderr:
pattern: 'Build successful' # Regex pattern
should_match: true # Expected result
first_lines: 10 # Check only first N lines
last_lines: 10 # Check only last N lines
```

## Important Implementation Notes

- **Assertions within Combinators**: Assertions cannot be evaluated directly - they must be used within a combinator (typically `for_each`)
- **File Content Loading**: The `ForEachRule` automatically loads file content when needed
- **Path Handling**: Always use absolute paths internally
- **AST Languages**: Currently supports TypeScript, JavaScript, TSX, HTML, CSS via `@ast-grep/napi`
- **Pattern Matching**: File patterns use minimatch glob syntax
- **Regex in YAML**: Use single quotes to avoid escaping issues
- **Directory Exclusion**: Place a `.cg-ignore` file in any directory to exclude it from configuration auto-discovery

## Mode vs select_all: Understanding the Difference

- **Mode** controls which files Code Guardian sees from your filesystem
- **select_all** in rules controls whether to check against the diff or all repository files

Example:
```yaml
# This rule with select_all: true ALWAYS checks all repository files
# regardless of the --mode flag
type: for_each
select:
  type: select_files
  path_pattern: 'yarn.lock'
  select_all: true  # Ignores mode, always checks if yarn.lock exists anywhere
```

## Directory Exclusion with .cg-ignore

Code Guardian automatically skips directories containing a `.cg-ignore` file when auto-discovering configuration files. This is useful for:

- **Example configurations** that shouldn't be enforced on the project
- **Test fixtures** with mock rules
- **Third-party code** with their own validation rules
- **Temporary** rule configurations

### Usage

Simply create an empty `.cg-ignore` file in any directory you want to exclude:

```bash
touch examples/.cg-ignore
```

The file content is not parsed - only its presence matters. The directory and all its subdirectories will be skipped during configuration discovery.

**Note**: This only affects auto-discovery. You can still explicitly specify configurations from ignored directories using the `-c` flag.

## AST Pattern Syntax

AST patterns use [ast-grep](https://ast-grep.github.io/) syntax:

- **Basic**: `query: 'console.log($MSG)'` - Matches single argument
- **Multi**: `query: 'console.log($$ARGS)'` - Matches any number of arguments  
- **Reuse**: `query: '$VAR == $VAR'` - Same variable must match same content
- **Examples**:
  ```yaml
  query: 'eval($CODE)'  # Detect eval usage
  query: 'async $FUNC($$) { $$$ }'  # Find async functions
  query: '$DB.query($QUERY + $VAR)'  # Detect SQL injection risk
  ```

For more examples and patterns, see the [Cheat Sheet](../Cheat_Sheet.md).