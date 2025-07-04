import { ValidationReport, ValidationReporter, ViolationDetail } from './types';

export interface ConsoleReporterOptions {
    claudeCodeHook?: boolean;
}

export class ConsoleReporter implements ValidationReporter {
    private readonly claudeCodeHook: boolean;
    private log: typeof console.log;

    constructor(options: ConsoleReporterOptions = {}) {
        this.claudeCodeHook = options.claudeCodeHook || false;
        // In claude-code-hook mode, use stderr for output
        this.log = this.claudeCodeHook ? console.error : console.log;
    }

    private readonly colors = {
        reset: '\x1b[0m',
        bright: '\x1b[1m',
        dim: '\x1b[2m',
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        cyan: '\x1b[36m',
        white: '\x1b[37m',
        bgRed: '\x1b[41m',
        bgGreen: '\x1b[42m',
    };

    report(report: ValidationReport): void {
        // In Claude Code hook mode, run silently on success
        if (this.claudeCodeHook && report.passed) {
            return;
        }

        // Session header (pytest style)
        this.log(this.color('='.repeat(80), 'cyan'));
        this.log(this.color('validation session starts', 'cyan', 'bright'));
        this.log(`platform ${process.platform} -- Node ${process.version}, codeguardian-1.0.0`);
        this.log(`rootdir: ${process.cwd()}`);
        const individualRules = report.summary.totalIndividualRules || 0;
        const configFiles = report.results.length;
        this.log(`collected ${report.summary.totalFiles} files, ${individualRules} ${individualRules === 1 ? 'rule' : 'rules'} (${configFiles} config ${configFiles === 1 ? 'file' : 'files'})`);
        this.log('');

        // Violations (keep existing detailed format)
        if (!report.passed && report.results.some(r => !r.passed)) {
            this.log(this.color('FAILURES', 'red', 'bright'));
            this.log(this.color('='.repeat(80), 'red'));

            report.results
                .filter(r => !r.passed)
                .forEach((result, index) => {
                    if (index > 0) this.log('');
                    this.printRuleViolations(result);
                });
        }

        // Summary (pytest style)
        this.log('');
        this.log(this.color('='.repeat(80), report.passed ? 'green' : 'red'));
        this.printPytestStyleSummary(report);
    }

    private printPytestStyleSummary(report: ValidationReport): void {
        const { summary } = report;
        const duration = report.duration / 1000; // Convert to seconds

        if (report.passed) {
            // Success format: "==== 12 rules passed in 0.12s ===="
            const passedText = `${summary.passedRules} ${summary.passedRules === 1 ? 'rule' : 'rules'} passed`;
            this.log(
                this.color(
                    `${'='.repeat(4)} ${passedText} in ${duration.toFixed(2)}s ${'='.repeat(80 - passedText.length - 13)}`,
                    'green',
                    'bright'
                )
            );
        } else {
            // Failure format: "==== 1 rule failed, 11 rules passed in 0.45s ===="
            const parts = [];
            if (summary.failedRules > 0) {
                parts.push(this.color(`${summary.failedRules} ${summary.failedRules === 1 ? 'rule' : 'rules'} failed`, 'red', 'bright'));
            }
            if (summary.passedRules > 0) {
                parts.push(this.color(`${summary.passedRules} ${summary.passedRules === 1 ? 'rule' : 'rules'} passed`, 'green'));
            }

            const statusText = parts.join(', ');
            const fullText = `${statusText} in ${duration.toFixed(2)}s`;

            // Calculate padding
            const textLength = fullText.replace(/\x1b\[[0-9;]*m/g, '').length; // Remove ANSI codes for length calculation
            const padding = Math.max(0, 80 - textLength - 8);

            this.log(`${'='.repeat(4)} ${fullText} ${'='.repeat(padding)}`);
        }

        // Show file and violation counts
        this.log('');
        const fileInfo = `Validated ${summary.totalFiles} ${summary.totalFiles === 1 ? 'file' : 'files'}`;
        const violationInfo = summary.violations > 0 
            ? `, found ${summary.violations} ${summary.violations === 1 ? 'violation' : 'violations'}`
            : '';
        this.log(this.color(`${fileInfo}${violationInfo}`, 'dim'));

        // Additional pytest-style info
        if (!report.passed) {
            this.log(
                this.color('\nHint: ', 'yellow') + 'use --format=json for machine-readable output'
            );
        }
    }

    private printRuleViolations(result: any): void {
        this.log(this.color(result.ruleId, 'red', 'bright'));

        // Show configuration file path
        if (result.configFile) {
            this.log(this.color(`From: ${result.configFile}`, 'cyan'));
        }

        if (result.ruleDescription) {
            this.log(this.color(`${result.ruleDescription}`, 'dim'));
        }

        this.log(''); // Empty line before violations

        result.violations.forEach((violation: ViolationDetail) => {
            this.printViolation(violation);
        });
    }

    private printViolation(violation: ViolationDetail): void {
        // Pytest-style format: file:line: message
        const location = this.formatLocation(violation);

        // Main error line (pytest uses > for the main assertion)
        this.log(this.color(`> ${location}`, 'bright'));
        this.log(this.color('[CHECK FAIL] ' + violation.message, 'red', 'bright'));

        // Context
        if (violation.context) {
            if (violation.context.code) {
                this.log('');
                // Show code snippet with line numbers (simplified)
                const codeLines = violation.context.code.split('\n').slice(0, 3);
                codeLines.forEach(line => {
                    this.log(this.color(`  ${line}`, 'dim'));
                });
            }

            if (violation.context.suggestion) {
                this.log('');
                this.log(this.color('  Suggestion: ', 'yellow') + violation.context.suggestion);
            }

            if (violation.context.documentation) {
                this.log(this.color('  See: ', 'cyan') + violation.context.documentation);
            }
        }
        this.log(''); // Empty line between violations
    }

    private formatLocation(violation: ViolationDetail): string {
        if (!violation.file) return 'General';

        let location = violation.file;
        if (violation.line !== undefined) {
            location += `:${violation.line}`;
            if (violation.column !== undefined) {
                location += `:${violation.column}`;
            }
        }

        return location;
    }

    private color(text: string, ...colors: string[]): string {
        let result = text;

        for (const color of colors) {
            const colorCode = this.colors[color as keyof typeof this.colors];
            if (colorCode) {
                result = colorCode + result + this.colors.reset;
            }
        }

        return result;
    }
}
