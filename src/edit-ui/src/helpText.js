/**
 * Single source of copy for tooltips and inline descriptions in the rule editor.
 * Keys match field ids or section/type names used in RuleForm.
 */

export const helpText = {
    // Rule Identity
    ruleId: 'Unique identifier for this rule (e.g. no-console-log). Used in reports.',
    description: 'Optional human-readable explanation of what the rule enforces.',

    // Section descriptions (inline)
    ruleDefinition: 'Combinators define how selectors and assertions are combined.',
    selectSelector: 'Choose what to check: files by path, lines by regex, AST nodes, change %, or command output.',
    assertSection: 'Choose what to check: regex match, count, property, line count, or command output.',

    // Combinators
    for_each: 'Apply the assertion to every item returned by the selector.',
    all_of: 'All nested rules must pass.',
    any_of: 'At least one nested rule must pass.',
    none_of: 'No nested rule should pass.',

    // Selector types
    select_files: 'Select files by path glob, Git status, and optional exclude. Use for "check these files".',
    select_lines: 'Select lines within a file that match a regex.',
    select_ast_nodes: 'Select code nodes (e.g. function calls) using an ast-grep pattern.',
    select_file_changes: 'Select files by percentage of lines changed (insertions + deletions) / total lines.',
    select_command_output: 'Run a shell command and use its result (exit code, stdout, stderr) as the item to check.',

    // Selector fields
    path_pattern: 'Glob pattern for repo-relative paths (e.g. src/**/*.ts). * = one segment, ** = any depth.',
    exclude_pattern: 'Glob pattern to exclude from selection (e.g. **/*.test.ts or {tests,examples}/**).',
    status: 'Filter by Git change type: added, modified, deleted, renamed. Only applies when not using Select all.',
    select_all: 'When on, check entire repo instead of only changed files (e.g. for critical rules).',
    pattern: 'Regex to match lines within the selected file(s).',
    regex_flags: 'Optional regex flags (e.g. i for case-insensitive, g for global).',
    query: 'ast-grep pattern (e.g. eval($CODE) or async_function).',
    language: 'Language for parsing (TypeScript, JavaScript, TSX, HTML, CSS).',
    min_percentage: 'Minimum percentage of lines changed (inclusive). Used with max to define a range.',
    max_percentage: 'Maximum percentage of lines changed (inclusive). Used to limit or detect large changes.',
    command: 'Shell command to run; assertion will check exit code or stdout/stderr.',

    // Assertion types
    assert_match: 'Check if the item\'s text matches (or does not match) a regex.',
    assert_count: 'Check that the number of selected items satisfies a condition.',
    assert_property: 'Check a property of the item (e.g. path, stdout) against an expected value.',
    assert_line_count: 'Check that line count of file or content satisfies a condition (e.g. <= 450).',
    assert_command_output: 'Check command exit code or that stdout/stderr matches a pattern.',

    // Assertion fields
    assert_pattern: 'Regex to match (or forbid if Should match is off).',
    should_match: 'On = content must match pattern. Off = content must NOT match (forbid pattern).',
    property_path: 'Dot path to property (e.g. stdout, path, or user.name).',
    extract_pattern: 'Optional regex with one capture group to extract a value from the property before comparing.',
    assert_line_count_desc: 'Compare line count with operator (e.g. <= 450). Trailing empty lines ignored.',
    target: 'Check exitCode (number), stdout, or stderr (text).',

    // Message and Suggestion (assertion failure UX)
    message: 'Custom failure message when the assertion fails. Shown as the main error line in CLI/reports. Overrides the default engine message where supported (e.g. assert_line_count).',
    suggestion: 'Actionable guidance shown when the rule fails (e.g. "Move to scripts/" or "Use parameterized queries"). Displayed as "Suggestion: ..." in console output. Helps users and AI fix the violation.',
};

/**
 * Get help text for a combinator or rule type. Falls back to generic message if key missing.
 */
export function getTypeHelp(type) {
    return helpText[type] || `Help for "${type}".`;
}
