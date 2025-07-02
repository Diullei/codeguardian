import { ConsoleReporter } from '../../../src/reporters/ConsoleReporter';
import { ValidationReport } from '../../../src/reporters/types';
import { DiffInfo } from '../../../src/types';

describe('ConsoleReporter', () => {
    let consoleLogSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;
    
    const mockDiff: DiffInfo = {
        baseBranch: 'main',
        headBranch: 'feature',
        files: [],
    };

    beforeEach(() => {
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });

    describe('claude-code-hook mode', () => {
        it('should run silently when all rules pass', () => {
            const reporter = new ConsoleReporter({ claudeCodeHook: true });
            const report: ValidationReport = {
                passed: true,
                summary: {
                    totalFiles: 10,
                    passedRules: 5,
                    failedRules: 0,
                    violations: 0,
                    totalIndividualRules: 5,
                },
                results: [],
                diff: mockDiff,
                duration: 1000,
            };

            reporter.report(report);

            expect(consoleLogSpy).not.toHaveBeenCalled();
            expect(consoleErrorSpy).not.toHaveBeenCalled();
        });

        it('should show output when there are violations', () => {
            const reporter = new ConsoleReporter({ claudeCodeHook: true });
            const report: ValidationReport = {
                passed: false,
                summary: {
                    totalFiles: 10,
                    passedRules: 4,
                    failedRules: 1,
                    violations: 1,
                    totalIndividualRules: 5,
                },
                results: [
                    {
                        ruleId: 'test-rule',
                        ruleDescription: 'Test rule',
                        passed: false,
                        violations: [
                            {
                                file: 'test.ts',
                                line: 1,
                                message: 'Test violation',
                                severity: 'error',
                            },
                        ],
                    },
                ],
                diff: mockDiff,
                duration: 1000,
            };

            reporter.report(report);

            // In claude-code-hook mode with violations, output goes to stderr
            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(consoleLogSpy).not.toHaveBeenCalled();
            // Should show session header
            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('validation session starts'));
            // Should show failures
            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('FAILURES'));
        });
    });

    describe('normal mode', () => {
        it('should always show output', () => {
            const reporter = new ConsoleReporter({ claudeCodeHook: false });
            const report: ValidationReport = {
                passed: true,
                summary: {
                    totalFiles: 10,
                    passedRules: 5,
                    failedRules: 0,
                    violations: 0,
                    totalIndividualRules: 5,
                },
                results: [],
                diff: mockDiff,
                duration: 1000,
            };

            reporter.report(report);

            // In normal mode, output goes to stdout
            expect(consoleLogSpy).toHaveBeenCalled();
            expect(consoleErrorSpy).not.toHaveBeenCalled();
            // Should show session header
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('validation session starts'));
        });
    });
});