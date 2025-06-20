# Code Guardian

**Code Guardian** is an **experimental** developer tool designed to validate and enforce architectural rules in codebases—especially valuable when dealing with AI-generated code. It automatically analyzes code after every change to preserve architectural integrity, enforce predefined standards, and reduce the risk of AI hallucinations, ensuring consistent, high-quality software structures.

> ⚠️ **Experimental Project**: Currently in beta. APIs and features may change.

## Overview

Code Guardian is a Git-aware validation tool that protects your codebase from unwanted changes—particularly useful when working with AI coding assistants. It enforces architectural boundaries, protects critical folders from modifications, and ensures dependency flow rules are followed.

**Key benefits:**
- **Protect critical code**: Prevent AI agents from modifying protected folders or files
- **Enforce architecture**: Ensure domain code doesn't import from infrastructure layers
- **Validate changes early**: Catch issues in Git diffs before they reach your main branch
- **Compose simple rules**: Build complex validations from reusable primitives

Code Guardian analyzes only what changed (by default), making it fast and focused. It can validate committed changes between branches, uncommitted changes in your working directory, or perform deep analysis of the entire codebase when needed.

## Installation

Code Guardian is currently in beta. Install it globally:

```bash
npm install -g @diullei/codeguardian@beta
```

Or add it as a development dependency to your project:

```bash
npm install --save-dev @diullei/codeguardian@beta
```

### Running Without Installation

You can also run Code Guardian directly using `npx`:

```bash
npx @diullei/codeguardian@beta check
```

### Contributing

Want to contribute or run Code Guardian from source? See our [Contributing Guide](CONTRIBUTING.md) for development setup instructions.

## Quick Start

1. Create a rule configuration file to protect your codebase:

```yaml
# protect-critical-code.yaml
id: protect-core-auth
description: Prevent modifications to authentication and security modules
rule:
    type: for_each
    select:
        type: select_files
        path_pattern: 'src/{auth,security}/**/*'
    assert:
        type: assert_property
        property_path: 'status'
        expected_value: 'unchanged'
        operator: '=='
        message: 'Critical security code should not be modified without review'
```

2. Enforce architectural boundaries:

```yaml
# enforce-architecture.yaml
id: clean-architecture
description: Ensure domain logic doesn't depend on infrastructure
rule:
    type: for_each
    select:
        type: select_files
        path_pattern: 'src/domain/**/*.{ts,js}'
    assert:
        type: none_of
        rules:
            - type: assert_match
              pattern: 'from\s+["\'].*infrastructure'
              message: 'Domain layer cannot import from infrastructure'
            - type: assert_match
              pattern: 'from\s+["\'].*database'
              message: 'Domain layer cannot directly access database'
```

3. Run validation on your changes:

```bash
# Check changes between your feature branch and main
codeguardian check -c protect-critical-code.yaml -b main

# Check all rules in a directory
codeguardian check -c "rules/*.yaml" -b main
```

4. **AI Coding Agent Workflow**: When using AI coding assistants, instruct them to run `codeguardian check` periodically or after completing tasks. The command provides clear violation information that helps the AI self-correct and stay aligned with your architectural rules:

```bash
# In your AI prompt, include:
"After implementing the feature, run 'codeguardian check' to validate the changes 
against our architectural rules. Fix any violations before considering the task complete."

# If the AI forgets to check, prompt it:
"Please run 'codeguardian check' to ensure your implementation follows our rules."
```

This workflow works similarly to instructing AI agents to run tests or linters—Code Guardian acts as an architectural linter that helps AI agents recover from potential hallucinations and maintain code quality.

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

### Combinators

Combinators compose rules using logical operations:

- **all_of** - All rules must pass (AND)
- **any_of** - At least one rule must pass (OR)
- **none_of** - No rules should pass (NOT)
- **for_each** - Apply assertion to each selected item

## Examples

### Real-World Mode Example: Catching Untracked Violations

Imagine you accidentally create a test file in the wrong location:

```bash
# Oops! Created a test file outside the tests/ directory
echo "describe('test', () => {});" > src/mytest.test.js
```

With **default mode (diff)**, this violation won't be caught until you stage it:
```bash
codeguardian check              # ✅ Passes - file is untracked
git add src/mytest.test.js     # Stage the file
codeguardian check              # ❌ NOW it fails!
```

With **all mode**, violations are caught immediately:
```bash
codeguardian check --mode=all   # ❌ Fails immediately - catches untracked file!
```

This is why protective rules often benefit from `--mode=all` or `select_all: true`.

### Protect Critical Infrastructure from AI Modifications

When working with AI coding assistants, protect your critical infrastructure code:

```yaml
# protect-payment-system.yaml
id: protect-payment-infrastructure
description: Prevent AI from modifying payment processing code
rule:
    type: none_of
    rules:
        # Block any modifications to payment processing
        - type: for_each
          select:
              type: select_files
              path_pattern: 'src/payments/**/*'
              status: ['modified', 'deleted']
          assert:
              type: assert_match
              pattern: '.*'
              should_match: true
              message: 'Payment system files cannot be modified by AI agents'
        
        # Block creation of new payment-related files
        - type: for_each
          select:
              type: select_files
              path_pattern: '**/payment*'
              status: ['added']
          assert:
              type: assert_match
              pattern: '.*'
              should_match: true
              message: 'New payment files require human review'
```

### Prevent AI from Breaking Architecture Boundaries

Ensure AI respects your architectural decisions:

```yaml
# enforce-clean-architecture.yaml
id: enforce-layer-boundaries
description: Maintain architectural integrity across layers
rule:
    type: all_of
    rules:
        # Domain layer independence
        - type: for_each
          select:
              type: select_files
              path_pattern: 'src/domain/**/*.{ts,js}'
          assert:
              type: none_of
              rules:
                  - type: assert_match
                    pattern: 'from\s+["\'].*/(infrastructure|adapters|ui)'
                    message: 'Domain layer must remain pure - no infrastructure dependencies'
                  - type: assert_match
                    pattern: 'import.*express|axios|prisma|mongoose'
                    message: 'Domain layer cannot use framework-specific libraries'
        
        # Application layer can only depend on domain
        - type: for_each
          select:
              type: select_files
              path_pattern: 'src/application/**/*.{ts,js}'
          assert:
              type: assert_match
              pattern: 'from\s+["\'].*/(infrastructure|adapters)'
              should_match: false
              message: 'Application layer cannot directly access infrastructure'
```

### Validate AI Task Implementation

When AI completes a task, validate it actually did what was requested:

```yaml
# validate-auth-feature.yaml
id: validate-jwt-implementation
description: Ensure JWT authentication was properly implemented
rule:
    type: all_of
    rules:
        # Check the feature exists
        - type: for_each
          select:
              type: select_files
              path_pattern: 'src/auth/jwt.{ts,js}'
              select_all: true  # Check current state, not just diff
          assert:
              type: all_of
              rules:
                  - type: assert_match
                    pattern: 'verify.*token|jwt\.verify'
                    message: 'JWT verification must be implemented'
                  - type: assert_match
                    pattern: 'sign.*token|jwt\.sign'
                    message: 'JWT signing must be implemented'
                  - type: assert_match
                    pattern: 'RS256|ES256'  # Secure algorithms
                    message: 'Must use secure signing algorithm'
        
        # Ensure no insecure patterns
        - type: for_each
          select:
              type: select_files
              path_pattern: 'src/auth/**/*.{ts,js}'
          assert:
              type: assert_match
              pattern: 'algorithm.*HS256|none'  # Weak algorithms
              should_match: false
              message: 'Cannot use weak JWT algorithms'
```

### Monitor File Change Magnitude

Prevent AI from making massive rewrites:

```yaml
# limit-ai-changes.yaml
id: prevent-large-rewrites
description: Ensure AI makes incremental changes, not complete rewrites
rule:
    type: all_of
    rules:
        # Flag files that are mostly rewritten
        - type: for_each
          select:
              type: select_file_changes
              min_percentage: 70
          assert:
              type: assert_match
              pattern: '.*'
              should_match: true
              message: 'File rewritten by >70% - requires careful review'
        
        # Protect critical configs from large changes
        - type: assert_count
          select:
              type: select_file_changes
              min_percentage: 20
          assert:
              type: assert_match
              pattern: 'package\.json|tsconfig|webpack\.config|.env'
              should_match: false
              message: 'Configuration files should not change more than 20%'
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

### Validate Build Output and Metrics

Code Guardian can execute shell commands and validate their output, making it perfect for checking build results, test coverage, or other metrics:

```yaml
id: validate-build-metrics
description: Ensure build succeeds and bundle size is within limits
rule:
    type: all_of
    rules:
        # Check that build succeeds
        - type: for_each
          select:
              type: select_command_output
              command: 'npm run build'
          assert:
              type: assert_command_output
              target: 'exitCode'
              condition: '=='
              value: 0
              suggestion: 'Build failed - check build logs for errors'
        
        # Extract and validate bundle size from build output
        - type: for_each
          select:
              type: select_command_output
              command: 'npm run build:stats'
          assert:
              type: assert_property
              property_path: 'stdout'
              # Extract numeric value from output like "Bundle size: 1,245 KB"
              extract_pattern: 'Bundle size:\s*([\d,]+)\s*KB'
              operator: '<='
              expected_value: 2000
              suggestion: 'Bundle size exceeds 2MB limit'
```

This example shows how to:
- Run build commands and check their exit codes
- Extract numeric values from command output using regex patterns
- Validate that metrics stay within acceptable thresholds

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

Code Guardian offers three validation modes to check different scopes of your codebase:

#### 1. **Diff Mode** (default) - Check Only Changed Files
Validates files that have changed between two Git branches/commits. Perfect for CI/CD and PR reviews.

```bash
# Check changes between your branch and main
codeguardian check              # Default: compares HEAD with main
codeguardian check -b develop   # Compare HEAD with develop
```

**Use when**: You want fast, focused validation on what's changed

#### 2. **All Mode** - Check Entire Working Directory
Validates ALL files including tracked, untracked, and ignored files. Catches violations immediately, even before committing.

```bash
# Check everything in your working directory
codeguardian check --mode=all
codeguardian check -m all      # Short form
```

**Use when**: 
- Enforcing project-wide standards (no yarn.lock, no test files outside tests/)
- Catching violations in newly created files before staging
- Running comprehensive validation

#### 3. **Staged Mode** - Check Only Staged Files
Validates only files in your Git staging area. Ideal for pre-commit hooks.

```bash
# Check only what you're about to commit
codeguardian check --mode=staged
codeguardian check -m staged    # Short form
```

**Use when**: Setting up pre-commit hooks or validating before committing

### Mode vs select_all: What's the Difference?

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

## Rule Protection Levels

Code Guardian supports two protection levels for rules, each serving different purposes:

### Protective Rules (Absolute Protection)

Use `select_all: true` for rules that must **always** pass across the entire codebase:

- **Runtime Safety**: Patterns that would crash your application
- **Security**: No secrets, no vulnerable code patterns  
- **Project Standards**: Package manager consistency (no yarn.lock if using npm)
- **Legal/Compliance**: License headers, regulatory requirements

```yaml
# Example: Prevent runtime errors
type: for_each
select:
  type: select_files
  path_pattern: '**/*.ts'
  select_all: true  # Always check entire codebase
assert:
  type: assert_match
  pattern: 'eval\(|Function\('
  should_match: false
  message: 'Dynamic code execution is forbidden'
```

### Development Rules (Progressive Protection)

Use diff-based checking (default) for rules that improve code quality incrementally:

- **Code Patterns**: Enforce conventions on new/modified code
- **Architecture**: Maintain boundaries in changes
- **Style**: Apply standards progressively
- **Refactoring**: Improve quality over time

```yaml
# Example: Enforce naming on new files
type: for_each
select:
  type: select_files
  path_pattern: 'src/**/*.ts'
  status: ['added']  # Only new files
assert:
  type: assert_match
  pattern: '^[A-Z][a-zA-Z]+\.ts$'
  message: 'New TypeScript files must use PascalCase'
```

### Best Practice: Separate Rule Files

Organize your rules by protection level:

```
.codeguardian/
  protective-rules.yaml   # select_all: true - critical checks
  development-rules.yaml  # diff-based - progressive improvements
```

This separation makes it clear which rules are absolute requirements versus progressive improvements.

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
