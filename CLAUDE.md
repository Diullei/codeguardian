# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# VERY IMPORTANT:

YOU SHOULD ALWAYS run `npm run check` before committing to ensure all rules pass against the latest code changes. This ensures code quality and compliance with defined rules.

# Build and Development Commands

```bash
# Build TypeScript to dist/
npm run build

# Development mode with file watching
npm run dev

# Run all tests
npm test

# Run a specific test file
npm test -- tests/unit/selectors/SelectFilesRule.test.ts

# Type checking without emitting files
npm run typecheck

# Lint the codebase
npm run lint

# Clean build output
npm run clean
```

## Architecture Overview

Code Guardian is a Git-aware, rule-based code validation system that analyzes only changed files between Git branches. It's built on three core abstractions:

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

## Adding New Rules

1. Create rule class extending appropriate base:

    - `SelectorRule` for finding items
    - `AssertionRule` for checking properties
    - `CombinatorRule` for logical composition

2. Create builder implementing `RuleBuilder` interface

3. Register in `src/config/index.ts`:

    ```typescript
    factory.register('your_rule_type', new YourRuleBuilder());
    ```

4. Follow test patterns in `tests/unit/` - use `createMockContext()` helper

## Important Implementation Notes

- **Assertions within Combinators**: Assertions cannot be evaluated directly - they must be used within a combinator (typically `for_each`)
- **File Content Loading**: The `ForEachRule` automatically loads file content when needed
- **Path Handling**: Always use absolute paths internally
- **AST Languages**: Currently supports TypeScript, JavaScript, TSX, HTML, CSS via `@ast-grep/napi`
- **Pattern Matching**: File patterns use minimatch glob syntax

## Common Validation Patterns

1. **File content validation**:

    ```yaml
    type: for_each
    select:
        type: select_files
        path_pattern: '**/*.ts'
    assert:
        type: assert_match
        pattern: 'console\.log'
        should_match: false
    ```

2. **Architecture enforcement**:

    ```yaml
    type: for_each
    select:
        type: select_files
        path_pattern: 'src/domain/**/*.ts'
    assert:
        type: assert_match
        pattern: 'from.*infrastructure'
        should_match: false
    ```

3. **Security checks with multiple conditions**:
    ```yaml
    type: all_of
    rules:
        - type: for_each
          # ... check for secrets
        - type: for_each
          # ... check for vulnerabilities
    ```

## Testing Approach

Tests use consistent mock patterns:

```typescript
const createMockContext = (files: FileInfo[]): EvaluationContext => {
    const mockRepository = {
        getFiles: jest.fn().mockResolvedValue(files),
        getFileContent: jest.fn().mockImplementation(/* ... */),
        getDiff: jest.fn(),
    };
    // ... return context
};
```

Integration tests in `tests/integration/` validate complete rule evaluation against example configurations.
