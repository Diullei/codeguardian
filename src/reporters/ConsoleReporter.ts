import { ValidationReport, ValidationReporter, ViolationDetail } from './types';
import { generateFullViewCommand } from '../utils/cliCommandBuilder';

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

        // Use compact format for claude-code-hook mode
        if (this.claudeCodeHook && !report.passed) {
            this.reportCompact(report);
            return;
        }

        // Regular detailed format for normal mode
        this.reportDetailed(report);
    }

    private reportCompact(report: ValidationReport): void {
        // Collect all violations across all rules
        const allViolations: Array<ViolationDetail & { ruleId: string }> = [];
        
        report.results
            .filter(r => !r.passed)
            .forEach(result => {
                result.violations.forEach(violation => {
                    allViolations.push({
                        ...violation,
                        ruleId: result.ruleId
                    });
                });
            });

        // Prioritize violations
        const prioritizedViolations = this.prioritizeViolations(allViolations);
        
        // Determine how many to show
        const maxToShow = 5;
        const totalViolations = prioritizedViolations.length;
        const violationsToShow = prioritizedViolations.slice(0, maxToShow);
        const remainingCount = Math.max(0, totalViolations - maxToShow);

        // Compact header
        this.log(`VIOLATIONS (${totalViolations} total${remainingCount > 0 ? `, showing first ${violationsToShow.length}` : ''}):`)
        this.log('');

        // Show violations in compact format
        violationsToShow.forEach(violation => {
            this.printCompactViolation(violation);
        });

        // Show command to see all violations if truncated
        if (remainingCount > 0 && report.originalCliArgs) {
            const fullCommand = generateFullViewCommand(report.originalCliArgs);
            this.log(`+${remainingCount} more violation${remainingCount === 1 ? '' : 's'}. Run: ${fullCommand}`);
        }
    }

    private reportDetailed(report: ValidationReport): void {
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

    private prioritizeViolations(violations: Array<ViolationDetail & { ruleId: string }>): Array<ViolationDetail & { ruleId: string }> {
        return violations.sort((a, b) => {
            // 1. Security/error severity first
            if (a.severity === 'error' && b.severity !== 'error') return -1;
            if (a.severity !== 'error' && b.severity === 'error') return 1;
            
            // 2. Files with line numbers (more specific) first
            if (a.line !== undefined && b.line === undefined) return -1;
            if (a.line === undefined && b.line !== undefined) return 1;
            
            // 3. Alphabetical by file
            if (a.file && b.file) {
                return a.file.localeCompare(b.file);
            }
            
            return 0;
        });
    }

    private printCompactViolation(violation: ViolationDetail & { ruleId: string }): void {
        const location = this.formatLocation(violation);
        const ruleDisplay = `[${violation.ruleId}]`;
        
        // Remove ANSI colors for claude-code-hook mode to save tokens
        this.log(`${location} ${ruleDisplay}`);
        
        // Extract the issue from the message
        const foundText = this.extractFoundText(violation);
        if (foundText) {
            this.log(`  Found: ${foundText}`);
        }
        
        // Show fix suggestion if available
        const fixText = this.extractFixText(violation);
        if (fixText) {
            this.log(`  Fix: ${fixText}`);
        } else if (violation.context?.suggestion) {
            this.log(`  Fix: ${violation.context.suggestion}`);
        }
        
        this.log(''); // Empty line between violations
    }

    private extractFoundText(violation: ViolationDetail): string | null {
        // Try to extract meaningful "found" text from violation message or context
        if (violation.context?.code) {
            // Get the first non-empty line of code, truncated
            const firstLine = violation.context.code.split('\n').find(line => line.trim());
            if (firstLine) {
                return firstLine.trim().substring(0, 60) + (firstLine.length > 60 ? '...' : '');
            }
        }
        
        // Extract from message if it contains patterns like "Found:", "contains", etc.
        const foundMatch = violation.message.match(/(?:found|contains|has|detected)[\s:]+(.+?)(?:\s+(?:but|in|at|$))/i);
        if (foundMatch && foundMatch[1]) {
            return foundMatch[1].substring(0, 60);
        }
        
        return null;
    }

    private extractFixText(violation: ViolationDetail): string | null {
        // Common fix suggestions based on rule types and messages
        const message = violation.message.toLowerCase();
        
        if (message.includes('console.log') || message.includes('console')) {
            return 'Remove console.log or use proper logger';
        }
        
        if (message.includes('unused')) {
            return 'Remove unused code';
        }
        
        if (message.includes('import') && message.includes('infrastructure')) {
            return 'Remove infrastructure import from domain layer';
        }
        
        if (message.includes('try-catch') || message.includes('error handling')) {
            return 'Add error handling';
        }
        
        if (message.includes('validation') || message.includes('sanitiz')) {
            return 'Add input validation';
        }
        
        if (message.includes('secret') || message.includes('password')) {
            return 'Use environment variables';
        }
        
        if (message.includes('not allowed') || message.includes('should not')) {
            return 'Remove disallowed code';
        }
        
        return null;
    }

    private color(text: string, ...colors: string[]): string {
        // Don't apply colors in claude-code-hook mode to save tokens
        if (this.claudeCodeHook) {
            return text;
        }

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
