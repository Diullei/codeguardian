#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { promises as fs } from 'fs';
import * as path from 'path';
import { GitRepository } from '../adapters';
import { createRuleFactory, ConfigurationLoader } from '../config';
import { ResultCache } from '../core';
import { EvaluationContext } from '../types';
import { ConsoleReporter, JsonReporter, ValidationReport } from '../reporters';
import { PromptGenerator } from '../prompt-generator';

interface ValidateArgs {
    config?: string;
    exclude?: string[];
    repo: string;
    base: string;
    head?: string;
    format?: 'console' | 'json';
    skipMissingAstGrep?: boolean;
}

interface GeneratePromptArgs {
    task?: string;
    taskFile?: string;
    output?: string;
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
        'Generate a prompt for an AI to write a task validation rule',
        (yargs) => {
            return yargs
                .option('task', {
                    type: 'string',
                    description: 'The task description for the AI.',
                })
                .option('task-file', {
                    type: 'string',
                    description: 'Path to a file containing the task description.',
                })
                .option('output', {
                    alias: 'o',
                    type: 'string',
                    description: 'Path to save the generated prompt file.',
                })
                .check((argv) => {
                    if (!argv.task && !argv.taskFile) {
                        throw new Error('You must provide the task description using either --task or --task-file.');
                    }
                    return true;
                })
                .conflicts('task', 'task-file');
        },
        async (args) => {
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
        cliArgs: {
            skipMissingAstGrep: args.skipMissingAstGrep,
        },
    };

    // Process each configuration file
    const allResults: ValidationReport['results'] = [];
    let totalPassed = 0;
    let totalFailed = 0;
    let totalViolations = 0;

    for (const loadedConfig of configurations) {
        const configData = loadedConfig.content;

        // Load rule from YAML content
        const yamlContent = await fs.readFile(loadedConfig.path, 'utf-8');
        const rule = factory.loadFromYAML(yamlContent);

        // Evaluate rule
        const result = await rule.evaluate(context);

        if (result.passed) {
            totalPassed++;
        } else {
            totalFailed++;
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
    const duration = Date.now() - startTime;
    const overallPassed = totalFailed === 0;

    const report: ValidationReport = {
        passed: overallPassed,
        summary: {
            totalFiles: diff.files.length,
            passedRules: totalPassed,
            failedRules: totalFailed,
            violations: totalViolations,
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
        let taskContent: string;

        if (args.taskFile) {
            taskContent = await fs.readFile(args.taskFile, 'utf-8');
        } else {
            taskContent = args.task!;
        }

        const generator = new PromptGenerator();
        const finalPrompt = await generator.generate(taskContent);

        if (args.output) {
            await fs.writeFile(args.output, finalPrompt);
            console.log(`Prompt successfully saved to: ${args.output}`);
        } else {
            console.log(finalPrompt);
        }
    } catch (error) {
        console.error('Error generating prompt:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}

// Run CLI
cli.parse();
