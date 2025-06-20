import { AssertCommandOutputRule } from '../../../src/assertions/AssertCommandOutputRule';
import { CommandOutput, EvaluationContext } from '../../../src/types';
import { ResultCache } from '../../../src/core';

describe('AssertCommandOutputRule', () => {
    let context: EvaluationContext;
    const mockSuccessOutput: CommandOutput = {
        command: 'test',
        exitCode: 0,
        stdout: 'Build successful in 5s.',
        stderr: '',
    };
    const mockFailureOutput: CommandOutput = {
        command: 'test',
        exitCode: 1,
        stdout: '',
        stderr: 'Error: Build failed.',
    };
    
    beforeEach(() => {
        context = {
            repository: {} as any,
            diff: {} as any,
            cache: new ResultCache(),
            config: { type: 'assert_command_output' },
        };
    });

    describe('Exit Code Assertions', () => {
        it('should pass when exit code is 0 and condition is "=="', async () => {
            const rule = new AssertCommandOutputRule('test-rule', 'exitCode', undefined, '==', 0);
            expect(await rule.assert(mockSuccessOutput, context)).toBe(true);
        });

        it('should fail when exit code is 1 and condition is "==" 0', async () => {
            const rule = new AssertCommandOutputRule('test-rule', 'exitCode', undefined, '==', 0);
            expect(await rule.assert(mockFailureOutput, context)).toBe(false);
        });

        it('should pass when exit code is 1 and condition is "!=" 0', async () => {
            const rule = new AssertCommandOutputRule('test-rule', 'exitCode', undefined, '!=', 0);
            expect(await rule.assert(mockFailureOutput, context)).toBe(true);
        });
    });

    describe('Stdout/Stderr Assertions', () => {
        it('should pass when stdout matches the pattern', async () => {
            const rule = new AssertCommandOutputRule('test-rule', 'stdout', /Build successful/);
            expect(await rule.assert(mockSuccessOutput, context)).toBe(true);
        });

        it('should fail when stdout does not match the pattern', async () => {
            const rule = new AssertCommandOutputRule('test-rule', 'stdout', /Build failed/);
            expect(await rule.assert(mockSuccessOutput, context)).toBe(false);
        });
        
        it('should pass when stderr matches and shouldMatch is true', async () => {
            const rule = new AssertCommandOutputRule('test-rule', 'stderr', /Build failed/, undefined, undefined, undefined, undefined, true);
            expect(await rule.assert(mockFailureOutput, context)).toBe(true);
        });

        it('should fail when stderr matches and shouldMatch is false', async () => {
            const rule = new AssertCommandOutputRule('test-rule', 'stderr', /Build failed/, undefined, undefined, undefined, undefined, false);
            expect(await rule.assert(mockFailureOutput, context)).toBe(false);
        });
    });
    
    describe('Line Filtering', () => {
        const multiLineOutput: CommandOutput = {
            command: 'test',
            exitCode: 0,
            stdout: 'Line 1\nLine 2\nLine 3: Target\nLine 4\nLine 5',
            stderr: '',
        };

        it('should pass when matching in first_lines', async () => {
            const rule = new AssertCommandOutputRule('test-rule', 'stdout', /Target/, undefined, undefined, 3);
            expect(await rule.assert(multiLineOutput, context)).toBe(true);
        });

        it('should fail when match is outside first_lines', async () => {
            const rule = new AssertCommandOutputRule('test-rule', 'stdout', /Target/, undefined, undefined, 2);
            expect(await rule.assert(multiLineOutput, context)).toBe(false);
        });

        it('should pass when matching in last_lines', async () => {
            const rule = new AssertCommandOutputRule('test-rule', 'stdout', /Target/, undefined, undefined, undefined, 3);
            expect(await rule.assert(multiLineOutput, context)).toBe(true);
        });

        it('should fail when match is outside last_lines', async () => {
            const rule = new AssertCommandOutputRule('test-rule', 'stdout', /Target/, undefined, undefined, undefined, 2);
            expect(await rule.assert(multiLineOutput, context)).toBe(false);
        });
    });
    
    it('should throw an error if first_lines and last_lines are used together', () => {
        expect(() => new AssertCommandOutputRule('test-rule', 'stdout', /./, undefined, undefined, 1, 1)).toThrow('Cannot use firstLines and lastLines simultaneously.');
    });
});