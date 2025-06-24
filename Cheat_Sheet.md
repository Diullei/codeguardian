# Code Guardian Rule Writing Cheat Sheet

This document is a quick reference for creating validation rules using Code Guardian's YAML-based configuration.

## Validation Modes

### 🎯 Understanding Modes vs select_all

**Modes** control what files Code Guardian can see:
- `--mode=diff` (default) - Only files changed between branches
- `--mode=all` - ALL files in working directory (including untracked)
- `--mode=staged` - Only files in Git staging area

**select_all** in rules controls the validation scope:
- `select_all: false` (default) - Validate against mode's file list
- `select_all: true` - Always validate against entire repository

### Mode Quick Reference

| Mode | Command | What it checks | Use case |
|------|---------|----------------|----------|
| diff | `codeguardian check` | Changed files between branches | CI/CD, PR reviews |
| all | `codeguardian check --mode=all` | Everything including untracked | Catch violations early |
| staged | `codeguardian check --mode=staged` | Staged files only | Pre-commit hooks |


## Protection Levels

### 🛡️ Protective Rules (Absolute Protection)
Use `select_all: true` to enforce critical standards across the **entire codebase**:
- **When to use**: Runtime safety, security patterns, project standards, compliance
- **Behavior**: Checks all repository files regardless of mode or Git changes
- **Example use cases**: No yarn.lock, no eval(), no secrets, required licenses
- **Recommended**: Run with `--mode=all` to catch untracked violations

### 📈 Development Rules (Progressive Protection)  
Use diff-based checking (default) for incremental improvements:
- **When to use**: Code patterns, architecture rules, style conventions
- **Behavior**: Checks files based on mode selection
- **Example use cases**: Naming conventions, import restrictions, code patterns



### 1. Core Concept

Code Guardian rules are built by composing three types of primitives:

- **Selectors**: Find _what_ to check (files, lines, code structures).
- **Assertions**: Define the _condition_ to check against an item.
- **Combinators**: Provide the _logic_ to structure and combine rules.

The most common pattern is `for_each` (a combinator) which takes a `select` block and applies an `assert` block to each item found.

### 2. Basic Rule Structure (`.cg.yaml`)

All rules start with a standard YAML structure.

```yaml
id: unique-rule-identifier
description: A clear explanation of what this rule does.
# The 'rule' key is optional; you can define the type directly at the top level.
rule:
    type: <combinator_type | for_each>
    # ... rule configuration
```

---

### 3. Selectors (Finding _What_ to Check)

#### `select_files`

Selects files from the Git diff based on path, status, and exclusion patterns. Can also select from all files in the repository.

```yaml
type: select_files
path_pattern: 'src/**/*.ts' # Required. Glob pattern for file paths.
status: ['added', 'modified'] # Optional. Filters by Git status.
exclude_pattern: '**/*.test.ts' # Optional. Glob pattern to exclude files.
select_all: false # Optional. If true, selects from all files (not just diff).
```

- **Available Statuses**: `added`, `modified`, `deleted`, `renamed`.
- **`select_all`**: When `true`, ignores Git diff and selects from all files in the repository. Useful for validating that certain features or patterns exist in the codebase regardless of recent changes.

#### `select_file_changes`

Selects files based on the percentage of lines changed (added + deleted) relative to the file's total size. Useful for detecting files with significant modifications or enforcing change limits.

```yaml
type: select_file_changes
min_percentage: 10 # Optional. Minimum change percentage (inclusive).
max_percentage: 50 # Optional. Maximum change percentage (inclusive).
```

- **Change Calculation**: `((insertions + deletions) / total_lines) * 100`
- **Use Cases**: 
  - Prevent large changes to critical files (e.g., config files shouldn't change more than 10%)
  - Detect files that are mostly rewritten (e.g., flag files that are >90% changed)
  - Ensure incremental changes (e.g., no file should change more than 50% in a single commit)

#### `select_lines`

Selects lines within a file's content that match a regular expression. Used inside a `for_each` that has selected a file.

```yaml
type: select_lines
pattern: 'console\.(log|warn)' # Required. Regular expression to find lines.
flags: 'i' # Optional. Regex flags (e.g., 'g', 'i', 'm').
```

#### `select_ast_nodes`

Selects Abstract Syntax Tree (AST) nodes using powerful `ast-grep` patterns. Used inside a `for_each` that has selected a file.

```yaml
type: select_ast_nodes
query: 'async_function' # Required. An ast-grep compatible pattern.
language: 'typescript' # Required. The language to parse.
```

- **Supported Languages**: `typescript`, `javascript`, `tsx`, `html`, `css`.
- **`query`**: Refer to [ast-grep playground](https://ast-grep.github.io/playground.html) to craft queries.


## AST Pattern Syntax (Quick Reference)

- **Basic**: `query: 'console.log($MSG)'` - Matches single argument
- **Multi**: `query: 'console.log($$ARGS)'` - Matches any number of arguments  
- **Reuse**: `query: '$VAR == $VAR'` - Same variable must match same content
- **Examples**:
  ```yaml
  query: 'eval($CODE)'  # Detect eval usage
  query: 'async $FUNC($$) { $$$ }'  # Find async functions
  query: '$DB.query($QUERY + $VAR)'  # Detect SQL injection risk
  ```

---

### 4. Assertions (Checking a Condition)

#### `assert_match`

Checks if an item's text content matches a regular expression.

```yaml
type: assert_match
pattern: 'dangerouslySetInnerHTML' # Required. Regular expression.
should_match: false                # Optional. `false` to fail on match. Defaults to `true`.
suggestion: 'Avoid using dangerouslySetInnerHTML. Use React's children prop instead.' # Optional. Displayed when rule fails.
documentation: 'https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml' # Optional. URL for more info.
```

**Important Notes:**
- The `suggestion` field provides actionable guidance when a rule fails
- It appears in the console output as "Suggestion: [your message]"
- Keep suggestions concise and actionable (e.g., "Move to src/utils/" not "This file is in the wrong place")
- The `documentation` field can provide a URL for detailed explanations

**Example Output with Suggestion:**
```
> test.sh
[CHECK FAIL] Expected file content NOT to match pattern '.*' but it did

  Suggestion: Move shell scripts to scripts/ or bin/ directory
```

**⚠️ Regex in YAML**: Use single quotes to avoid escaping issues:
```yaml
pattern: 'console\.log'      # Correct: \. for literal dot
pattern: 'package\.json'     # Literal dot
pattern: 'array\[0\]'        # Literal brackets
```

#### `assert_count`

Checks the number of items returned by a selector.

```yaml
type: assert_count
condition: '==' # Required. See operators below.
value: 0 # Required. The number to compare against.
```

- **`condition` operators**: `==`, `!=`, `>`, `<`, `>=`, `<=`.

#### `assert_property`

Checks a property of a selected item (often an AST node or command output). Can also extract a value from a string using a regex pattern before comparison.

```yaml
type: assert_property
property_path: 'stdout' # Required. Path to the property (e.g., 'user.name', 'stdout').
expected_value: 50000 # Required. The value to compare against.
operator: '<=' # Optional. Defaults to '=='. See operators below.
extract_pattern: 'Total Tokens: ([\d,]+)' # Optional. Regex with a capture group to extract a value from a string.
```

- **`extract_pattern`**: If provided, this regex is run against the string found at `property_path`. The value from the **first capture group** `(...)` is used for the comparison. This is extremely powerful for validating metrics from unstructured command-line output.

- **`operator` options**:
    - `==`, `!=`, `>`, `<`, `>=`, `<=` (standard comparisons, will cast to Number for numeric checks)
    - `includes` (for strings and arrays)
    - `matches` (for checking a string against a regex `expected_value`)

#### `assert_line_count`

Validates the number of lines in files or text content. Useful for enforcing maximum file size limits to maintain code quality and readability.

```yaml
type: assert_line_count
operator: '<=' # Required. Comparison operator: ==, !=, >, <, >=, <=
max_lines: 450 # Required. The line count to compare against (can also use expected_value)
message: 'Custom error message' # Optional. Override default message
suggestion: 'Consider breaking this file into smaller modules' # Optional. Actionable guidance
documentation: 'https://example.com/coding-standards' # Optional. Reference URL
```

- **Line Counting Rules**:
  - Counts all non-empty lines including comments and whitespace-only lines
  - Ignores trailing empty lines for accurate counting
  - Works with string content, objects with `content`/`text` properties, or direct `lineCount` values

- **Common Use Cases**:
  - Enforce maximum file size limits (e.g., Go files ≤ 450 lines)
  - Prevent overly large functions or classes
  - Maintain code review-friendly file sizes

---

### 5. Combinators (Logic & Structure)

#### `for_each` (The Workhorse)

Applies an assertion to every item returned by a selector.

```yaml
type: for_each
select:
    # ... selector configuration ...
assert:
    # ... assertion or nested combinator configuration ...
```

#### `all_of` (AND)

Passes only if **all** nested rules pass. It short-circuits on the first failure.

```yaml
type: all_of
rules:
    - { type: ..., ... }
    - { type: ..., ... }
```

#### `any_of` (OR)

Passes if **at least one** of the nested rules passes. It short-circuits on the first success.

```yaml
type: any_of
rules:
    - { type: ..., ... }
    - { type: ..., ... }
```

#### `none_of` (NOR)

Passes only if **none** of the nested rules pass. Fails on the first rule that passes.

```yaml
type: none_of
rules:
    - { type: ..., ... }
    - { type: ..., ... }
```

---

### 6. Common Patterns

#### Pattern 1: Check File Content

_For each modified JS/TS file, ensure `console.log` is not present._

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

#### Pattern 2: Check AST Nodes Within Files

_For each new Typescript file, ensure every `async` function contains a `try...catch` block._

```yaml
id: async-try-catch
rule:
    type: for_each
    select:
        type: select_files
        path_pattern: '**/*.ts'
        status: ['added']
    assert: # This assertion is applied to each file's content
        type: for_each
        select: # Selects AST nodes within the file
            type: select_ast_nodes
            query: 'async_function' # ast-grep query
            language: 'typescript'
        assert: # This assertion is applied to each AST node found
            type: assert_property
            property_path: 'text'
            expected_value: 'try' # Checks if the function's text includes 'try'
            operator: 'includes'
```

#### Pattern 3: Multi-Condition Validation

_Enforce architectural boundaries: domain layer cannot import from infrastructure or adapters._

```yaml
id: clean-architecture-domain
rule:
    type: for_each
    select:
        type: select_files
        path_pattern: 'src/domain/**/*.ts'
    assert:
        type: none_of # Fail if ANY of these patterns match
        rules:
            - type: assert_match
              pattern: 'from\s+["''](.*)/infrastructure'
            - type: assert_match
              pattern: 'from\s+["''](.*)/adapters'
```

#### Pattern 4: Absolute Validation (Task & Feature Verification)

_Check features exist regardless of changes. Use `select_all: true` for task validation._

```yaml
id: validate-feature-exists
rule:
  type: for_each
  select:
    type: select_files
    path_pattern: 'src/cli/index.ts'
    select_all: true  # ← Check all files, not just changed
  assert:
    type: assert_match
    pattern: '--skip-missing-ast-grep'
    message: 'CLI must implement the new flag'
```

#### Pattern 5: Deny New File Creation

_Prevent tasks from creating new files when they should only modify existing ones._

```yaml
# Example 1: Deny ALL new files
id: deny-new-files
rule:
  type: for_each
  select:
    type: select_files
    path_pattern: '**/*'
    status: ['added']  # Select only newly added files
  assert:
    type: assert_match
    pattern: '.*'
    should_match: false  # Fail if any new file is found
    message: 'New files are not allowed. This task should only modify existing files.'

```

**Use Case:** Perfect for tasks that should only refactor, fix bugs, or update existing functionality without adding new files. This helps enforce that AI-generated code stays within the intended scope of changes.

#### Pattern 6: Control File Change Magnitude

_Enforce limits on how much files can change to prevent large rewrites or ensure incremental updates._

```yaml
# Example 1: Prevent large changes to critical files
id: limit-config-changes
rule:
  type: for_each
  select:
    type: select_file_changes
    max_percentage: 10  # Select files changed more than 10%
  assert:
    type: assert_match
    pattern: 'package\.json|tsconfig\.json|\.env'
    should_match: false
    message: 'Critical configuration files should not change more than 10% in a single commit'

```

**Use Case:** Essential for maintaining code stability, preventing AI from completely rewriting files, and ensuring changes are reviewable. Particularly useful for protecting critical configuration files and enforcing incremental development practices.

#### Pattern 7: File Size Validation

_Enforce maximum line count limits to maintain readable and maintainable code._

```yaml
# Example 1: Enforce Go file line limits
id: go-file-size-limit
description: Go files should not exceed 450 lines for maintainability
rule:
  type: for_each
  select:
    type: select_files
    path_pattern: '**/*.go'
  assert:
    type: assert_line_count
    operator: '<='
    max_lines: 450
    message: "Go file exceeds maximum line limit of 450 lines"
    suggestion: "Consider breaking this file into smaller modules or extracting functionality"

# Example 2: Multiple language file size limits
id: file-size-limits
description: Enforce different line limits per language
rule:
  type: all_of
  rules:
    - type: for_each
      select:
        type: select_files
        path_pattern: '**/*.go'
      assert:
        type: assert_line_count
        operator: '<='
        max_lines: 450
    - type: for_each
      select:
        type: select_files
        path_pattern: '**/*.{ts,js}'
      assert:
        type: assert_line_count
        operator: '<='
        max_lines: 300
        suggestion: "TypeScript/JavaScript files should be under 300 lines"
```

**Use Case:** Prevents overly large files that are hard to review, maintain, and understand. Encourages modular code organization and helps teams maintain consistent code quality standards.

---

### 7. Advanced AST Pattern Examples

#### Detect Missing Error Handling in Async Functions

```yaml
id: async-without-try-catch
description: Async functions should have proper error handling
rule:
  type: for_each
  select:
    type: select_files
    path_pattern: '**/*.{ts,js}'
  assert:
    type: for_each
    select:
      type: select_ast_nodes
      query: |
        async function $NAME($$PARAMS) {
          $$$BODY
        }
      language: 'typescript'
    assert:
      type: assert_property
      property_path: 'text'
      expected_value: 'try'
      operator: 'includes'
      message: 'Async function $NAME should include try-catch error handling'
```




#### Enforce Secure Database Queries

```yaml
id: no-sql-injection
description: Prevent SQL injection vulnerabilities
rule:
  type: for_each
  select:
    type: select_files
    path_pattern: '**/*.{js,ts}'
  assert:
    type: none_of
    rules:
      # Direct string concatenation in queries
      - type: for_each
        select:
          type: select_ast_nodes
          query: '$DB.query($QUERY + $VAR)'
          language: 'javascript'
        assert:
          type: assert_match
          pattern: '.'
          should_match: true
          message: 'Never concatenate variables into SQL queries'
      
      # Template literals with variables
      - type: for_each
        select:
          type: select_ast_nodes
          query: '$DB.query(`$$$BEFORE${$VAR}$$$AFTER`)'
          language: 'javascript'
        assert:
          type: assert_match
          pattern: '.'
          should_match: true
          message: 'Use parameterized queries instead of template literals'
```

---

### 8. Command Execution Rules

These rules allow you to run shell commands and validate their output, which is useful for checking build scripts, test runners, or other CLI tools.

#### `select_command_output` (Selector)

Executes a shell command and provides its result as a single item for validation.

```yaml
type: select_command_output
command: 'npm run build' # Required. The command to execute.
```

#### `assert_command_output` (Assertion)

Checks the result of a command executed by `select_command_output`.

```yaml
type: assert_command_output
target: 'exitCode' # Required. What to check: 'exitCode', 'stdout', or 'stderr'.
# --- For target: 'exitCode' ---
condition: '=='    # Required. Comparison operator.
value: 0           # Required. The number to compare against.

# --- For target: 'stdout' or 'stderr' ---
pattern: 'Build successful' # Required. Regex pattern to match.
should_match: true        # Optional. Defaults to true.
first_lines: 10           # Optional. Check only the first N lines.
last_lines: 10            # Optional. Check only the last N lines.
```
- **Note:** `first_lines` and `last_lines` cannot be used together.

#### Pattern: Checking a Build Script

_Ensure the `npm run build` command completes successfully and outputs "Build successful"._

```yaml
id: validate-build-script
rule:
  type: for_each
  select:
    type: select_command_output
    command: 'npm run build'
  assert:
    type: all_of
    rules:
      - type: assert_command_output
        target: 'exitCode'
        condition: '=='
        value: 0
        suggestion: 'The build script failed. Check the build logs for errors.'

      - type: assert_command_output
        target: 'stdout'
        pattern: 'Build successful|Finished'
        last_lines: 5 # Check for success message in the last 5 lines of output
        suggestion: 'Build completed but success message was not found in output.'
```


#### Pattern: Extracting and Validating a Metric from Command Output

_Run a command and validate that the "Total Tokens" reported in its `stdout` is less than or equal to 50,000._

This example directly solves the use case of extracting a numeric value from command output using `assert_property` with `extract_pattern`.

```yaml
id: validate-token-limit
description: Ensure the packed output does not exceed the token limit.
rule:
  type: for_each
  select:
    # First, run the command to get the output
    type: select_command_output
    command: 'npx repomix pack' # Your example command
  assert:
    # Now, assert against the 'stdout' property of the command's result
    type: assert_property
    property_path: 'stdout' # Target the standard output string
    
    # This regex finds the line and captures the number (including commas)
    extract_pattern: 'Total Tokens:\s*([\d,]+)'
    
    # Perform a numerical comparison on the extracted value
    operator: '<='
    expected_value: 50000
    suggestion: 'The total token count has exceeded the 50,000 limit.'
```


###### Pattern 8: Prevent Files with Specific Naming Patterns

_Detect and fail when files with certain suffixes exist (e.g., `_improved`, `_enhanced`, `_copy`)._

This pattern is useful for preventing AI agents from creating alternative versions of files instead of updating the original.

```yaml
# Example 1: Fail if any *_improved.* files exist
id: no-improved-files
description: Prevent alternative file versions
rule:
  type: none_of
  rules:
    - type: for_each
      select:
        type: select_files
        path_pattern: '**/*_improved.*'
      assert:
        type: assert_match
        pattern: '.*'
        should_match: true
        message: 'Found file with "_improved" suffix. Please update the original file instead.'

# Example 2: Check in --mode all (for existing files)
# Run with: codeguardian check --mode all
id: no-alternative-versions
description: Detect any alternative file versions in the entire codebase
rule:
  type: none_of
  rules:
    - type: for_each
      select:
        type: select_files
        path_pattern: '**/*[-_](improved|enhanced|new|v2|copy|backup|old)\.*'
      assert:
        type: assert_match
        pattern: '.*'
        should_match: true
        message: 'Found alternative file version. Update the original file instead of creating duplicates.'
```

**Important Note about `assert_count` with `for_each`:**
The `assert_count` assertion counts items within each file separately when used inside `for_each`. It does NOT count the total number of files selected. To check if ANY files match a pattern, use the `none_of` combinator pattern shown above.

```yaml
# WRONG - This won't work as expected:
type: for_each
select:
  type: select_files
  path_pattern: '**/*_improved.*'
assert:
  type: assert_count
  condition: '=='
  value: 0  # This checks count WITHIN each file, not file count

# CORRECT - Use none_of pattern:
type: none_of
rules:
  - type: for_each
    select:
      type: select_files
      path_pattern: '**/*_improved.*'
    assert:
      type: assert_match
      pattern: '.*'
      should_match: true
```

# Pattern: Validating Import Locations

_Ensure that files importing specific packages are only located in allowed directories._

This example shows how to restrict where certain imports can be used based on file paths:

```yaml
id: restrict-openai-imports
description: Only infrastructure layer can import openai-go package
rule:
  type: for_each
  select:
    type: select_files
    path_pattern: '**/*.go'
  assert:
    type: any_of  # Pass if either condition is true
    rules:
      # Option 1: File doesn't import openai-go at all
      - type: assert_match
        pattern: 'github\.com/sashabaranov/go-openai'
        should_match: false
      
      # Option 2: File imports openai-go AND is in allowed location
      - type: all_of
        rules:
          - type: assert_match
            pattern: 'github\.com/sashabaranov/go-openai'
            should_match: true
          - type: assert_property
            property_path: 'path'  # The file's path
            expected_value: 'pkg/infrastructure'
            operator: 'includes'
            message: 'OpenAI imports are only allowed in pkg/infrastructure/'
```


---

### 9. Running Your Rules

```bash
# Auto-discover *.cg.yaml / *.codeguardian.yaml files and check against main branch
codeguardian check

# Check a specific rule file against a different base branch
codeguardian check -c path/to/my-rule.yaml -b develop

# Use a glob pattern for rule files and get JSON output
codeguardian check -c "rules/**/*.yaml" --format=json
```
