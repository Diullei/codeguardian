# Changelog

All notable changes to Code Guardian will be documented in this file.

## [0.1.0-beta.2] - 2024-01-20

### Added
- **Validation Modes**: New `--mode` flag to control validation scope
  - `diff` (default): Check only changed files between branches
  - `all`: Check entire working directory including untracked files
  - `staged`: Check only staged files in Git
- **Enhanced Reporting**: Now shows both file count and rule count in output
- **Protective Rules**: New built-in rules for common project standards
  - No test files outside `tests/` directory
  - No markdown files in project root
- **NPM Scripts**: Convenient shortcuts for different modes
  - `npm run check:all` - Check everything
  - `npm run check:staged` - Check staged files only

### Changed
- Split core rules into `protective-rules.yaml` and `development-rules.yaml`
- Improved documentation with clear mode explanations and troubleshooting

### Fixed
- Rules now properly detect untracked files when using `--mode=all`
- Fixed TypeScript compilation warning in GitRepository

## [0.1.0-beta.1] - 2024-01-20

### Added
- Initial beta release
- Git-aware validation system
- Rule composition with selectors, assertions, and combinators
- YAML-based configuration
- CLI with multiple output formats
- AST-based pattern matching support