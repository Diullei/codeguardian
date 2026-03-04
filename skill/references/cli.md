# CodeGuardian CLI Reference

## codeguardian check

Validates the repository against configured rules. Auto-discovers Git root and `.cg.yaml` files unless overridden.

```bash
codeguardian check [options]
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-c`, `--config` | Rule files or glob pattern | Auto-discovers `.cg.yaml` |
| `-e`, `--exclude` | Exclude patterns (array) | |
| `-r`, `--repo` | Repository path | Disables auto-discovery when set |
| `-C` | Change to directory first (like `git -C`) | |
| `-b`, `--base` | Base branch for diff | Auto-detected |
| `--head` | Head branch/commit | `HEAD` |
| `-m`, `--mode` | Validation scope | `diff` |
| `-f`, `--format` | Output format | `console` |
| `--skip-missing-ast-grep` | Skip AST rules if ast-grep not installed | |
| `--claude-code-hook` | Hook mode: exit 2 on errors, silent on success | |

### Mode values

- `diff` – Only files changed between base and head (CI/PR)
- `all` – All files in working directory, including untracked
- `staged` – Only staged files (pre-commit)

### Examples

```bash
codeguardian check
codeguardian check --mode=all
codeguardian check --mode=staged
codeguardian check -c path/to/my-rule.yaml -b develop
codeguardian check -c "rules/**/*.yaml" --format=json
codeguardian check -C /path/to/project
codeguardian check --repo /path/to/repo
```

---

## codeguardian edit

Starts a local web UI to edit a single rule file.

```bash
codeguardian edit [options] [file]
```

- **`[file]`**: Path to a `.cg.yaml` or `.codeguardian.yaml` file. Optional; default: `.codeguardian/development-rules.cg.yaml`.
- **Options**:
  - `--port <port>` – Server port (default 3847)
  - `--host <host>` – Bind address (default 127.0.0.1)
  - `--no-open` – Do not open browser; print URL only

### Example

```bash
codeguardian edit .codeguardian/my-rules.cg.yaml
```
