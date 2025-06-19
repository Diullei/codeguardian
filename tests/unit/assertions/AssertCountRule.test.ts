import { AssertCountRule } from '../../../src/assertions/AssertCountRule';
import { EvaluationContext, Repository, DiffInfo } from '../../../src/types';
import { ResultCache } from '../../../src/core';

describe('AssertCountRule', () => {
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
            config: { type: 'assert-count' },
        };
    };

    it('should compare count with > operator', async () => {
        const rule = new AssertCountRule('test-rule', '>', 2);
        const context = createMockContext();

        expect(await rule.assert([1, 2, 3], context)).toBe(true);
        expect(await rule.assert([1, 2], context)).toBe(false);
    });

    it('should compare count with >= operator', async () => {
        const rule = new AssertCountRule('test-rule', '>=', 2);
        const context = createMockContext();

        expect(await rule.assert([1, 2, 3], context)).toBe(true);
        expect(await rule.assert([1, 2], context)).toBe(true);
        expect(await rule.assert([1], context)).toBe(false);
    });

    it('should compare count with < operator', async () => {
        const rule = new AssertCountRule('test-rule', '<', 2);
        const context = createMockContext();

        expect(await rule.assert([1], context)).toBe(true);
        expect(await rule.assert([1, 2], context)).toBe(false);
    });

    it('should compare count with <= operator', async () => {
        const rule = new AssertCountRule('test-rule', '<=', 2);
        const context = createMockContext();

        expect(await rule.assert([1], context)).toBe(true);
        expect(await rule.assert([1, 2], context)).toBe(true);
        expect(await rule.assert([1, 2, 3], context)).toBe(false);
    });

    it('should compare count with == operator', async () => {
        const rule = new AssertCountRule('test-rule', '==', 2);
        const context = createMockContext();

        expect(await rule.assert([1, 2], context)).toBe(true);
        expect(await rule.assert([1], context)).toBe(false);
        expect(await rule.assert([1, 2, 3], context)).toBe(false);
    });

    it('should compare count with != operator', async () => {
        const rule = new AssertCountRule('test-rule', '!=', 2);
        const context = createMockContext();

        expect(await rule.assert([1], context)).toBe(true);
        expect(await rule.assert([1, 2, 3], context)).toBe(true);
        expect(await rule.assert([1, 2], context)).toBe(false);
    });

    it('should handle non-array items as count 0', async () => {
        const rule = new AssertCountRule('test-rule', '==', 0);
        const context = createMockContext();

        expect(await rule.assert(null, context)).toBe(true);
        expect(await rule.assert(undefined, context)).toBe(true);
        expect(await rule.assert('not an array', context)).toBe(true);
        expect(await rule.assert({}, context)).toBe(true);
    });

    it('should throw error for unknown condition', async () => {
        const rule = new AssertCountRule('test-rule', 'unknown' as any, 2);
        const context = createMockContext();

        await expect(rule.assert([1, 2], context)).rejects.toThrow('Unknown condition: unknown');
    });
});
