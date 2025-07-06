# 🛡️ Code Guardian

<p align="center">
  <strong>AI-Aware Code Protection for Modern Development</strong>
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-real-world-examples">Examples</a> •
  <a href="#-documentation">Docs</a> •
  <a href="#-contributing">Contributing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/npm/v/@diullei/codeguardian/beta" alt="npm version" />
  <img src="https://img.shields.io/badge/status-beta-yellow" alt="Status: Beta" />
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License: MIT" />
</p>

---

## 🎯 What is Code Guardian?

Code Guardian is a validation tool that helps you maintain code quality and architectural integrity, especially when working with AI coding assistants. It validates only what changed, making it perfect for CI/CD pipelines and pre-commit hooks.

**The Problem:** AI assistants are great at writing code, but they don't always follow your project's rules, patterns, or architectural decisions.

**The Solution:** Code Guardian acts as your automated code checker, ensuring that both human and AI-generated code adheres to your standards.

## ✨ Features

- 🚀 **Lightning Fast** - Validates only changed files, not your entire codebase
- 🤖 **AI-Friendly** - Clear error messages help AI assistants self-correct
- 🧩 **Composable Rules** - Build complex validations from simple primitives
- 🔍 **AST-Aware** - Search code structure with `ast-grep` integration
- 📦 **Zero Config** - Sensible defaults with full customization when needed
- 🛡️ **Git-Native** - Works seamlessly with branches, commits, and diffs
- 🚫 **Smart Exclusions** - Use `.cg-ignore` files to skip directories

## 🚀 Quick Start

### Prerequisites

- Node.js 16 or higher
- Git repository
- `ast-grep` CLI (optional, for AST-based rules)

### Installation

```bash
npm install -g @diullei/codeguardian@beta

# Or run directly without installing
npx @diullei/codeguardian@beta check
```

### Your First Rule

Create a `protect-auth.cg.yaml` file in your project root:

```yaml
# Protect critical authentication code
id: protect-auth
description: Authentication code requires manual review
rule:
    type: for_each
    select:
        type: select_files
        path_pattern: 'src/auth/**/*'
    assert:
        type: assert_property
        property_path: 'status'
        expected_value: 'unchanged'
        operator: '=='
        message: 'Authentication code cannot be modified without review'
```

Run validation:

```bash
codeguardian check

# ✅ All rules passed!
```

## 📚 Real-World Examples

### 🚨 Prevent AI Hallucinations

Stop AI from creating duplicate or alternative versions of files:

```yaml
id: no-duplicate-files
description: Prevent AI from creating alternative file versions
rule:
    type: none_of
    rules:
        - type: for_each
          select:
              type: select_files
              path_pattern: '**/*_(improved|enhanced|copy|v2).*'
          assert:
              type: assert_match
              pattern: '.*'
              should_match: true
              message: 'Update the original file instead of creating duplicates'
```

### 🏛️ Enforce Clean Architecture

Keep your domain logic pure and framework-agnostic:

```yaml
id: clean-architecture
description: Domain must not depend on infrastructure
rule:
    type: for_each
    select:
        type: select_files
        path_pattern: 'src/domain/**/*.ts'
    assert:
        type: none_of
        rules:
            - type: assert_match
              pattern: 'from.*infrastructure'
              message: 'Domain cannot import infrastructure'
            - type: assert_match
              pattern: 'import.*(express|axios|prisma)'
              message: 'Domain must remain framework-agnostic'
```

### 🔒 Security Patterns

Detect potential vulnerabilities using AST queries:

```yaml
id: no-eval
description: Prevent dynamic code execution
rule:
    type: for_each
    select:
        type: select_files
        path_pattern: '**/*.{js,ts}'
        select_all: true # Check entire codebase
    assert:
        type: for_each
        select:
            type: select_ast_nodes
            query: 'eval($CODE)'
            language: 'javascript'
        assert:
            type: assert_match
            pattern: '.'
            should_match: false
            message: 'eval() is forbidden - security risk'
```

### 📊 Validate Build Metrics

Ensure build quality and performance:

```yaml
id: bundle-size-limit
description: Keep bundle size under control
rule:
    type: for_each
    select:
        type: select_command_output
        command: 'du -k dist/bundle.js | cut -f1'
    assert:
        type: assert_property
        property_path: 'stdout'
        extract_pattern: '(\d+)'
        operator: '<='
        expected_value: 2000
        suggestion: 'Bundle exceeds 2MB - consider code splitting'
```

### 🤖 AI Task Validation

Verify AI completed the requested task correctly:

```yaml
id: verify-feature-implementation
description: Ensure JWT auth was properly implemented
rule:
    type: for_each
    select:
        type: select_files
        path_pattern: 'src/auth/jwt.ts'
        select_all: true # Check current state
    assert:
        type: all_of
        rules:
            - type: assert_match
              pattern: 'jwt\.verify'
              message: 'JWT verification must be implemented'
            - type: assert_match
              pattern: 'RS256|ES256'
              message: 'Must use secure signing algorithm'
```

## 🎮 Usage

### Validation Modes

```bash
# Default: Check only changed files (fast CI/CD)
codeguardian check

# Check everything including untracked files
codeguardian check --mode=all

# Pre-commit: Check only staged files
codeguardian check --mode=staged
```

### Protection Levels

#### 🛡️ Absolute Protection (`select_all: true`)

For critical rules that must ALWAYS pass:

```yaml
# No package manager conflicts
type: for_each
select:
    type: select_files
    path_pattern: 'yarn.lock'
    select_all: true # Always check, regardless of changes
assert:
    type: assert_match
    pattern: '.*'
    should_match: false
    message: 'Project uses npm, not yarn'
```

#### 📈 Progressive Protection (default)

For incremental improvements on changed code:

```yaml
# Enforce naming on NEW files only
type: for_each
select:
    type: select_files
    path_pattern: '**/*.ts'
    status: ['added']
assert:
    type: assert_match
    pattern: '^[A-Z][a-zA-Z]+\.ts$'
    message: 'New files must use PascalCase'
```

## 🤝 AI Integration Workflow

When using AI coding assistants:

```bash
# 1. Include in your AI prompt:
"Run 'codeguardian check' after implementing features to ensure
architectural compliance. Fix any violations before completing."

# 2. AI-friendly output helps self-correction:
> codeguardian check
[FAIL] Domain cannot import infrastructure
  File: src/domain/user.ts:5
  Violation: import { PrismaClient } from '@prisma/client'
  Suggestion: Use repository interface instead
```

### Claude Code Integration

Code Guardian provides seamless integration with [Claude Code hooks](https://docs.anthropic.com/en/docs/claude-code/hooks) for automatic validation. With the `--claude-code-hook` flag, violations trigger Claude to automatically fix issues before proceeding.

📖 **[See the complete Claude Code integration guide →](docs/claude-code-integration.md)**

## 🧩 Rule Composition

Code Guardian uses simple primitives that compose into powerful rules:

- **Selectors** find what to check (files, lines, AST nodes)
- **Assertions** validate conditions (patterns, counts, properties)
- **Combinators** apply logic (for_each, all_of, any_of, none_of)

## 📖 Documentation

- **[Technical Guide](docs/technical-guide.md)** - Detailed rule documentation
- **[Claude Code Integration](docs/claude-code-integration.md)** - Automatic validation with Claude Code hooks
- **[Cheat Sheet](Cheat_Sheet.md)** - Complete syntax reference with examples
- **[Examples](examples/)** - Real-world rule configurations

### Generate Rules with AI

Use our comprehensive cheat sheet to create custom rules:

```
Using the Code Guardian cheat sheet (https://raw.githubusercontent.com/diullei/codeguardian/refs/heads/main/Cheat_Sheet.md), create rules that:
- Prevent console.log in production
- Ensure all async functions have try-catch
- Block direct database access in controllers
```

For more sophisticated AI integration, check out our [Claude command definitions](.claude/commands/development/) that provide detailed prompts for rule creation and violation fixing.

## 🛠️ CLI Reference

```bash
codeguardian check [options]

Options:
  -c, --config   Rule files or pattern        [auto-discovers .cg.yaml]
  -e, --exclude  Exclude patterns             [array]
  -r, --repo     Repository path              [disables auto-discovery]
  -C             Change to directory first    [like git -C]
  -b, --base     Base branch                  [default: auto-detected]
  --head         Head branch/commit           [default: "HEAD"]
  -m, --mode     Validation scope             [diff|all|staged] [default: "diff"]
  -f, --format   Output format                [console|json] [default: "console"]
  --skip-missing-ast-grep  Skip AST rules if ast-grep not installed
  --claude-code-hook       Claude Code hook mode (exit 2 on errors, silent on success)
```

### Repository Auto-Discovery

Code Guardian automatically finds your Git repository root when run from any subdirectory:

```bash
# Auto-discovers repository root from current directory
codeguardian check

# Change to directory first, then auto-discover
codeguardian check -C /path/to/project/src

# Use explicit repository path (no auto-discovery)
codeguardian check --repo /path/to/repo
```

## 🗺️ Project Status

> ⚠️ **Beta Release**: Code Guardian is under development. APIs may change between versions.

### Current Features

- ✅ Core validation engine
- ✅ File and AST selectors
- ✅ Basic assertions and combinators
- ✅ Git integration
- ✅ CLI interface

## 🤝 Contributing

Contributions are welcome and appreciated. Whether you're reporting bugs, suggesting features, or submitting code improvements, your input helps make the project better for everyone.

See our [Contributing Guide](CONTRIBUTING.md) for details.

### Quick Contribution Guide

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 💬 Community & Support

- **Issues**: [GitHub Issues](https://github.com/diullei/codeguardian/issues)
- **Source**: [GitHub Repository](https://github.com/diullei/codeguardian)

## 📄 License

MIT © 2025 Diullei Gomes

---

<p align="center">
  Made with ❤️ for developers who care about code quality
</p>

<p align="center">
  <strong>Thanks for using Code Guardian!</strong> If you find it useful, please consider giving it a ⭐ on GitHub.
</p>
