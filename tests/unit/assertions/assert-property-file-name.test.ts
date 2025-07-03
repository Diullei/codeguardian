import { AssertPropertyRule } from '../../../src/assertions/AssertPropertyRule';
import { EvaluationContext, FileInfo } from '../../../src/types';
import { ResultCache } from '../../../src/core';

describe('AssertPropertyRule - File Name Matching', () => {
    const createMockContext = (): EvaluationContext => {
        return {
            repository: {} as any,
            diff: {} as any,
            cache: new ResultCache(),
            config: { type: 'test' },
            mode: 'diff',
        };
    };

    it('should match file names using path property with matches operator', async () => {
        const rule = new AssertPropertyRule(
            'test-file-naming',
            'path',
            'test_.*\\.py$',
            'matches'
        );

        const context = createMockContext();

        // Test file that matches the pattern
        const goodFile: FileInfo = {
            path: 'tests/test_example.py',
            status: 'added',
            insertions: 10,
            deletions: 0,
            content: '# test file'
        };

        const result1 = await rule.assert(goodFile, context);
        expect(result1).toBe(true);

        // Test file that doesn't match the pattern
        const badFile: FileInfo = {
            path: 'tests/example_test.py',
            status: 'added',
            insertions: 10,
            deletions: 0,
            content: '# test file'
        };

        const result2 = await rule.assert(badFile, context);
        expect(result2).toBe(false);
    });

    it('should extract just the filename from path when using matches operator', async () => {
        const rule = new AssertPropertyRule(
            'test-file-naming',
            'path',
            'test_.*\\.py$',
            'matches'
        );

        const context = createMockContext();

        // Test with full path
        const file: FileInfo = {
            path: 'tests/subfolder/test_example.py',
            status: 'added',
            insertions: 10,
            deletions: 0,
            content: '# test file'
        };

        const result = await rule.assert(file, context);
        expect(result).toBe(true);
    });

    it('should handle missing path property gracefully', async () => {
        const rule = new AssertPropertyRule(
            'test-file-naming',
            'path',
            'test_.*\\.py$',
            'matches'
        );

        const context = createMockContext();

        // Test with object that doesn't have a path property
        const invalidItem = {
            content: '# some content'
        };

        const result = await rule.assert(invalidItem, context);
        expect(result).toBe(false);
    });
});