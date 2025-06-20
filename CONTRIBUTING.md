# Contributing to Code Guardian

Thank you for your interest in contributing to Code Guardian! This guide will help you get started with development.

## Development Setup

### Prerequisites

- Node.js >= 16.0.0
- npm
- Git

### Getting Started

1. Fork and clone the repository:

```bash
git clone https://github.com/[your-username]/codeguardian.git
cd codeguardian
```

2. Install dependencies:

```bash
npm install
```

3. Build the project:

```bash
npm run build
```

### Running Locally

There are several ways to run Code Guardian during development:

#### Method 1: Using npm link (Recommended)

This method allows you to use `codeguardian` command globally while developing:

```bash
npm run build
npm link
```

Now you can run Code Guardian from anywhere:

```bash
codeguardian check
```

To unlink when done:

```bash
npm unlink -g codeguardian
```

#### Method 2: Direct execution

Run the CLI directly without installation:

```bash
# Build first
npm run build

# Run directly
./dist/cli/index.js check
```

#### Method 3: Using npm scripts

The project includes a convenient npm script:

```bash
npm run check
```

This builds the project and runs the check command with predefined options.

## Development Workflow

### Available Scripts

- `npm run build` - Build TypeScript to dist/
- `npm run dev` - Watch mode for development
- `npm test` - Run all tests
- `npm run lint` - Lint the codebase
- `npm run typecheck` - Type checking without emitting files
- `npm run format` - Format code with Prettier
- `npm run clean` - Clean build output

### Testing

Run tests during development:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run a specific test file
npm test -- tests/unit/selectors/SelectFilesRule.test.ts
```

### Code Quality

Before submitting a PR, ensure your code passes all checks:

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Run Code Guardian's own checks
npm run check
```

## Making Changes

1. Create a feature branch:

```bash
git checkout -b feature/your-feature-name
```

2. Make your changes following the existing code style

3. Add tests for new functionality

4. Ensure all tests pass and code quality checks succeed

5. Commit your changes following conventional commits:

```bash
git commit -m "feat: add new selector for X"
git commit -m "fix: resolve issue with Y"
git commit -m "docs: update documentation for Z"
```

## Submitting a Pull Request

1. Push your changes to your fork:

```bash
git push origin feature/your-feature-name
```

2. Create a Pull Request on GitHub

3. Describe your changes and link any related issues

4. Wait for review and address any feedback

## Architecture Guidelines

When contributing, please follow these architectural principles:

- **Rule Hierarchy**: Maintain the selector → assertion → combinator pattern
- **Git Integration**: Remember that Code Guardian is Git-aware and validates diffs
- **Performance**: Optimize for analyzing only changed files
- **Testing**: Write unit tests for new rules and integration tests for workflows

See [CLAUDE.md](CLAUDE.md) for detailed architectural information.

## Need Help?

- Open an issue for bug reports or feature requests
- Check existing issues before creating a new one
- Join discussions in the issues section

Thank you for contributing to Code Guardian!