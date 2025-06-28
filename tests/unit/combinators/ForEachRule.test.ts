import { ForEachRule } from '../../../src/combinators/ForEachRule';
import { SelectFilesRule } from '../../../src/selectors/SelectFilesRule';
import { AssertMatchRule } from '../../../src/assertions/AssertMatchRule';
import { SelectCommandOutputRule } from '../../../src/selectors/SelectCommandOutputRule';
import { AssertPropertyRule } from '../../../src/assertions/AssertPropertyRule';
import { AllOfRule } from '../../../src/combinators/AllOfRule';
import { AssertCommandOutputRule } from '../../../src/assertions/AssertCommandOutputRule';
import { EvaluationContext, Repository, DiffInfo, FileInfo } from '../../../src/types';
import { ResultCache } from '../../../src/core';
import { exec } from 'child_process';

jest.mock('child_process');
const mockedExec = exec as unknown as jest.Mock;

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

    it('should handle deleted files with assert_match appropriately', async () => {
        const files: FileInfo[] = [
            { path: 'src/existing.ts', status: 'modified', insertions: 5, deletions: 0, content: 'const x = 1;' },
            { path: 'src/deleted.ts', status: 'deleted', insertions: 0, deletions: 10 },
            { path: 'src/another.ts', status: 'modified', insertions: 3, deletions: 2, content: 'const y = 2;' },
        ];

        const selector = new SelectFilesRule('file-selector', 'src/**/*.ts');
        const assertion = new AssertMatchRule('has-content', /const/, true);
        const rule = new ForEachRule('for-each-test', selector, assertion);

        const context = createMockContext(files);
        const result = await rule.evaluate(context);

        // Should fail because deleted file cannot be matched when should_match is true
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations?.[0]?.file).toBe('src/deleted.ts');
        expect(result.violations?.[0]?.message).toContain('Cannot match pattern against deleted file');
    });

    it('should report error for deleted files when assert_match expects content', async () => {
        const files: FileInfo[] = [
            { path: 'src/file_improved.ts', status: 'deleted', insertions: 0, deletions: 50 },
            { path: 'src/regular.ts', status: 'modified', insertions: 5, deletions: 0, content: 'export function test() {}' },
        ];

        const selector = new SelectFilesRule('file-selector', '**/*improved*');
        // This assertion expects to match content but deleted file has none
        const assertion = new AssertMatchRule('must-match', /THIS_SHOULD_NEVER_MATCH/, true);
        const rule = new ForEachRule('for-each-test', selector, assertion);

        const context = createMockContext(files);
        const result = await rule.evaluate(context);

        // Should fail because deleted file selected but cannot match content
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations?.[0]?.file).toBe('src/file_improved.ts');
        expect(result.violations?.[0]?.message).toContain('Cannot match pattern against deleted file');
    });

    it('should pass for deleted files when assert_match has should_match=false', async () => {
        const files: FileInfo[] = [
            { path: 'src/deleted.ts', status: 'deleted', insertions: 0, deletions: 10 },
            { path: 'src/existing.ts', status: 'modified', insertions: 5, deletions: 0, content: 'const x = 1;' },
        ];

        const selector = new SelectFilesRule('file-selector', 'src/**/*.ts');
        const assertion = new AssertMatchRule('no-pattern', /console\.log/, false);
        const rule = new ForEachRule('for-each-test', selector, assertion);

        const context = createMockContext(files);
        const result = await rule.evaluate(context);

        // Should pass - deleted files auto-pass for should_match=false, existing file has no console.log
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

    describe('ForEachRule with Command Execution and Value Extraction', () => {
        const createMockContext = (): EvaluationContext => {
            const mockRepository: Repository = {
                getFiles: jest.fn().mockResolvedValue([]),
                getFileContent: jest.fn().mockResolvedValue(''),
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
                config: { type: 'for-each' },
            };
        };

        beforeEach(() => {
            mockedExec.mockClear();
        });

        const repomixOutputBelowLimit = `
    🔎 Security Check:
    ──────────────────
    ✔ No suspicious files detected.

    📊 Pack Summary:
    ────────────────
      Total Files: 78 files
      Total Chars: 223,985 chars
     Total Tokens: 49,513 tokens
           Output: repomix-output.md
         Security: ✔ No suspicious files detected

    🎉 All Done!
    Your repository has been successfully packed.
    `;

        const repomixOutputAboveLimit = repomixOutputBelowLimit.replace('49,513', '52,100');

        it('should pass when command succeeds and extracted token count is below the limit', async () => {
            const selector = new SelectCommandOutputRule('cmd-selector', 'npx repomix pack');
            
            const assertion = new AllOfRule('all-assertions', [
                new AssertCommandOutputRule('check-exit-code', 'exitCode', undefined, '==', 0),
                new AssertPropertyRule(
                    'check-token-count',
                    'stdout',
                    50000,
                    '<=',
                    /Total Tokens:\s*([\d,]+)/
                ),
            ]);

            const rule = new ForEachRule('for-each-command-test', selector, assertion);
            
            mockedExec.mockImplementation((_command, callback) => {
                callback(null, repomixOutputBelowLimit, '');
            });

            const context = createMockContext();
            const result = await rule.evaluate(context);

            expect(result.passed).toBe(true);
            expect(result.violations).toHaveLength(0);
            expect(mockedExec).toHaveBeenCalledWith('npx repomix pack', expect.any(Function));
        });

        it('should fail when extracted token count is above the limit', async () => {
            const selector = new SelectCommandOutputRule('cmd-selector', 'npx repomix pack');
            const assertion = new AllOfRule('all-assertions', [
                new AssertCommandOutputRule('check-exit-code', 'exitCode', undefined, '==', 0),
                new AssertPropertyRule(
                    'check-token-count',
                    'stdout',
                    50000,
                    '<=',
                    /Total Tokens:\s*([\d,]+)/
                ),
            ]);
            const rule = new ForEachRule('for-each-command-test', selector, assertion);
            
            mockedExec.mockImplementation((_command, callback) => {
                callback(null, repomixOutputAboveLimit, '');
            });

            const context = createMockContext();
            const result = await rule.evaluate(context);

            expect(result.passed).toBe(false);
            expect(result.violations).toHaveLength(1);
            expect(result.violations![0]?.message).toContain("Assertion 'check-token-count' failed");
        });
        
        it('should fail when the command itself fails (non-zero exit code)', async () => {
            const selector = new SelectCommandOutputRule('cmd-selector', 'npx repomix pack');
            const assertion = new AllOfRule('all-assertions', [
                new AssertCommandOutputRule('check-exit-code', 'exitCode', undefined, '==', 0),
                new AssertPropertyRule(
                    'check-token-count',
                    'stdout',
                    50000,
                    '<=',
                    /Total Tokens:\s*([\d,]+)/
                ),
            ]);
            const rule = new ForEachRule('for-each-command-test', selector, assertion);
            
            const mockError = new Error('Command failed');
            (mockError as any).code = 1; 
            mockedExec.mockImplementation((_command, callback) => {
                callback(mockError, '', 'Error running command');
            });

            const context = createMockContext();
            const result = await rule.evaluate(context);

            expect(result.passed).toBe(false);
            expect(result.violations).toHaveLength(1);
            expect(result.violations![0]?.message).toContain("Assertion 'check-exit-code' failed");
        });
    });
});
