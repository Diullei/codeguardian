#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { promises as fs } from 'fs';
import * as path from 'path';
import { GitRepository } from '../adapters';
import { createRuleFactory, ConfigurationLoader } from '../config';
import { ResultCache } from '../core';
import { EvaluationContext, Mode } from '../types';
import { ConsoleReporter, JsonReporter, ValidationReport } from '../reporters';
import { PromptGenerator } from '../prompt-generator';

interface ValidateArgs {
    config?: string;
    exclude?: string[];
    repo: string;
    base: string;
    head?: string;
    format?: 'console' | 'json';
    mode?: Mode;
    skipMissingAstGrep?: boolean;
}

interface GeneratePromptArgs {
    task?: string;
    taskFile?: string;
    output?: string;
    mode?: 'task' | 'rule';
    description?: string;
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
                    description: 'Path to the repository to validate',
                    default: '.',
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
                    description: 'What to check: diff (changes between branches), all (entire working directory), staged (staged files only)',
                    default: 'diff',
                })
                .option('skip-missing-ast-grep', {
                    type: 'boolean',
                    description:
                        'Skip AST-based rules and show a warning if the ast-grep CLI is not installed',
                    default: false,
                })
                .epilogue(
                    'Examples:\n' +
                        '  # Auto-discover configuration files\n' +
                        '  $ codeguardian check\n\n' +
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
    .command<GeneratePromptArgs>(
        'generate-prompt',
        'Generate a prompt for an AI to write validation rules',
        (yargs) => {
            return yargs
                .option('mode', {
                    alias: 'm',
                    type: 'string',
                    choices: ['task', 'rule'] as const,
                    description: 'Generation mode: task (validation for a specific task) or rule (general rule from description)',
                    default: 'task',
                })
                .option('task', {
                    type: 'string',
                    description: 'The task description for the AI (used in task mode).',
                })
                .option('task-file', {
                    type: 'string',
                    description: 'Path to a file containing the task description (used in task mode).',
                })
                .option('description', {
                    alias: 'd',
                    type: 'string',
                    description: 'Rule description for generating a validation rule (used in rule mode).',
                })
                .option('output', {
                    alias: 'o',
                    type: 'string',
                    description: 'Path to save the generated output (prompt in task mode, rule YAML in rule mode).',
                })
                .check((argv) => {
                    if (argv.mode === 'task' && !argv.task && !argv.taskFile) {
                        throw new Error('In task mode, you must provide the task description using either --task or --task-file.');
                    }
                    if (argv.mode === 'rule' && !argv.description) {
                        throw new Error('In rule mode, you must provide a rule description using --description.');
                    }
                    return true;
                })
                .conflicts('task', 'task-file')
                .epilogue(
                    'Examples:\n' +
                    '  # Generate prompt for task validation (default mode)\n' +
                    '  $ codeguardian generate-prompt --task "Add user authentication"\n\n' +
                    '  # Generate a rule from description\n' +
                    '  $ codeguardian generate-prompt --mode rule --description "No console.log in production code"\n\n' +
                    '  # Save output to file\n' +
                    '  $ codeguardian generate-prompt -m rule -d "Enforce clean architecture" -o clean-arch.cg.yaml'
                );
        },
        async (args) => {
            // Check if experimental features are enabled
            if (!process.env.CODEGUARDIAN_EXPERIMENTAL) {
                console.error('Error: The generate-prompt command is experimental and requires the CODEGUARDIAN_EXPERIMENTAL environment variable to be set.');
                console.error('To enable experimental features, run:');
                console.error('  export CODEGUARDIAN_EXPERIMENTAL=1');
                process.exit(1);
            }
            await runPromptGeneration(args);
        }
    )
    .demandCommand(1, 'You need at least one command before moving on')
    .help()
    .version()
    .strict();

async function runValidation(args: ValidateArgs) {
    const startTime = Date.now();

    // Load configurations using ConfigurationLoader
    const loader = new ConfigurationLoader();
    const configurations = await loader.loadConfigurations(args.config, args.repo, args.exclude);

    // Only log to console if not using JSON format
    if (args.format !== 'json') {
        console.log(`Found ${configurations.length} configuration file(s):`);

        // Sort configurations by relative path for better readability
        const sortedConfigs = [...configurations].sort((a, b) => {
            const pathA = path.relative(args.repo, a.path);
            const pathB = path.relative(args.repo, b.path);
            return pathA.localeCompare(pathB);
        });

        sortedConfigs.forEach(config => {
            console.log(`  - ${path.relative(args.repo, config.path)}`);
        });
        console.log();
    }

    // Create rule factory
    const factory = createRuleFactory();

    // Initialize repository
    const repository = new GitRepository(path.resolve(args.repo));
    const diff = await repository.getDiff(args.base, args.head || 'HEAD');

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
    let totalConfigsPassed = 0;
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

        if (result.passed) {
            totalConfigsPassed++;
        } else {
            totalConfigsFailed++;
        }

        totalViolations += result.violations?.length || 0;

        // Add to results
        allResults.push({
            ruleId: configData.id || rule.id,
            ruleDescription:
                configData.description || `Rules from ${path.basename(loadedConfig.path)}`,
            configFile: path.relative(args.repo, loadedConfig.path),
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
    };

    // Select reporter based on format
    const reporter = args.format === 'json' ? new JsonReporter() : new ConsoleReporter();

    // Report results
    await reporter.report(report);

    // Exit with appropriate code
    if (!overallPassed) {
        process.exit(1);
    }
}

async function runPromptGeneration(args: GeneratePromptArgs) {
    try {
        const generator = new PromptGenerator();
        let output: string;

        if (args.mode === 'rule') {
            // Rule generation mode
            output = await generator.generateRule(args.description!);
        } else {
            // Task validation mode (default)
            let taskContent: string;
            if (args.taskFile) {
                taskContent = await fs.readFile(args.taskFile, 'utf-8');
            } else {
                taskContent = args.task!;
            }
            output = await generator.generateTaskPrompt(taskContent);
        }

        if (args.output) {
            await fs.writeFile(args.output, output);
            const messageType = args.mode === 'rule' ? 'Rule' : 'Prompt';
            console.log(`${messageType} successfully saved to: ${args.output}`);
        } else {
            console.log(output);
        }
    } catch (error) {
        console.error('Error generating output:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}

// Run CLI
cli.parse();
