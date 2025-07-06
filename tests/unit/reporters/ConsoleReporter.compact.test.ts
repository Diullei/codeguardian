import { ConsoleReporter } from '../../../src/reporters/ConsoleReporter';
import { ValidationReport, ViolationDetail } from '../../../src/reporters/types';
import { DiffInfo } from '../../../src/types';

describe('ConsoleReporter - Compact Mode', () => {
    let mockLog: jest.Mock;
    let reporter: ConsoleReporter;

    beforeEach(() => {
        mockLog = jest.fn();
        reporter = new ConsoleReporter({ claudeCodeHook: true });
        // Override the log method to capture output
        (reporter as any).log = mockLog;
    });

    const createMockReport = (violations: ViolationDetail[], originalCliArgs?: any): ValidationReport => {
        const mockDiff: DiffInfo = {
            baseBranch: 'main',
            headBranch: 'HEAD',
            files: []
        };

        return {
            passed: violations.length === 0,
            summary: {
                totalFiles: 5,
                passedRules: violations.length === 0 ? 1 : 0,
                failedRules: violations.length === 0 ? 0 : 1,
                violations: violations.length,
                totalIndividualRules: 1
            },
            results: violations.length === 0 ? [] : [{
                ruleId: 'test-rule',
                ruleDescription: 'Test rule',
                configFile: 'test.yaml',
                passed: false,
                violations
            }],
            diff: mockDiff,
            duration: 100,
            originalCliArgs
        };
    };

    describe('Silent success behavior', () => {
        it('should not output anything when all rules pass', () => {
            const report = createMockReport([]);
            
            reporter.report(report);
            
            expect(mockLog).not.toHaveBeenCalled();
        });
    });

    describe('Compact violation format', () => {
        it('should display violations in compact format', () => {
            const violations: ViolationDetail[] = [
                {
                    file: 'src/auth/login.ts',
                    line: 42,
                    message: 'Expected text NOT to match pattern console.log but it did',
                    severity: 'error',
                    context: {
                        code: 'console.log("Debug info");',
                        suggestion: 'Remove console.log statements'
                    }
                }
            ];

            const report = createMockReport(violations);
            
            reporter.report(report);
            
            // Check that it uses compact format
            expect(mockLog).toHaveBeenCalledWith('VIOLATIONS (1 total):');
            expect(mockLog).toHaveBeenCalledWith('');
            expect(mockLog).toHaveBeenCalledWith('src/auth/login.ts:42 [test-rule]');
            expect(mockLog).toHaveBeenCalledWith('  Found: console.log("Debug info");');
            expect(mockLog).toHaveBeenCalledWith('  Fix: Remove console.log or use proper logger');
        });

        it('should show truncation message when many violations', () => {
            const violations: ViolationDetail[] = Array.from({ length: 8 }, (_, i) => ({
                file: `src/file${i}.ts`,
                line: i + 1,
                message: `Violation ${i}`,
                severity: 'error' as const
            }));

            const originalCliArgs = {
                base: 'develop',
                mode: 'all' as const,
                config: 'rules/*.yaml'
            };

            const report = createMockReport(violations, originalCliArgs);
            
            reporter.report(report);
            
            // Should show first 5 violations
            expect(mockLog).toHaveBeenCalledWith('VIOLATIONS (8 total, showing first 5):');
            
            // Should show command to see all violations
            expect(mockLog).toHaveBeenCalledWith(
                '+3 more violations. Run: codeguardian check --config "rules/*.yaml" --base develop --mode all --format=console'
            );
        });

        it('should prioritize error severity violations', () => {
            const violations: ViolationDetail[] = [
                {
                    file: 'src/warning.ts',
                    line: 1,
                    message: 'Warning violation',
                    severity: 'warning'
                },
                {
                    file: 'src/error.ts',
                    line: 1,
                    message: 'Error violation',
                    severity: 'error'
                }
            ];

            const report = createMockReport(violations);
            
            reporter.report(report);
            
            // Error should appear first
            const calls = mockLog.mock.calls.map(call => call[0]);
            const errorIndex = calls.findIndex(call => call.includes('src/error.ts'));
            const warningIndex = calls.findIndex(call => call.includes('src/warning.ts'));
            
            expect(errorIndex).toBeLessThan(warningIndex);
            expect(errorIndex).toBeGreaterThan(-1);
            expect(warningIndex).toBeGreaterThan(-1);
        });

        it('should extract meaningful fix suggestions', () => {
            const violations: ViolationDetail[] = [
                {
                    file: 'src/unused.ts',
                    line: 1,
                    message: 'Found unused variable',
                    severity: 'warning'
                },
                {
                    file: 'src/import.ts',
                    line: 1,
                    message: 'Domain layer imports infrastructure',
                    severity: 'error'
                }
            ];

            const report = createMockReport(violations);
            
            reporter.report(report);
            
            // Check generated fix suggestions
            expect(mockLog).toHaveBeenCalledWith('  Fix: Remove unused code');
            expect(mockLog).toHaveBeenCalledWith('  Fix: Remove infrastructure import from domain layer');
        });

        it('should handle violations without line numbers', () => {
            const violations: ViolationDetail[] = [
                {
                    file: 'src/general.ts',
                    message: 'General violation without line',
                    severity: 'error'
                }
            ];

            const report = createMockReport(violations);
            
            reporter.report(report);
            
            expect(mockLog).toHaveBeenCalledWith('src/general.ts [test-rule]');
        });

        it('should handle violations without file context', () => {
            const violations: ViolationDetail[] = [
                {
                    message: 'Configuration violation',
                    severity: 'error'
                }
            ];

            const report = createMockReport(violations);
            
            reporter.report(report);
            
            expect(mockLog).toHaveBeenCalledWith('General [test-rule]');
        });

        it('should use context suggestion when no generated fix available', () => {
            const violations: ViolationDetail[] = [
                {
                    file: 'src/custom.ts',
                    line: 1,
                    message: 'Custom rule violation',
                    severity: 'error',
                    context: {
                        suggestion: 'Follow the custom rule guidelines'
                    }
                }
            ];

            const report = createMockReport(violations);
            
            reporter.report(report);
            
            expect(mockLog).toHaveBeenCalledWith('  Fix: Follow the custom rule guidelines');
        });
    });

    describe('Command generation', () => {
        it('should not show command when no original args provided', () => {
            const violations: ViolationDetail[] = Array.from({ length: 6 }, (_, i) => ({
                file: `src/file${i}.ts`,
                line: i + 1,
                message: `Violation ${i}`,
                severity: 'error' as const
            }));

            const report = createMockReport(violations); // No originalCliArgs
            
            reporter.report(report);
            
            const calls = mockLog.mock.calls.map(call => call[0]);
            const hasCommand = calls.some(call => call.includes('Run:'));
            expect(hasCommand).toBeFalsy();
        });

        it('should handle single remaining violation correctly', () => {
            const violations: ViolationDetail[] = Array.from({ length: 6 }, (_, i) => ({
                file: `src/file${i}.ts`,
                line: i + 1,
                message: `Violation ${i}`,
                severity: 'error' as const
            }));

            const originalCliArgs = { base: 'main' };
            const report = createMockReport(violations, originalCliArgs);
            
            reporter.report(report);
            
            expect(mockLog).toHaveBeenCalledWith(
                '+1 more violation. Run: codeguardian check --format=console'
            );
        });
    });
});