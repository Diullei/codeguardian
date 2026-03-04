---
name: CodeGuardian
description: This skill should be used when creating or editing CodeGuardian rule files (.cg.yaml), running codeguardian check or edit, or validating code against YAML rules. It provides CLI usage and DSL reference for the Code Guardian validation tool.
---

# CodeGuardian Agent Skill

Code Guardian is a Git-native validation tool that enforces code quality and architectural rules, especially for AI-generated code. Rules are YAML files (`.cg.yaml` or `.codeguardian.yaml`) composed of **selectors** (what to check), **assertions** (conditions), and **combinators** (logic).

## When to use this skill

- Writing or modifying rule files (`.cg.yaml`)
- Running `codeguardian check` or `codeguardian edit`
- Designing validations for changed files, AST nodes, or command output
- Looking up CLI options or DSL syntax for selectors, assertions, or combinators

## Basics

- **Rule structure**: Every rule has `id`, optional `description`, and a `rule` tree. The tree uses `type: for_each` + `select` + `assert` as the common pattern.
- **Discovery**: By default, Code Guardian auto-discovers the Git repo root and all `.cg.yaml` files (respecting `.cg-ignore`). Use `-c` to point at specific files or globs.
- **Modes**: `--mode=diff` (default, changed files), `--mode=all`, `--mode=staged`. Use `select_all: true` in a rule to validate against the whole repo regardless of mode.
- **Rule editor**: Run `codeguardian edit [file]` to open the web UI; default file is `.codeguardian/development-rules.cg.yaml`.

## References

- **CLI**: See [references/cli.md](references/cli.md) for `codeguardian check` and `codeguardian edit` options, auto-discovery, and examples.
- **DSL**: See [references/dsl.md](references/dsl.md) for selectors (`select_files`, `select_lines`, `select_ast_nodes`, `select_file_changes`, `select_command_output`), assertions (`assert_match`, `assert_count`, `assert_property`, `assert_line_count`, `assert_command_output`), combinators (`for_each`, `all_of`, `any_of`, `none_of`), and message/suggestion fields.

Load the appropriate reference when implementing a rule or troubleshooting a run.
