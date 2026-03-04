# CodeGuardian Agent Skill

Agent skill for the Code Guardian validation tool. Provides basics, CLI usage, and DSL reference for authoring and running rules.

## Installation

Copy the `skill/` directory into your agent skills location (e.g. Cursor `.cursor/skills/` or Claude Code `skills/`). Ensure the skill path is on the agent’s skill search path.

## Contents

- **SKILL.md** – When to use the skill, core concepts, and pointers to references.
- **references/cli.md** – `codeguardian check` and `codeguardian edit` options and examples.
- **references/dsl.md** – Selectors, assertions, combinators, and example rule patterns.

## Usage

The skill triggers when the agent works with CodeGuardian rule files (`.cg.yaml`), runs `codeguardian check` or `codeguardian edit`, or needs CLI/DSL syntax. Load `references/cli.md` or `references/dsl.md` as needed for detailed options and DSL reference.
