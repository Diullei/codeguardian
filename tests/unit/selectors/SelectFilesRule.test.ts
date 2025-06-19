import { SelectFilesRule } from '../../../src/selectors/SelectFilesRule';
import { EvaluationContext, FileInfo, DiffInfo, Repository } from '../../../src/types';
import { ResultCache } from '../../../src/core';

describe('SelectFilesRule', () => {
    const createMockContext = (files: FileInfo[]): EvaluationContext => {
        const mockRepository: Repository = {
            getFiles: jest.fn().mockResolvedValue(files),
            getFileContent: jest.fn(),
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
            config: { type: 'select-files' },
        };
    };

    it('should select all files when no filters are specified', async () => {
        const files: FileInfo[] = [
            { path: 'src/index.ts', status: 'modified', insertions: 0, deletions: 0 },
            { path: 'test/index.test.ts', status: 'added', insertions: 0, deletions: 0 },
        ];

        const rule = new SelectFilesRule('test-rule');
        const context = createMockContext(files);
        const result = await rule.select(context);

        expect(result).toEqual(files);
    });

    it('should filter files by path pattern', async () => {
        const files: FileInfo[] = [
            { path: 'src/index.ts', status: 'modified', insertions: 0, deletions: 0 },
            { path: 'test/index.test.ts', status: 'added', insertions: 0, deletions: 0 },
            { path: 'docs/readme.md', status: 'modified', insertions: 0, deletions: 0 },
        ];

        const rule = new SelectFilesRule('test-rule', 'src/**/*.ts');
        const context = createMockContext(files);
        const result = await rule.select(context);

        expect(result).toHaveLength(1);
        expect(result[0]?.path).toBe('src/index.ts');
    });

    it('should filter files by status', async () => {
        const files: FileInfo[] = [
            { path: 'src/index.ts', status: 'modified', insertions: 0, deletions: 0 },
            { path: 'test/index.test.ts', status: 'added', insertions: 0, deletions: 0 },
            { path: 'old-file.ts', status: 'deleted', insertions: 0, deletions: 0 },
        ];

        const rule = new SelectFilesRule('test-rule', undefined, ['added', 'modified']);
        const context = createMockContext(files);
        const result = await rule.select(context);

        expect(result).toHaveLength(2);
        expect(result.map(f => f.path)).toEqual(['src/index.ts', 'test/index.test.ts']);
    });

    it('should exclude files matching exclude pattern', async () => {
        const files: FileInfo[] = [
            { path: 'src/index.ts', status: 'modified', insertions: 0, deletions: 0 },
            { path: 'src/index.test.ts', status: 'modified', insertions: 0, deletions: 0 },
            { path: 'src/utils.ts', status: 'modified', insertions: 0, deletions: 0 },
        ];

        const rule = new SelectFilesRule('test-rule', 'src/**/*.ts', undefined, '**/*.test.ts');
        const context = createMockContext(files);
        const result = await rule.select(context);

        expect(result).toHaveLength(2);
        expect(result.map(f => f.path)).toEqual(['src/index.ts', 'src/utils.ts']);
    });

    it('should combine all filters', async () => {
        const files: FileInfo[] = [
            { path: 'src/index.ts', status: 'modified', insertions: 0, deletions: 0 },
            { path: 'src/index.test.ts', status: 'added', insertions: 0, deletions: 0 },
            { path: 'test/utils.test.ts', status: 'added', insertions: 0, deletions: 0 },
            { path: 'docs/readme.md', status: 'modified', insertions: 0, deletions: 0 },
        ];

        const rule = new SelectFilesRule('test-rule', 'src/**/*.ts', ['added'], '**/*.test.ts');
        const context = createMockContext(files);
        const result = await rule.select(context);

        expect(result).toHaveLength(0); // No files match all criteria
    });
});
