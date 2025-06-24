import { AssertLineCountRule } from '../../../src/assertions/AssertLineCountRule';
import { EvaluationContext, Repository, DiffInfo } from '../../../src/types';
import { ResultCache } from '../../../src/core';

describe('AssertLineCountRule', () => {
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
            config: { type: 'assert_line_count' },
        };
    };

    describe('line counting', () => {
        it('should count lines correctly for string content', async () => {
            const rule = new AssertLineCountRule('test-rule', '<=', 3);
            const context = createMockContext();

            const singleLine = 'single line';
            const multiLine = 'line 1\nline 2\nline 3';
            const withEmptyLines = 'line 1\n\nline 3';

            expect(await rule.assert(singleLine, context)).toBe(true);
            expect(await rule.assert(multiLine, context)).toBe(true);
            expect(await rule.assert(withEmptyLines, context)).toBe(true);
        });

        it('should count lines correctly for objects with content property', async () => {
            const rule = new AssertLineCountRule('test-rule', '<=', 2);
            const context = createMockContext();

            const fileWithContent = {
                path: 'test.ts',
                content: 'line 1\nline 2'
            };

            expect(await rule.assert(fileWithContent, context)).toBe(true);
        });

        it('should count lines correctly for objects with text property', async () => {
            const rule = new AssertLineCountRule('test-rule', '<=', 1);
            const context = createMockContext();

            const textObject = {
                text: 'single line text'
            };

            expect(await rule.assert(textObject, context)).toBe(true);
        });

        it('should use lineCount property if available', async () => {
            const rule = new AssertLineCountRule('test-rule', '<=', 5);
            const context = createMockContext();

            const objectWithLineCount = {
                lineCount: 3
            };

            expect(await rule.assert(objectWithLineCount, context)).toBe(true);
        });

        it('should handle empty content correctly', async () => {
            const rule = new AssertLineCountRule('test-rule', '>=', 0);
            const context = createMockContext();

            expect(await rule.assert('', context)).toBe(true);
            expect(await rule.assert({ content: '' }, context)).toBe(true);
        });

        it('should ignore trailing empty lines', async () => {
            const rule = new AssertLineCountRule('test-rule', '==', 2);
            const context = createMockContext();

            const contentWithTrailingNewlines = 'line 1\nline 2\n\n\n';
            expect(await rule.assert(contentWithTrailingNewlines, context)).toBe(true);
        });
    });

    describe('comparison operators', () => {
        const context = createMockContext();
        const threeLineContent = 'line 1\nline 2\nline 3';

        it('should handle equals operator (==)', async () => {
            const rule = new AssertLineCountRule('test-rule', '==', 3);
            expect(await rule.assert(threeLineContent, context)).toBe(true);

            const rule2 = new AssertLineCountRule('test-rule', '==', 2);
            expect(await rule2.assert(threeLineContent, context)).toBe(false);
        });

        it('should handle not equals operator (!=)', async () => {
            const rule = new AssertLineCountRule('test-rule', '!=', 2);
            expect(await rule.assert(threeLineContent, context)).toBe(true);

            const rule2 = new AssertLineCountRule('test-rule', '!=', 3);
            expect(await rule2.assert(threeLineContent, context)).toBe(false);
        });

        it('should handle less than operator (<)', async () => {
            const rule = new AssertLineCountRule('test-rule', '<', 4);
            expect(await rule.assert(threeLineContent, context)).toBe(true);

            const rule2 = new AssertLineCountRule('test-rule', '<', 3);
            expect(await rule2.assert(threeLineContent, context)).toBe(false);
        });

        it('should handle less than or equal operator (<=)', async () => {
            const rule = new AssertLineCountRule('test-rule', '<=', 3);
            expect(await rule.assert(threeLineContent, context)).toBe(true);

            const rule2 = new AssertLineCountRule('test-rule', '<=', 2);
            expect(await rule2.assert(threeLineContent, context)).toBe(false);
        });

        it('should handle greater than operator (>)', async () => {
            const rule = new AssertLineCountRule('test-rule', '>', 2);
            expect(await rule.assert(threeLineContent, context)).toBe(true);

            const rule2 = new AssertLineCountRule('test-rule', '>', 3);
            expect(await rule2.assert(threeLineContent, context)).toBe(false);
        });

        it('should handle greater than or equal operator (>=)', async () => {
            const rule = new AssertLineCountRule('test-rule', '>=', 3);
            expect(await rule.assert(threeLineContent, context)).toBe(true);

            const rule2 = new AssertLineCountRule('test-rule', '>=', 4);
            expect(await rule2.assert(threeLineContent, context)).toBe(false);
        });

        it('should throw error for unsupported operators', async () => {
            const rule = new AssertLineCountRule('test-rule', 'includes' as any, 3);
            await expect(rule.assert(threeLineContent, context)).rejects.toThrow(
                'Unsupported operator for line count comparison: includes'
            );
        });
    });

    describe('assertWithDetails', () => {
        it('should return passed result when assertion passes', async () => {
            const rule = new AssertLineCountRule('test-rule', '<=', 5);
            const context = createMockContext();

            const result = await rule.assertWithDetails('line 1\nline 2', context);
            expect(result.passed).toBe(true);
            expect(result.message).toBeUndefined();
        });

        it('should return detailed failure result when assertion fails', async () => {
            const rule = new AssertLineCountRule('test-rule', '<=', 1);
            const context = createMockContext();

            const result = await rule.assertWithDetails('line 1\nline 2\nline 3', context);
            expect(result.passed).toBe(false);
            expect(result.message).toContain('has 3 lines, expected <= 1');
            expect(result.context?.suggestion).toContain('Consider breaking this file into smaller modules');
        });

        it('should use custom message when provided', async () => {
            const customMessage = 'Custom line count error';
            const rule = new AssertLineCountRule('test-rule', '<=', 1, customMessage);
            const context = createMockContext();

            const result = await rule.assertWithDetails('line 1\nline 2', context);
            expect(result.passed).toBe(false);
            expect(result.message).toBe(customMessage);
        });

        it('should use custom suggestion when provided', async () => {
            const customSuggestion = 'Custom suggestion';
            const rule = new AssertLineCountRule('test-rule', '<=', 1, undefined, customSuggestion);
            const context = createMockContext();

            const result = await rule.assertWithDetails('line 1\nline 2', context);
            expect(result.passed).toBe(false);
            expect(result.context?.suggestion).toBe(customSuggestion);
        });

        it('should include file path in context when available', async () => {
            const rule = new AssertLineCountRule('test-rule', '<=', 1);
            const context = createMockContext();

            const fileObject = {
                path: '/path/to/file.go',
                content: 'line 1\nline 2\nline 3'
            };

            const result = await rule.assertWithDetails(fileObject, context);
            expect(result.passed).toBe(false);
            expect(result.context?.code).toContain('/path/to/file.go');
            expect(result.context?.code).toContain('3 lines');
        });

        it('should identify different item types correctly', async () => {
            const rule = new AssertLineCountRule('test-rule', '<=', 1);
            const context = createMockContext();

            // Test string
            const stringResult = await rule.assertWithDetails('line 1\nline 2', context);
            expect(stringResult.message).toContain('text has 2 lines');

            // Test file object
            const fileResult = await rule.assertWithDetails({ path: 'test.js', content: 'line 1\nline 2' }, context);
            expect(fileResult.message).toContain('file has 2 lines');

            // Test text object
            const textResult = await rule.assertWithDetails({ text: 'line 1\nline 2' }, context);
            expect(textResult.message).toContain('text content has 2 lines');

            // Test generic object
            const genericResult = await rule.assertWithDetails({ lineCount: 2 }, context);
            expect(genericResult.message).toContain('item has 2 lines');
        });
    });
});