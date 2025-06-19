import { AllOfRule } from '../../../src/combinators/AllOfRule';
import { Rule, EvaluationContext, RuleResult, Repository, DiffInfo } from '../../../src/types';
import { ResultCache } from '../../../src/core';

class MockRule implements Rule {
    constructor(
        public id: string,
        public type: 'selector' | 'assertion' | 'combinator',
        private result: RuleResult
    ) {}

    async evaluate(_context: EvaluationContext): Promise<RuleResult> {
        return this.result;
    }
}

describe('AllOfRule', () => {
    const createMockContext = (): EvaluationContext => {
        const mockRepository: Repository = {
            getFiles: jest.fn(),
            getFileContent: jest.fn(),
            getDiff: jest.fn(),
            getAllFiles: jest.fn(),
        };

        const mockDiff: DiffInfo = {
            files: [],
            baseBranch: 'main',
            headBranch: 'feature',
        };

        return {
            repository: mockRepository,
            diff: mockDiff,
            cache: new ResultCache(),
            config: { type: 'all-of' },
        };
    };

    it('should pass when all rules pass', async () => {
        const rules = [
            new MockRule('rule1', 'assertion', { passed: true }),
            new MockRule('rule2', 'assertion', { passed: true }),
            new MockRule('rule3', 'assertion', { passed: true }),
        ];

        const allOfRule = new AllOfRule('all-of-test', rules);
        const context = createMockContext();
        const result = await allOfRule.evaluate(context);

        expect(result.passed).toBe(true);
        expect(result.violations).toBeUndefined();
    });

    it('should fail on first failed rule (short-circuit)', async () => {
        const rules = [
            new MockRule('rule1', 'assertion', { passed: true }),
            new MockRule('rule2', 'assertion', {
                passed: false,
                violations: [{ message: 'Rule 2 failed', severity: 'error' }],
            }),
            new MockRule('rule3', 'assertion', { passed: true }),
        ];

        const evaluateSpy = jest.spyOn(rules[2]!, 'evaluate');

        const allOfRule = new AllOfRule('all-of-test', rules);
        const context = createMockContext();
        const result = await allOfRule.evaluate(context);

        expect(result.passed).toBe(false);
        expect(result.message).toBe("Rule 'rule2' failed");
        expect(result.violations).toHaveLength(1);
        expect(result.violations![0]?.message).toBe('Rule 2 failed');

        // Verify short-circuit behavior
        expect(evaluateSpy).not.toHaveBeenCalled();
    });

    it('should handle empty rules array', async () => {
        const allOfRule = new AllOfRule('all-of-test', []);
        const context = createMockContext();
        const result = await allOfRule.evaluate(context);

        expect(result.passed).toBe(true);
    });

    it('should accumulate violations from failed rule', async () => {
        const rules = [
            new MockRule('rule1', 'assertion', {
                passed: false,
                violations: [
                    { message: 'Violation 1', severity: 'error' },
                    { message: 'Violation 2', severity: 'warning' },
                ],
            }),
        ];

        const allOfRule = new AllOfRule('all-of-test', rules);
        const context = createMockContext();
        const result = await allOfRule.evaluate(context);

        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(2);
    });
});
