# Contributing to Code Guardian

Thanks for your interest! Let's get you set up quickly.

## 🚀 Quick Setup

```bash
# 1. Fork and clone
git clone https://github.com/[your-username]/codeguardian.git
cd codeguardian

# 2. Install deps
npm install

# 3. Build
npm run build
```

## 🔧 Development

### Run Locally

**Important**: Always use npm scripts for validation to ensure proper exclusions are applied.

```bash
# Check changed files (default)
npm run check

# Check all files
npm run check:all

# Check staged files only
npm run check:staged
```

These scripts automatically exclude example configurations and test files.

**For development testing:**

```bash
# Option 1: Global link
npm run build && npm link
codeguardian check  # Available globally

# Option 2: Direct execution
npm run build
./dist/cli/index.js check
```

### Essential Commands

```bash
npm run build         # Build TypeScript
npm run dev          # Watch mode
npm test             # Run tests
npm run lint         # Lint code
npm run typecheck    # Type check
npm run check:all    # Run all validation
```

### Testing

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Specific test
npm test -- tests/unit/selectors/SelectFilesRule.test.ts
```

## 📝 Submitting Changes

### 1. Branch & Code

```bash
git checkout -b feature/your-feature
```

Follow existing patterns. Add tests. Keep it clean.

### 2. Commit

Use conventional commits:

```bash
git commit -m "feat: add new selector"
git commit -m "fix: resolve issue"
git commit -m "docs: update readme"
```

### 3. Quality Check

Before pushing:

```bash
npm run typecheck
npm run lint
npm run test
npm run check:all
```

### 4. PR

Push and create a PR with clear description.

## 🤖 AI-Assisted Development

### Using Claude Code or Other AI Tools

We provide ready-made prompts for common tasks:

**Creating new rules:**

- Use `.claude/commands/development/cg-create-rules.md` as a template
- The prompt fetches our cheat sheet and guides rule creation
- Works with Claude Code: `/cg-create-rules prevent console.log in production`
- Or copy the prompt for any AI assistant

**Checking and fixing violations:**

- Use `.claude/commands/development/cg-check.md` as a template
- Runs validation and fixes violations automatically
- Works with Claude Code: `/cg-check`
- Guides the AI to fix code rather than change rules

These prompts help ensure consistent, high-quality contributions when working with AI assistants.

## 🏗️ Architecture Notes

- **Rule Pattern**: selector → assertion → combinator
- **Git-Aware**: We validate diffs, not entire codebases
- **Performance**: Only analyze changed files
- **Testing**: Unit tests for rules, integration tests for workflows

See [CLAUDE.md](CLAUDE.md) for details.

## 💬 Need Help?

Open an issue. Check existing ones first.

---

Thanks for contributing! 🎉
