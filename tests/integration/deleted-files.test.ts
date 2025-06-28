import { createRuleFactory } from '../../src/config';
import { EvaluationContext, Repository, DiffInfo, FileInfo } from '../../src/types';
import { ResultCache } from '../../src/core';
import { parse as parseYAML } from 'yaml';

describe('Integration: Deleted Files Handling', () => {
    const createMockContext = (files: FileInfo[]): EvaluationContext => {
        const mockRepository: Repository = {
            getFiles: jest.fn().mockResolvedValue(files),
            getFileContent: jest.fn().mockImplementation((path: string) => {
                const file = files.find(f => f.path === path);
                if (!file || file.status === 'deleted') {
                    throw new Error(`File not found: ${path}`);
                }
                return Promise.resolve(file.content || '');
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
            config: { type: 'integration-test' },
            mode: 'diff',
        };
    };

    it('should provide helpful message for deleted files when using assert_match', async () => {
        const yamlConfig = `
rules:
  - id: prevent-improved-files
    description: Prevents creating alternative versions of files
    rule:
      type: for_each
      select:
        type: select_files
        path_pattern: '**/*improved*'
      assert:
        type: assert_match
        pattern: 'THIS_PATTERN_SHOULD_NEVER_MATCH'
        should_match: true
`;

        const files: FileInfo[] = [
            // A deleted file that matches the path pattern
            { 
                path: 'src/utils_improved.ts', 
                status: 'deleted', 
                insertions: 0, 
                deletions: 100 
            },
        ];

        const parsedConfig = parseYAML(yamlConfig) as any;
        const factory = createRuleFactory();
        const rule = factory.create(parsedConfig.rules[0].rule);
        const context = createMockContext(files);
        
        const result = await rule.evaluate(context);
        
        // Should fail with helpful message about deleted files
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations?.[0]?.message).toBe('Cannot match pattern against deleted file');
        expect(result.violations?.[0]?.context?.suggestion).toContain('Use assert_property to check file status');
    });

    it('should skip deleted files when using path-based rules correctly', async () => {
        // This is the correct way to prevent files with certain patterns
        const yamlConfig = `
rules:
  - id: prevent-improved-files
    description: Prevents creating alternative versions of files
    rule:
      type: for_each
      select:
        type: select_files
        path_pattern: '**/*improved*'
        status: ['added', 'modified']  # Only check non-deleted files
      assert:
        type: assert_match
        pattern: '.*'  # Any content is fine, we just don't want these files
        should_match: false
        suggestion: 'Remove files with "improved" in the name'
`;

        const files: FileInfo[] = [
            // A deleted file that matches the pattern - should be skipped due to status filter
            { 
                path: 'src/utils_improved.ts', 
                status: 'deleted', 
                insertions: 0, 
                deletions: 100 
            },
            // An added file that matches the pattern - should fail
            { 
                path: 'src/helper_improved.ts', 
                status: 'added', 
                insertions: 50, 
                deletions: 0,
                content: 'export function helper() { return 42; }'
            },
        ];

        const parsedConfig = parseYAML(yamlConfig) as any;
        const factory = createRuleFactory();
        const rule = factory.create(parsedConfig.rules[0].rule);
        const context = createMockContext(files);
        
        const result = await rule.evaluate(context);
        
        // Should fail only for the added file
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations?.[0]?.file).toBe('src/helper_improved.ts');
    });

    it('should handle mixed file statuses correctly', async () => {
        const yamlConfig = `
rules:
  - id: no-console-logs
    description: No console.log statements
    rule:
      type: for_each
      select:
        type: select_files
        path_pattern: '**/*.ts'
      assert:
        type: assert_match
        pattern: 'console\\.log'
        should_match: false
`;

        const files: FileInfo[] = [
            // Modified file with console.log
            { 
                path: 'src/debug.ts', 
                status: 'modified', 
                insertions: 5, 
                deletions: 0,
                content: 'console.log("debug"); export const x = 1;'
            },
            // Deleted file (would have console.log but shouldn't be checked)
            { 
                path: 'src/old-debug.ts', 
                status: 'deleted', 
                insertions: 0, 
                deletions: 50
            },
            // Added file without console.log
            { 
                path: 'src/new.ts', 
                status: 'added', 
                insertions: 20, 
                deletions: 0,
                content: 'export const y = 2;'
            },
        ];

        const parsedConfig = parseYAML(yamlConfig) as any;
        const factory = createRuleFactory();
        const rule = factory.create(parsedConfig.rules[0].rule);
        const context = createMockContext(files);
        
        const result = await rule.evaluate(context);
        
        // Should fail only for the modified file with console.log
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations?.[0]?.file).toBe('src/debug.ts');
        expect(result.violations?.[0]?.message).toContain('NOT to match pattern');
    });

    it('should allow rules that check for deleted files using assert_property', async () => {
        const yamlConfig = `
rules:
  - id: critical-file-deleted
    description: Ensure critical configuration files are not deleted
    rule:
      type: for_each
      select:
        type: select_files
        path_pattern: '**/.env*'
      assert:
        type: assert_property
        property_path: 'status'
        expected_value: 'deleted'
        operator: '!='
`;

        const files: FileInfo[] = [
            // A deleted .env file - should trigger violation
            { 
                path: '.env.production', 
                status: 'deleted', 
                insertions: 0, 
                deletions: 25 
            },
            // A modified .env file - should pass
            { 
                path: '.env.local', 
                status: 'modified', 
                insertions: 2, 
                deletions: 1,
                content: 'API_KEY=test'
            },
        ];

        const parsedConfig = parseYAML(yamlConfig) as any;
        const factory = createRuleFactory();
        const rule = factory.create(parsedConfig.rules[0].rule);
        const context = createMockContext(files);
        
        const result = await rule.evaluate(context);
        
        // Should fail because a critical file was deleted
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations?.[0]?.file).toBe('.env.production');
        expect(result.violations?.[0]?.message).toContain("Assertion 'assert_property' failed");
    });

    it('should handle assert_match with should_match=false on deleted files', async () => {
        const yamlConfig = `
rules:
  - id: no-pattern-in-files
    description: Ensure pattern does not exist
    rule:
      type: for_each
      select:
        type: select_files
        path_pattern: '**/*.ts'
      assert:
        type: assert_match
        pattern: 'debugger'
        should_match: false
`;

        const files: FileInfo[] = [
            // Deleted file - should pass (no content means no match)
            { 
                path: 'src/deleted.ts', 
                status: 'deleted', 
                insertions: 0, 
                deletions: 100 
            },
            // Modified file with debugger - should fail
            { 
                path: 'src/active.ts', 
                status: 'modified', 
                insertions: 5, 
                deletions: 0,
                content: 'debugger; console.log("test");'
            },
        ];

        const parsedConfig = parseYAML(yamlConfig) as any;
        const factory = createRuleFactory();
        const rule = factory.create(parsedConfig.rules[0].rule);
        const context = createMockContext(files);
        
        const result = await rule.evaluate(context);
        
        // Should fail only for the file with debugger
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations?.[0]?.file).toBe('src/active.ts');
    });
});