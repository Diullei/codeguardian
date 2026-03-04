# CodeGuardian DSL Reference

Rules are YAML. Top level: `id` (required), `description` (optional), `rule` (the tree). Primitives: **selectors** (what to check), **assertions** (condition), **combinators** (logic). Common pattern: `for_each` with `select` + `assert`.

## Basic rule structure

```yaml
id: unique-rule-id
description: What this rule does.
rule:
  type: for_each
  select:
    type: select_files
    path_pattern: 'src/**/*.ts'
  assert:
    type: assert_match
    pattern: 'console\.log'
    should_match: false
```

## Modes and select_all

- **Modes** (CLI `--mode`): `diff` (changed files), `all`, `staged`.
- **select_all** (in rule): When `true`, validate against entire repo regardless of mode. Use for critical/absolute protection rules.

## Selectors

### select_files

```yaml
type: select_files
path_pattern: 'src/**/*.ts'   # Required. Glob.
status: ['added', 'modified'] # Optional. added|modified|deleted|renamed.
exclude_pattern: '**/*.test.ts'
select_all: false             # true = entire repo
```

### select_file_changes

Select by % of lines changed.

```yaml
type: select_file_changes
min_percentage: 10
max_percentage: 50
```

### select_lines

Lines matching a regex (inside a for_each that selected a file).

```yaml
type: select_lines
pattern: 'console\.(log|warn)'
flags: 'i'
```

### select_ast_nodes

AST nodes via ast-grep. Languages: `typescript`, `javascript`, `tsx`, `html`, `css`.

```yaml
type: select_ast_nodes
query: 'eval($CODE)'
language: 'javascript'
```

### select_command_output

Run a command; result is one item for assertion.

```yaml
type: select_command_output
command: 'npm run build'
```

## Assertions

### assert_match

Regex on text. `should_match: true` (default) = fail if no match; `false` = fail if match.

```yaml
type: assert_match
pattern: 'dangerouslySetInnerHTML'
should_match: false
message: '...'
suggestion: '...'
documentation: 'https://...'
```

Use single-quoted patterns in YAML (e.g. `'console\.log'`).

### assert_count

Number of items from selector.

```yaml
type: assert_count
condition: '=='   # ==, !=, >, <, >=, <=
value: 0
```

### assert_property

Property of item (e.g. AST node or command result). No `message`/`suggestion` support.

```yaml
type: assert_property
property_path: 'stdout'
expected_value: 50000
operator: '<='    # ==, !=, >, <, >=, <=, includes, matches
extract_pattern: 'Total Tokens: ([\d,]+)'   # Optional; first capture used
```

### assert_line_count

Line count vs a limit.

```yaml
type: assert_line_count
operator: '<='
max_lines: 450
message: '...'
suggestion: '...'
```

### assert_command_output

Use with `select_command_output`. Check exit code or stdout/stderr.

```yaml
# Exit code
type: assert_command_output
target: 'exitCode'
condition: '=='
value: 0

# Stdout/stderr
type: assert_command_output
target: 'stdout'
pattern: 'Build successful'
should_match: true
first_lines: 10   # or last_lines (not both)
```

### Message and Suggestion

- **message**: Custom failure line (where supported): `assert_match`, `assert_line_count`, `assert_command_output`. Not on `assert_property`.
- **suggestion**: Shown as "Suggestion: ..." in output. Short, actionable text.

## Combinators

### for_each

Apply assertion to each selected item.

```yaml
type: for_each
select: { ... }
assert: { ... }
```

### all_of (AND)

All nested rules must pass.

```yaml
type: all_of
rules:
  - type: assert_match
    pattern: 'a'
  - type: assert_match
    pattern: 'b'
```

### any_of (OR)

At least one nested rule passes.

```yaml
type: any_of
rules: [ ... ]
```

### none_of (NOR)

No nested rule may pass.

```yaml
type: none_of
rules: [ ... ]
```

## Example patterns

**No console.log in changed JS/TS:**

```yaml
id: no-console-log
rule:
  type: for_each
  select:
    type: select_files
    path_pattern: 'src/**/*.{js,ts}'
    status: ['added', 'modified']
  assert:
    type: assert_match
    pattern: 'console\.log'
    should_match: false
```

**Max line count:**

```yaml
id: go-file-size-limit
rule:
  type: for_each
  select:
    type: select_files
    path_pattern: '**/*.go'
  assert:
    type: assert_line_count
    operator: '<='
    max_lines: 450
    suggestion: 'Break into smaller modules'
```

**Build must succeed:**

```yaml
id: build-must-succeed
rule:
  type: for_each
  select:
    type: select_command_output
    command: 'npm run build'
  assert:
    type: assert_command_output
    target: 'exitCode'
    condition: '=='
    value: 0
```

For full examples and AST patterns, see the project `Cheat_Sheet.md`.
