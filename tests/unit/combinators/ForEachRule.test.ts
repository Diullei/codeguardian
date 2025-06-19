import { ForEachRule } from '../../../src/combinators/ForEachRule';
import { SelectFilesRule } from '../../../src/selectors/SelectFilesRule';
import { AssertMatchRule } from '../../../src/assertions/AssertMatchRule';
import { EvaluationContext, Repository, DiffInfo, FileInfo } from '../../../src/types';
import { ResultCache } from '../../../src/core';

describe('ForEachRule', () => {
    const createMockContext = (files: FileInfo[]): EvaluationContext => {
        const mockRepository: Repository = {
            getFiles: jest.fn().mockResolvedValue(files),
            getFileContent: jest.fn().mockImplementation((path: string) => {
                const file = files.find(f => f.path === path);
                return Promise.resolve(file?.content || '');
            }),
            getDiff: jest.fn(),
            getAllFiles: jest.fn(),
        };

        const mockDiff: DiffInfo = {
            files,
            baseBranch: 'main',
            headBranch: 'feature',
        };

        return {
            repository: mockRepository,
            diff: mockDiff,
            cache: new ResultCache(),
            config: { type: 'for-each' },
        };
    };

    it('should apply assertion to each selected item', async () => {
        const files: FileInfo[] = [
            { path: 'src/good.ts', status: 'modified', insertions: 0, deletions: 0, content: 'const x = 1;' },
            { path: 'src/bad.ts', status: 'modified', insertions: 0, deletions: 0, content: 'console.log("debug");' },
        ];

        const selector = new SelectFilesRule('file-selector', 'src/**/*.ts');
        const assertion = new AssertMatchRule('no-console', /console\.log/, false);
        const rule = new ForEachRule('for-each-test', selector, assertion);

        const context = createMockContext(files);
        const result = await rule.evaluate(context);

        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations![0]?.file).toBe('src/bad.ts');
        expect(result.violations![0]?.message).toContain('Expected text NOT to match pattern');
    });

    it('should pass when all assertions pass', async () => {
        const files: FileInfo[] = [
            { path: 'src/file1.ts', status: 'modified', insertions: 0, deletions: 0, content: 'const x = 1;' },
            { path: 'src/file2.ts', status: 'modified', insertions: 0, deletions: 0, content: 'const y = 2;' },
        ];

        const selector = new SelectFilesRule('file-selector', 'src/**/*.ts');
        const assertion = new AssertMatchRule('no-console', /console\.log/, false);
        const rule = new ForEachRule('for-each-test', selector, assertion);

        const context = createMockContext(files);
        const result = await rule.evaluate(context);

        expect(result.passed).toBe(true);
        expect(result.violations).toHaveLength(0);
    });

    it('should handle empty selection', async () => {
        const files: FileInfo[] = [{ path: 'test/file.js', status: 'modified', insertions: 0, deletions: 0 }];

        const selector = new SelectFilesRule('file-selector', 'src/**/*.ts');
        const assertion = new AssertMatchRule('no-console', /console\.log/, false);
        const rule = new ForEachRule('for-each-test', selector, assertion);

        const context = createMockContext(files);
        const result = await rule.evaluate(context);

        expect(result.passed).toBe(true);
        expect(result.violations).toHaveLength(0);
    });

    it('should extract file information from different item formats', async () => {
        const selector = new SelectFilesRule('file-selector');
        const assertion = new AssertMatchRule('test', /test/, false);
        const rule = new ForEachRule('for-each-test', selector, assertion);

        // Mock selector to return different item formats
        jest.spyOn(selector, 'evaluate').mockResolvedValue({
            passed: true,
            details: {
                items: [
                    { file: 'test1.ts', content: 'test content' },
                    { path: 'test2.ts', content: 'test content' },
                    { lineNumber: 5, content: 'test content' },
                ],
            },
        });

        const context = createMockContext([]);
        const result = await rule.evaluate(context);

        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(3);
        expect(result.violations![0]?.file).toBe('test1.ts');
        expect(result.violations![1]?.file).toBe('test2.ts');
        expect(result.violations![2]?.line).toBe(5);
    });

    it('should handle assertion errors gracefully', async () => {
        const selector = new SelectFilesRule('file-selector');
        const assertion = new AssertMatchRule('test', /test/, false);

        // Mock assertion to throw error
        jest.spyOn(assertion, 'assertWithDetails').mockRejectedValue(new Error('Assertion error'));

        const rule = new ForEachRule('for-each-test', selector, assertion);

        jest.spyOn(selector, 'evaluate').mockResolvedValue({
            passed: true,
            details: { items: [{ path: 'test.ts' }] },
        });

        const context = createMockContext([]);
        const result = await rule.evaluate(context);

        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations![0]?.message).toContain(
            'Error evaluating assertion: Assertion error'
        );
    });
});
