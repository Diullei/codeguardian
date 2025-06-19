import { AssertMatchRule } from '../../../src/assertions/AssertMatchRule';
import { EvaluationContext, Repository, DiffInfo } from '../../../src/types';
import { ResultCache } from '../../../src/core';

describe('AssertMatchRule', () => {
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
            config: { type: 'assert-match' },
        };
    };

    it('should return true when pattern matches and shouldMatch is true', async () => {
        const rule = new AssertMatchRule('test-rule', /console\.log/, true);
        const context = createMockContext();

        const result = await rule.assert('console.log("hello")', context);
        expect(result).toBe(true);
    });

    it('should return false when pattern does not match and shouldMatch is true', async () => {
        const rule = new AssertMatchRule('test-rule', /console\.log/, true);
        const context = createMockContext();

        const result = await rule.assert('console.error("hello")', context);
        expect(result).toBe(false);
    });

    it('should return true when pattern does not match and shouldMatch is false', async () => {
        const rule = new AssertMatchRule('test-rule', /console\.log/, false);
        const context = createMockContext();

        const result = await rule.assert('console.error("hello")', context);
        expect(result).toBe(true);
    });

    it('should return false when pattern matches and shouldMatch is false', async () => {
        const rule = new AssertMatchRule('test-rule', /console\.log/, false);
        const context = createMockContext();

        const result = await rule.assert('console.log("hello")', context);
        expect(result).toBe(false);
    });

    it('should extract text from objects with content property', async () => {
        const rule = new AssertMatchRule('test-rule', /TODO/);
        const context = createMockContext();

        const result = await rule.assert({ content: '// TODO: fix this' }, context);
        expect(result).toBe(true);
    });

    it('should extract text from objects with text property', async () => {
        const rule = new AssertMatchRule('test-rule', /function/);
        const context = createMockContext();

        const result = await rule.assert({ text: 'function foo() {}' }, context);
        expect(result).toBe(true);
    });

    it('should extract text from objects with path property', async () => {
        const rule = new AssertMatchRule('test-rule', /\.test\.ts$/);
        const context = createMockContext();

        const result = await rule.assert({ path: 'src/index.test.ts' }, context);
        expect(result).toBe(true);
    });

    it('should convert non-string items to string', async () => {
        const rule = new AssertMatchRule('test-rule', /123/);
        const context = createMockContext();

        const result = await rule.assert(123, context);
        expect(result).toBe(true);
    });
});
