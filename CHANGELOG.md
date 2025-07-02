# Changelog

All notable changes to Code Guardian will be documented in this file.

## [0.1.0-beta.8] - 2025-07-02

### Fixed
- **Claude Code Hook Integration**: Fixed `--claude-code-hook` flag behavior
  - Now runs completely silently when all rules pass (exit code 0)
  - Outputs to stderr when violations are found (exit code 2)
  - Suppresses configuration file listing in claude-code-hook mode
  - Added comprehensive tests for claude-code-hook behavior

## [0.1.0-beta.7] - 2025-07-02

### Added
- **`.cg-ignore` File Support**: Directories containing a `.cg-ignore` file are now automatically excluded from configuration auto-discovery
  - Simply place a `.cg-ignore` file in any directory to skip it during validation
  - Useful for example directories, test fixtures, or generated code
  - File content is not parsed; only the presence of the file matters
- **Claude Code Integration**: New `--claude-code-hook` flag enables seamless integration with Claude Code's hook system
  - Exit with code 2 on violations (triggers Claude to automatically fix issues)
  - Run silently when all rules pass (no output)
  - Comprehensive documentation added for Claude Code integration setup
- **AI Command Templates**: Added templates for development workflows to enhance AI-assisted development

### Changed
- Modernized README with a visual, user-friendly layout
- Streamlined CONTRIBUTING.md with clearer instructions
- Updated documentation to cover new `.cg-ignore` feature

### Fixed
- Examples directory is now properly excluded from rule validation

### Removed
- **Experimental Prompt Generation**: Removed the experimental `generate-prompt` command and related functionality
  - This feature was behind the `CODEGUARDIAN_EXPERIMENTAL` flag
  - Simplified the codebase by removing `PromptGenerator` and related modules

## [0.1.0-beta.6] - 2025-06-28

### Added
- **Improved Deleted File Handling**: Enhanced support for validating deleted files in Git diffs
  - `assert_match` now provides helpful error messages when attempting to validate deleted files
  - Automatically passes "should not match" assertions for deleted files (no content = no match)
  - Added suggestions to use `assert_property` for checking file deletion status
- **ForEachRule Enhancement**: Skips content loading for deleted files to prevent errors
- **New Examples**: Added `handle-deleted-files.yaml` demonstrating best practices for deleted file scenarios
- **Comprehensive Tests**: Added integration tests covering various deleted file scenarios

### Changed
- Updated Cheat Sheet with Pattern 8: Handling Deleted Files section
- Improved error messages to guide users toward appropriate validation strategies

### Fixed
- Fixed errors when trying to read content from deleted files during validation
- Resolved issues with content-based assertions on files removed in diffs

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