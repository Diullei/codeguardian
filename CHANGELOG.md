# Changelog

All notable changes to Code Guardian will be documented in this file.

## [0.1.0-beta.5] - 2025-06-24

### Added
- **Line Count Validation**: New `assert_line_count` assertion for enforcing file size limits
  - Supports all comparison operators: `==`, `!=`, `>`, `<`, `>=`, `<=`
  - Works with string content, objects with `content`/`text` properties, or direct `lineCount` values
  - Ignores trailing empty lines for accurate counting
  - Provides detailed error messages with file paths and actionable suggestions
- **AssertLineCountRule**: Core implementation extending AssertionRule base class
- **AssertLineCountBuilder**: YAML configuration builder supporting `max_lines` and `expected_value` properties
- **Comprehensive Testing**: 15+ unit tests and integration tests with example configurations
- **Documentation**: Updated cheat sheet with line count validation examples and patterns
- **Example Configuration**: `line-count-validation.cg.yaml` demonstrating Go file limits (450 lines)

### Changed
- Updated rule factory registration to include new `assert_line_count` rule type
- Enhanced cheat sheet with Pattern 7: File Size Validation examples

## [0.1.0-beta.4] - 2025-01-21

### Added
- **Automatic Branch Fallback**: Code Guardian now automatically detects the default branch
  - Checks remote HEAD configuration first
  - Falls back to 'main' if it exists locally
  - Falls back to 'master' if 'main' doesn't exist
  - Ensures compatibility with repositories using 'master' as default branch

### Changed
- The CLI no longer assumes 'main' is the default branch
- Added `getDefaultBranch()` method to GitRepository for intelligent branch detection

### Fixed
- Fixed issue where repositories using 'master' as default branch would fail validation

## [0.1.0-beta.3] - 2025-01-20

### Added
- **Command Execution Rules**: New rules for validating build commands and npm scripts
  - `assert_command_success`: Validate that commands execute successfully
  - `assert_command_output`: Assert specific patterns in command output
  - Rule to prevent disabling critical npm scripts
- **Enhanced Property Assertions**: `assert_property` now supports regex value extraction
  - Extract and validate values using `value_regex` parameter
  - Useful for checking version numbers, configuration values, etc.
- **Improved Reporting**: 
  - Granular rule counting shows exactly how many rules were evaluated
  - Better violation messages with context
- **Documentation**: 
  - Added documentation for command execution features
  - Added documentation for suggestion field in violations

### Changed
- Migrated to ESLint v9 flat config format
- Updated npm scripts to exclude tests directory from checks
- Enhanced rule evaluation with better error handling

### Fixed
- Improved test coverage for new features
- Fixed edge cases in command execution validation

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