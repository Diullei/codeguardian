# Code Guardian Rule Writing Cheat Sheet

This document is a quick reference for creating validation rules using Code Guardian's YAML-based configuration.

## ⚠️ Important: Task Implementation Validation

When creating temporary validation rules to verify that a task has been implemented correctly (e.g., checking if a new feature was added), **you must use `select_all: true`** in your file selectors. This ensures the validation checks all files in the repository, not just modified files in the current diff.

### Critical: Protecting Folders During Task Validation

When validating tasks, it's **extremely important** to create rules that protect folders and files that should not be modified. This prevents unintended changes to critical parts of your codebase.

**Example Protection Rules:**

```yaml
# protect-critical-folders.cg.yaml
id: protect-critical-folders
description: Ensure no changes are made to protected directories
rule:
  type: none_of
  rules:
    # Protect test files from being modified
    - type: for_each
      select:
        type: select_files
        path_pattern: 'tests/**/*'
        status: ['modified', 'deleted']
      assert:
        type: assert_match
        pattern: '.*'
        should_match: true
        message: 'Test files should not be modified during this task'
    
    # Protect configuration files
    - type: for_each
      select:
        type: select_files
        path_pattern: '{package.json,tsconfig.json,*.config.js}'
        status: ['modified']
      assert:
        type: assert_match
        pattern: '.*'
        should_match: true
        message: 'Configuration files should not be modified'
    
    # Protect documentation
    - type: for_each
      select:
        type: select_files
        path_pattern: '{*.md,docs/**/*}'
        status: ['modified', 'added', 'deleted']
      assert:
        type: assert_match
        pattern: '.*'
        should_match: true
        message: 'Documentation should not be changed in this task'
```

**Best Practices for Task Validation:**

1. **Always include protection rules** alongside your validation rules
2. **Be specific** about which folders/files can be modified
3. **Use exclude patterns** when appropriate:

```yaml
# Allow changes only in specific folders
id: restrict-changes-to-src
rule:
  type: for_each
  select:
    type: select_files
    path_pattern: '**/*'
    exclude_pattern: 'src/features/new-feature/**/*'
    status: ['modified', 'added']
  assert:
    type: assert_match
    pattern: '.*'
    should_match: false
    message: 'Changes should only be made in src/features/new-feature/'
```

**Example Complete Task Validation:**

```yaml
# task-validation.cg.yaml
id: validate-feature-implementation
rule:
    type: for_each
    select:
        type: select_files
        path_pattern: 'src/core/auth.ts'
        select_all: true # ← REQUIRED for task validation!
    assert:
        type: assert_match
        pattern: 'validateApiKey'
        message: 'The auth module must implement validateApiKey function'
```

Without `select_all: true`, the validation might pass incorrectly because it would only check files that were modified in the current git diff.

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

##### Pattern Syntax Guide

**Basic Pattern Matching**
Patterns match through the full syntax tree, including nested expressions:
```yaml
# Pattern: a + 1
# Matches all of these:
#   const b = a + 1
#   funcCall(a + 1)
#   deeplyNested({ target: a + 1 })
query: 'a + 1'
```

**Meta Variables (Single Node Matching)**
Use `$` followed by uppercase letters, underscore, or digits to match any single AST node:
```yaml
# Valid meta variables: $META, $META_VAR, $META_VAR1, $_, $_123
# Invalid: $invalid, $value, $123, $KEBAB-CASE

# Pattern
query: 'console.log($MSG)'

# Matches:
#   console.log('Hello World')
#   console.log(variable)
#   console.log(1 + 2)
# Does NOT match:
#   console.log()           # no argument
#   console.log(a, b)       # too many arguments
```

**Multi Meta Variables (Zero or More Nodes)**
Use `$$` to match zero or more AST nodes:
```yaml
# Pattern for function calls with any number of arguments
query: 'console.log($$ARGS)'

# Matches:
#   console.log()                      # zero arguments
#   console.log('hello')               # one argument
#   console.log('debug:', key, value)  # multiple arguments
#   console.log(...args)               # spread operator

# Pattern for function definitions
query: 'function $NAME($$PARAMS) { $$BODY }'

# Matches:
#   function foo() {}
#   function bar(a, b, c) { return a + b + c }
```

**Meta Variable Capturing (Reuse Variables)**
Same-named meta variables must match the same content:
```yaml
# Pattern
query: '$VAR == $VAR'

# Matches:
#   a == a
#   (x + 1) == (x + 1)
# Does NOT match:
#   a == b
#   x == y
```

**Non-Capturing Variables (Performance Optimization)**
Variables starting with `_` are not captured and can match different content:
```yaml
# Pattern
query: '$_FUNC($_ARG)'

# Matches (each $_FUNC can be different):
#   test(a)
#   foo(bar)
#   different(functions)
```

**Advanced Patterns**

```yaml
# Match try-catch blocks with specific error handling
query: |
  try {
    $$$TRY_BODY
  } catch ($ERROR) {
    $$$CATCH_BODY
  }

# Match arrow functions with specific patterns
query: '($PARAM) => $BODY'

# Match object destructuring
query: 'const { $PROP, $$REST } = $OBJ'

# Match class methods
query: |
  class $CLASS {
    $METHOD($$PARAMS) {
      $$$BODY
    }
  }

# Match specific React patterns
query: 'useState($INITIAL)'
query: 'useEffect(() => { $$$ }, [$DEP])'
```

**Common Use Cases for AI Code Validation**

1. **Detect unsafe patterns**:
   ```yaml
   query: 'eval($CODE)'  # Detect eval usage
   query: 'innerHTML = $HTML'  # Detect potential XSS
   ```

2. **Enforce async/await patterns**:
   ```yaml
   query: 'async $FUNC($$) { $$$ }'  # Find async functions
   query: '$PROMISE.then($CALLBACK)'  # Find promises that should use await
   ```

3. **React best practices**:
   ```yaml
   query: 'this.setState($STATE)'  # Find class component state updates
   query: 'dangerouslySetInnerHTML={$HTML}'  # Find dangerous HTML usage
   ```

4. **Security patterns**:
   ```yaml
   query: 'process.env.$VAR'  # Find environment variable usage
   query: 'require($MODULE)'  # Find dynamic requires
   ```

---

### 4. Assertions (Checking a Condition)

#### `assert_match`

Checks if an item's text content matches a regular expression.

```yaml
type: assert_match
pattern: 'dangerouslySetInnerHTML' # Required. Regular expression.
should_match: false                # Optional. `false` to fail on match. Defaults to `true`.
suggestion: 'Avoid using dangerouslySetInnerHTML. Use React's children prop instead.' # Optional.
documentation: 'https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml' # Optional.
```

##### ⚠️ Important: Regex Pattern Escaping in YAML

When writing regex patterns in YAML, be careful with backslash escaping:

1. **Single-quoted strings** (Recommended for regex): Backslashes are preserved literally
   ```yaml
   pattern: 'console\.log'  # Correct: \. matches literal dot
   pattern: '\(mu\)'        # Correct: \( and \) match literal parentheses
   ```

2. **Double-quoted strings**: Backslashes need to be escaped
   ```yaml
   pattern: "console\\.log"  # Need double backslash
   pattern: "\\(mu\\)"      # Need double backslash for literal parentheses
   ```

3. **Common regex patterns that need escaping**:
   ```yaml
   # Literal dots
   pattern: 'package\.json'
   
   # Literal parentheses
   pattern: 'function\(arg1, arg2\)'
   
   # Special regex characters that need escaping: . ^ $ * + ? { } [ ] \ | ( )
   pattern: 'array\[0\]'     # Literal brackets
   pattern: 'price: \$100'   # Literal dollar sign
   pattern: 'C\+\+'          # Literal plus signs
   ```

4. **Complex patterns with multiple special characters**:
   ```yaml
   # Wrong - will cause YAML parsing errors:
   pattern: 'PyErr_SetString\(PyExc_ValueError, "Viscosity \(mu\) and Length \(L\) cannot be zero."\)'
   
   # Correct - properly escaped:
   pattern: 'PyErr_SetString\(PyExc_ValueError, "Viscosity \(mu\) and Length \(L\) cannot be zero\."\)'
   ```

**Pro tip**: Always use single quotes for regex patterns in YAML to avoid confusion with escaping. Test your patterns in a regex tester first, then paste them into single-quoted YAML strings.

#### `assert_count`

Checks the number of items returned by a selector.

```yaml
type: assert_count
condition: '==' # Required. See operators below.
value: 0 # Required. The number to compare against.
```

- **`condition` operators**: `==`, `!=`, `>`, `<`, `>=`, `<=`.

#### `assert_property`

Checks a property of a selected item (often an AST node).

```yaml
type: assert_property
property_path: 'text' # Required. Path to the property (e.g., 'user.name').
expected_value: 'try' # Required. The value to compare against.
operator: 'includes' # Optional. Defaults to '=='. See operators below.
```

- **`operator` options**:
    - `==`, `!=`, `>`, `<`, `>=`, `<=` (standard comparisons)
    - `includes` (for strings and arrays)
    - `matches` (for checking a string against a regex `expected_value`)

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

#### Pattern 4: Absolute Validation (Task Implementation & Feature Verification)

_Ensure critical features exist in the codebase, regardless of what has changed. Essential for task validation rules!_

```yaml
# Example 1: Validate a task implementation
id: validate-new-cli-feature
rule:
  type: for_each
  select:
    type: select_files
    path_pattern: 'src/cli/index.ts'
    select_all: true  # ← MUST use for task validation!
  assert:
    type: assert_match
    pattern: '--skip-missing-ast-grep'
    message: 'CLI must implement the new flag'

# Example 2: Ensure security features exist
id: validate-security-config
rule:
  type: for_each
  select:
    type: select_files
    path_pattern: '**/security.config.{ts,js}'
    select_all: true  # Check all files, not just changed ones
  assert:
    type: all_of
    rules:
      - type: assert_match
        pattern: 'helmet'
        message: 'Security config must use helmet middleware'
      - type: assert_match
        pattern: 'cors.*origin'
        message: 'CORS must be configured with origin restrictions'
      - type: assert_match
        pattern: 'rateLimit'
        message: 'Rate limiting must be configured'
```

**Key Point:** When validating task implementations, always use `select_all: true` to check the current state of files, not just what changed in the diff.

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

# Example 2: Deny new files except tests
id: deny-new-files-except-tests
rule:
  type: for_each
  select:
    type: select_files
    status: ['added']
    exclude_pattern: '**/*.test.*'  # Allow test files
  assert:
    type: assert_match
    pattern: '.*'
    should_match: false
    message: 'New files are not allowed except for test files.'

# Example 3: Deny new files in specific directories
id: deny-new-files-in-src
rule:
  type: for_each
  select:
    type: select_files
    path_pattern: 'src/**/*'
    status: ['added']
  assert:
    type: assert_match
    pattern: '.*'
    should_match: false
    message: 'New files in src/ are not allowed. Only modifications permitted.'
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

# Example 2: Flag files that are mostly rewritten
id: detect-file-rewrites
rule:
  type: for_each
  select:
    type: select_file_changes
    min_percentage: 80  # Select files that are 80%+ changed
  assert:
    type: assert_match
    pattern: '.*'
    should_match: true  # This will list all heavily modified files
    message: 'File has been significantly rewritten (>80% changed). Please review carefully.'

# Example 3: Ensure incremental changes only
id: enforce-incremental-updates
rule:
  type: assert_count
  select:
    type: select_file_changes
    min_percentage: 50  # Count files changed more than 50%
  condition: '=='
  value: 0
  message: 'All changes should be incremental. No file should change more than 50% in a single commit.'
```

**Use Case:** Essential for maintaining code stability, preventing AI from completely rewriting files, and ensuring changes are reviewable. Particularly useful for protecting critical configuration files and enforcing incremental development practices.

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

#### Enforce Consistent Import Patterns

```yaml
id: enforce-import-order
description: Ensure imports follow the project convention
rule:
  type: for_each
  select:
    type: select_files
    path_pattern: 'src/**/*.{ts,tsx}'
  assert:
    type: for_each
    select:
      type: select_ast_nodes
      # Match imports from internal modules
      query: 'import { $$IMPORTS } from "./$MODULE"'
      language: 'typescript'
    assert:
      type: assert_property
      property_path: 'loc.start.line'
      expected_value: 10
      operator: '>'
      message: 'Internal imports should come after external imports (line 10+)'
```

#### Prevent Hardcoded Secrets Using Advanced Patterns

```yaml
id: no-hardcoded-secrets-advanced
description: Detect various forms of hardcoded secrets
rule:
  type: for_each
  select:
    type: select_files
    path_pattern: '**/*.{js,ts,tsx,jsx}'
  assert:
    type: none_of
    rules:
      # API key assignments
      - type: for_each
        select:
          type: select_ast_nodes
          query: '$VAR = "$SECRET"'
          language: 'javascript'
        assert:
          type: assert_property
          property_path: 'text'
          expected_value: 'api.*key|secret|token|password'
          operator: 'matches'
      
      # Object properties with secrets
      - type: for_each
        select:
          type: select_ast_nodes
          query: '{ $KEY: "$VALUE" }'
          language: 'javascript'
        assert:
          type: assert_property
          property_path: 'text'
          expected_value: '^[A-Z0-9]{20,}$|^[a-f0-9]{32,}$'
          operator: 'matches'
```

#### Validate React Hook Dependencies

```yaml
id: exhaustive-deps
description: Ensure useEffect has correct dependencies
rule:
  type: for_each
  select:
    type: select_files
    path_pattern: '**/*.{jsx,tsx}'
  assert:
    type: for_each
    select:
      type: select_ast_nodes
      # Capture the effect function and dependency array
      query: 'useEffect(() => { $$$EFFECT }, [$DEPS])'
      language: 'typescript'
    assert:
      type: assert_property
      property_path: 'text'
      # Check if variables used in effect are in deps
      expected_value: '$DEPS'
      operator: 'includes'
      message: 'useEffect dependencies may be incomplete'
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

### 8. Running Your Rules

```bash
# Auto-discover *.cg.yaml / *.codeguardian.yaml files and check against main branch
codeguardian check

# Check a specific rule file against a different base branch
codeguardian check -c path/to/my-rule.yaml -b develop

# Use a glob pattern for rule files and get JSON output
codeguardian check -c "rules/**/*.yaml" --format=json
```
