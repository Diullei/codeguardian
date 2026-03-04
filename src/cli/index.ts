#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { promises as fs } from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { createInterface } from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { GitRepository } from '../adapters';
import { createRuleFactory, ConfigurationLoader } from '../config';
import { ResultCache } from '../core';
import { EvaluationContext, Mode } from '../types';
import { ConsoleReporter, JsonReporter, ValidationReport } from '../reporters';
import { resolveRepositoryPath } from '../utils/findGitRoot';

interface ValidateArgs {
    config?: string;
    exclude?: string[];
    repo?: string;
    C?: string;
    base: string;
    head?: string;
    format?: 'console' | 'json';
    mode?: Mode;
    skipMissingAstGrep?: boolean;
    claudeCodeHook?: boolean;
}

export interface EditArgs {
    file?: string;
    port?: number;
    host?: string;
    noOpen?: boolean;
}

const cli = yargs(hideBin(process.argv))
    .scriptName('codeguardian')
    .usage('$0 <cmd> [args]')
    .command<ValidateArgs>(
        'check',
        'Check code changes against rules (analyzes Git diff between branches)',
        yargs => {
            return yargs
                .group(['config', 'exclude'], 'Configuration Options:')
                .group(['repo', 'base', 'head'], 'Repository Options:')
                .group(['format'], 'Output Options:')
                .option('config', {
                    alias: 'c',
                    type: 'string',
                    description: 'Path to rule configuration file or glob pattern',
                    example: 'codeguardian check -c "rules/*.yaml"',
                })
                .option('exclude', {
                    alias: 'e',
                    type: 'array',
                    description: 'Glob patterns to exclude from configuration file search',
                    example: 'codeguardian check --exclude "examples/**" "test-*"',
                })
                .option('repo', {
                    alias: 'r',
                    type: 'string',
                    description: 'Path to the repository to validate (disables auto-discovery)',
                })
                .option('C', {
                    type: 'string',
                    description: 'Change to directory before running (like git -C)',
                })
                .option('base', {
                    alias: 'b',
                    type: 'string',
                    description: 'Base branch/commit for comparison',
                    default: 'main',
                })
                .option('head', {
                    type: 'string',
                    description: 'Head branch/commit to compare',
                    default: 'HEAD',
                })
                .option('format', {
                    alias: 'f',
                    type: 'string',
                    choices: ['console', 'json'] as const,
                    description: 'Output format for validation results',
                    default: 'console',
                })
                .option('mode', {
                    alias: 'm',
                    type: 'string',
                    choices: ['diff', 'all', 'staged'] as const,
                    description:
                        'What to check: diff (changes between branches), all (entire working directory), staged (staged files only)',
                    default: 'diff',
                })
                .option('skip-missing-ast-grep', {
                    type: 'boolean',
                    description:
                        'Skip AST-based rules and show a warning if the ast-grep CLI is not installed',
                    default: false,
                })
                .option('claude-code-hook', {
                    type: 'boolean',
                    description:
                        'Claude Code hook compatibility mode: exit with code 2 on violations, run silently on success',
                    default: false,
                })
                .epilogue(
                    'Examples:\n' +
                        '  # Auto-discover repository root and configuration files\n' +
                        '  $ codeguardian check\n\n' +
                        '  # Change to directory first (like git -C)\n' +
                        '  $ codeguardian check -C /path/to/repo\n\n' +
                        '  # Use explicit repository path (no auto-discovery)\n' +
                        '  $ codeguardian check --repo /path/to/repo\n\n' +
                        '  # Use specific configuration file\n' +
                        '  $ codeguardian check -c rules.yaml\n\n' +
                        '  # Use glob pattern to check multiple files\n' +
                        '  $ codeguardian check -c "**/*.cg.yaml"\n\n' +
                        '  # Exclude test directories from search\n' +
                        '  $ codeguardian check --exclude "examples/**" "test-*"\n\n' +
                        '  # Multiple exclude patterns\n' +
                        '  $ codeguardian check -e "**/test/**" -e "**/vendor/**"'
                );
        },
        async args => {
            try {
                await runValidation(args);
            } catch (error) {
                console.error('Error:', error instanceof Error ? error.message : String(error));
                process.exit(1);
            }
        }
    )
    .command<EditArgs>(
        'edit [file]',
        'Edit a rule file using a web-based UI',
        yargs => {
            return yargs
                .positional('file', {
                    type: 'string',
                    description: 'Path to rule file to edit',
                })
                .option('file', {
                    alias: 'f',
                    type: 'string',
                    description: 'Path to rule file to edit',
                })
                .option('port', {
                    alias: 'p',
                    type: 'number',
                    description: 'Port for the web server',
                    default: 3847,
                })
                .option('host', {
                    type: 'string',
                    description: 'Bind address for the web server',
                    default: '127.0.0.1',
                })
                .option('no-open', {
                    type: 'boolean',
                    description: 'Skip opening browser automatically',
                    default: false,
                })
                .example(
                    '$0 edit .codeguardian/development-rules.cg.yaml',
                    'Edit the development rules file'
                )
                .example('$0 edit -p 3000 --no-open', 'Edit on port 3000 without opening browser');
        },
        async args => {
            try {
                await runEdit(args);
            } catch (error) {
                console.error('Error:', error instanceof Error ? error.message : String(error));
                process.exit(1);
            }
        }
    )
    .demandCommand(1, 'You need at least one command before moving on')
    .help()
    .version()
    .strict();

async function runValidation(args: ValidateArgs) {
    const startTime = Date.now();

    // Resolve repository path using auto-discovery
    const repoPath = resolveRepositoryPath(args.repo, args.C);

    // Load configurations using ConfigurationLoader
    const loader = new ConfigurationLoader();
    const configurations = await loader.loadConfigurations(args.config, repoPath, args.exclude);

    // Store configuration info for later use
    const configurationFiles = configurations.map(config => path.relative(repoPath, config.path));

    // Create rule factory
    const factory = createRuleFactory();

    // Initialize repository
    const repository = new GitRepository(repoPath);

    // Use the actual base branch, falling back to default if needed
    let baseBranch = args.base;
    if (args.base === 'main') {
        // If user didn't override the default, check what the actual default branch is
        baseBranch = await repository.getDefaultBranch();
    }

    const diff = await repository.getDiff(baseBranch, args.head || 'HEAD');

    // Create evaluation context
    const context: EvaluationContext = {
        repository,
        diff,
        cache: new ResultCache(),
        config: { type: 'placeholder' },
        mode: args.mode || 'diff',
        cliArgs: {
            skipMissingAstGrep: args.skipMissingAstGrep,
        },
    };

    // Process each configuration file
    const allResults: ValidationReport['results'] = [];
    let totalConfigsFailed = 0;
    let totalViolations = 0;
    let totalFiles = 0;
    let totalIndividualRules = 0;
    let individualRulesPassed = 0;
    let individualRulesFailed = 0;

    for (const loadedConfig of configurations) {
        const configData = loadedConfig.content;

        // Load rule from YAML content
        const yamlContent = await fs.readFile(loadedConfig.path, 'utf-8');
        const rule = factory.loadFromYAML(yamlContent);

        // Count individual rules if the rule has countRules method
        if ('countRules' in rule && typeof rule.countRules === 'function') {
            totalIndividualRules += rule.countRules();
        } else {
            totalIndividualRules += 1;
        }

        // Evaluate rule
        const result = await rule.evaluate(context);

        // Count individual rule results
        if (result.subResults) {
            for (const subResult of result.subResults) {
                if (subResult.passed) {
                    individualRulesPassed++;
                } else {
                    individualRulesFailed++;
                }
            }
        } else {
            // If no subResults, count the main result as 1 rule
            if (result.passed) {
                individualRulesPassed++;
            } else {
                individualRulesFailed++;
            }
        }

        if (!result.passed) {
            totalConfigsFailed++;
        }

        totalViolations += result.violations?.length || 0;

        // Add to results
        allResults.push({
            ruleId: configData.id || rule.id,
            ruleDescription:
                configData.description || `Rules from ${path.basename(loadedConfig.path)}`,
            configFile: path.relative(repoPath, loadedConfig.path),
            passed: result.passed,
            violations: (result.violations || []).map(v => ({
                file: v.file,
                line: v.line,
                column: v.column,
                message: v.message,
                severity: v.severity,
                context: v.context,
            })),
        });
    }

    // Create validation report
    // Get actual file count based on mode
    if (args.mode === 'all') {
        const allFiles = await repository.getFiles(diff, 'all');
        totalFiles = allFiles.length;
    } else if (args.mode === 'staged') {
        const stagedFiles = await repository.getFiles(diff, 'staged');
        totalFiles = stagedFiles.length;
    } else {
        totalFiles = diff.files.length;
    }

    const duration = Date.now() - startTime;
    const overallPassed = totalConfigsFailed === 0;

    const report: ValidationReport = {
        passed: overallPassed,
        summary: {
            totalFiles,
            passedRules: individualRulesPassed,
            failedRules: individualRulesFailed,
            violations: totalViolations,
            totalIndividualRules: totalIndividualRules,
        },
        results: allResults,
        diff,
        duration,
        originalCliArgs: {
            config: args.config,
            exclude: args.exclude,
            repo: args.repo,
            C: args.C,
            base: args.base,
            head: args.head,
            mode: args.mode,
        },
    };

    // Select reporter based on format
    const reporter =
        args.format === 'json'
            ? new JsonReporter()
            : new ConsoleReporter({ claudeCodeHook: args.claudeCodeHook });

    // Only show configuration info if:
    // 1. Not in JSON format
    // 2. Not in claude-code-hook mode (to save tokens)
    if (args.format !== 'json' && !args.claudeCodeHook) {
        console.log(`Found ${configurations.length} configuration file(s):`);

        // Sort for readability
        const sortedFiles = [...configurationFiles].sort();
        sortedFiles.forEach(file => {
            console.log(`  - ${file}`);
        });
        console.log();
    }

    // Report results
    await reporter.report(report);

    // Exit with appropriate code
    if (!overallPassed) {
        // In Claude Code hook mode, exit with code 2 for violations
        process.exit(args.claudeCodeHook ? 2 : 1);
    }
}

async function runEdit(args: EditArgs) {
    const { startEditServer } = await import('./edit-server');
    const editArgs: EditArgs = { ...args };

    if (!editArgs.file) {
        const discoveredFiles = await discoverRuleFiles(process.cwd());
        const selectedFile = await selectRuleFile(discoveredFiles);

        if (selectedFile) {
            editArgs.file = selectedFile;
        } else {
            editArgs.file = '.codeguardian/development-rules.cg.yaml';
            console.log(
                `No existing rule files found. Using default: ${path.resolve(editArgs.file)}`
            );
        }
    }

    await startEditServer(editArgs);
}

async function discoverRuleFiles(basePath: string): Promise<string[]> {
    const patterns = [
        '**/*.codeguardian.yaml',
        '**/*.codeguardian.yml',
        '**/*.cg.yaml',
        '**/*.cg.yml',
        '.codeguardian.yaml',
        '.codeguardian.yml',
        '.cg.yaml',
        '.cg.yml',
        '.codeguardian/*.yaml',
        '.codeguardian/*.yml',
        '.codeguardian/*.cg.yaml',
        '.codeguardian/*.cg.yml',
        '.codeguardian/*.codeguardian.yaml',
        '.codeguardian/*.codeguardian.yml',
    ];
    const ignore = ['**/node_modules/**', '**/dist/**', '**/.git/**'];
    const allMatches: string[] = [];

    for (const pattern of patterns) {
        const matches = await glob(pattern, {
            cwd: basePath,
            absolute: true,
            ignore,
        });
        allMatches.push(...matches);
    }

    return [...new Set(allMatches)].sort((a, b) => a.localeCompare(b));
}

async function selectRuleFile(files: string[]): Promise<string | undefined> {
    if (files.length === 0) {
        return undefined;
    }
    if (files.length === 1) {
        return files[0];
    }

    if (!process.stdin.isTTY || !process.stdout.isTTY) {
        const firstFile = files[0];
        if (firstFile) {
            console.warn(
                `Multiple rule files found but terminal is non-interactive. Using: ${firstFile}`
            );
        }
        return firstFile;
    }

    console.log('Multiple rule files found. Select one to edit:');
    files.forEach((file, index) => {
        console.log(`  ${index + 1}. ${path.relative(process.cwd(), file) || file}`);
    });

    const rl = createInterface({ input, output });
    try {
        while (true) {
            const answer = (await rl.question(`Choose file [1-${files.length}] (default: 1): `))
                .trim();
            if (answer === '') {
                return files[0];
            }

            const choice = Number.parseInt(answer, 10);
            if (Number.isInteger(choice) && choice >= 1 && choice <= files.length) {
                return files[choice - 1];
            }

            console.log(`Invalid selection. Enter a number between 1 and ${files.length}.`);
        }
    } finally {
        rl.close();
    }
}

// Run CLI
cli.parse();
