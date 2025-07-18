import { AssertPropertyRule } from '../../../src/assertions/AssertPropertyRule';
import { EvaluationContext, Repository, DiffInfo } from '../../../src/types';
import { ResultCache } from '../../../src/core';

describe('AssertPropertyRule', () => {
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
            config: { type: 'assert-property' },
        };
    };

    describe('property access', () => {
        it('should access simple properties', async () => {
            const rule = new AssertPropertyRule('test-rule', 'status', 'active', '==');
            const context = createMockContext();

            expect(await rule.assert({ status: 'active' }, context)).toBe(true);
            expect(await rule.assert({ status: 'inactive' }, context)).toBe(false);
        });

        it('should access nested properties', async () => {
            const rule = new AssertPropertyRule('test-rule', 'user.name', 'John', '==');
            const context = createMockContext();

            expect(await rule.assert({ user: { name: 'John' } }, context)).toBe(true);
            expect(await rule.assert({ user: { name: 'Jane' } }, context)).toBe(false);
        });

        it('should handle missing properties', async () => {
            const rule = new AssertPropertyRule('test-rule', 'missing.property', undefined, '==');
            const context = createMockContext();

            expect(await rule.assert({}, context)).toBe(true);
        });
    });

    describe('comparison operators', () => {
        const context = createMockContext();

        it('should support == operator', async () => {
            const rule = new AssertPropertyRule('test-rule', 'value', 5, '==');

            expect(await rule.assert({ value: 5 }, context)).toBe(true);
            expect(await rule.assert({ value: '5' }, context)).toBe(true); // loose equality
            expect(await rule.assert({ value: 6 }, context)).toBe(false);
        });

        it('should support != operator', async () => {
            const rule = new AssertPropertyRule('test-rule', 'value', 5, '!=');

            expect(await rule.assert({ value: 6 }, context)).toBe(true);
            expect(await rule.assert({ value: 5 }, context)).toBe(false);
        });

        it('should support numeric comparisons', async () => {
            const greaterRule = new AssertPropertyRule('test-rule', 'count', 10, '>');
            expect(await greaterRule.assert({ count: 15 }, context)).toBe(true);
            expect(await greaterRule.assert({ count: 5 }, context)).toBe(false);

            const lessRule = new AssertPropertyRule('test-rule', 'count', 10, '<');
            expect(await lessRule.assert({ count: 5 }, context)).toBe(true);
            expect(await lessRule.assert({ count: 15 }, context)).toBe(false);

            const greaterEqualRule = new AssertPropertyRule('test-rule', 'count', 10, '>=');
            expect(await greaterEqualRule.assert({ count: 10 }, context)).toBe(true);
            expect(await greaterEqualRule.assert({ count: 15 }, context)).toBe(true);
            expect(await greaterEqualRule.assert({ count: 5 }, context)).toBe(false);

            const lessEqualRule = new AssertPropertyRule('test-rule', 'count', 10, '<=');
            expect(await lessEqualRule.assert({ count: 10 }, context)).toBe(true);
            expect(await lessEqualRule.assert({ count: 5 }, context)).toBe(true);
            expect(await lessEqualRule.assert({ count: 15 }, context)).toBe(false);
        });

        it('should support includes operator for strings', async () => {
            const rule = new AssertPropertyRule('test-rule', 'message', 'error', 'includes');

            expect(await rule.assert({ message: 'An error occurred' }, context)).toBe(true);
            expect(await rule.assert({ message: 'Success' }, context)).toBe(false);
        });

        it('should support includes operator for arrays', async () => {
            const rule = new AssertPropertyRule('test-rule', 'tags', 'important', 'includes');

            expect(await rule.assert({ tags: ['urgent', 'important'] }, context)).toBe(true);
            expect(await rule.assert({ tags: ['normal'] }, context)).toBe(false);
        });

        it('should support matches operator', async () => {
            const rule = new AssertPropertyRule(
                'test-rule',
                'email',
                '^[\\w.]+@[\\w.]+$',
                'matches'
            );

            expect(await rule.assert({ email: 'user@example.com' }, context)).toBe(true);
            expect(await rule.assert({ email: 'invalid-email' }, context)).toBe(false);
        });

        it('should return false for includes on non-string/array', async () => {
            const rule = new AssertPropertyRule('test-rule', 'value', 'test', 'includes');

            expect(await rule.assert({ value: 123 }, context)).toBe(false);
            expect(await rule.assert({ value: null }, context)).toBe(false);
        });

        it('should return false for matches on non-string', async () => {
            const rule = new AssertPropertyRule('test-rule', 'value', 'test', 'matches');

            expect(await rule.assert({ value: 123 }, context)).toBe(false);
        });

        it('should throw error for unknown operator', async () => {
            const rule = new AssertPropertyRule('test-rule', 'value', 5, 'unknown' as any);

            await expect(rule.assert({ value: 5 }, context)).rejects.toThrow(
                'Unknown operator: unknown'
            );
        });
    });

    describe('value extraction with extract_pattern', () => {
        const context = createMockContext();
        const mockItem = {
            output: `
        Some introductory text.
        Total Tokens: 49,513 tokens
        Some concluding text.
        `,
        };

        it('should extract a numeric value and pass the comparison', async () => {
            const rule = new AssertPropertyRule(
                'test-rule',
                'output',
                50000,
                '<=',
                /Total Tokens:\s*([\d,]+)/
            );
            expect(await rule.assert(mockItem, context)).toBe(true);
        });

        it('should extract a numeric value and fail the comparison', async () => {
            const rule = new AssertPropertyRule(
                'test-rule',
                'output',
                40000,
                '<=',
                /Total Tokens:\s*([\d,]+)/
            );
            expect(await rule.assert(mockItem, context)).toBe(false);
        });

        it('should handle different operators with extracted values', async () => {
            const rule = new AssertPropertyRule(
                'test-rule',
                'output',
                49513,
                '==',
                /Total Tokens:\s*([\d,]+)/
            );
            expect(await rule.assert(mockItem, context)).toBe(true);
        });

        it('should fail if the extract_pattern does not match', async () => {
            const rule = new AssertPropertyRule(
                'test-rule',
                'output',
                50000,
                '<=',
                /Total Files:\s*(\d+)/
            );
            expect(await rule.assert(mockItem, context)).toBe(false);
        });
        
        it('should fail if the extract_pattern matches but has no capture group', async () => {
            const rule = new AssertPropertyRule(
                'test-rule',
                'output',
                50000,
                '<=',
                /Total Tokens:\s*[\d,]+/
            );
            expect(await rule.assert(mockItem, context)).toBe(false);
        });

        it('should work on a direct string item, not just object properties', async () => {
            const item = { value: 'Version: 12' };
            const stringRule = new AssertPropertyRule('test-rule', 'value', 10, '>=', /Version:\s*(\d+)/);
            expect(await stringRule.assert(item, context)).toBe(true);
        });

        it('should correctly extract a string value for string-based comparisons', async () => {
            const item = { log: 'Status: SUCCESS' };
            const rule = new AssertPropertyRule(
                'test-rule',
                'log',
                'SUCCESS',
                '==',
                /Status:\s*(\w+)/
            );
            expect(await rule.assert(item, context)).toBe(true);
        });
    });
});
