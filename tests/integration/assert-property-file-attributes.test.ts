import { createRuleFactory } from '../../src/config';
import { EvaluationContext, Repository, DiffInfo, FileInfo } from '../../src/types';
import { ResultCache } from '../../src/core';
import { parse as parseYAML } from 'yaml';

describe('Integration: AssertProperty with File Attributes', () => {
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

    it('should check file path using assert_property', async () => {
        const yamlConfig = `
rules:
  - id: check-test-files
    description: Check that test files are in the right location
    rule:
      type: for_each
      select:
        type: select_files
        path_pattern: '**/*.test.ts'
      assert:
        type: assert_property
        property_path: 'path'
        expected_value: 'test'
        operator: 'includes'
`;

        const files: FileInfo[] = [
            {
                path: 'tests/unit/something.test.ts',
                status: 'added',
                insertions: 50,
                deletions: 0,
                content: 'describe("test", () => {});'
            },
            {
                path: 'src/invalid.test.ts',
                status: 'added',
                insertions: 30,
                deletions: 0,
                content: 'describe("test", () => {});'
            },
        ];

        const parsedConfig = parseYAML(yamlConfig) as any;
        const factory = createRuleFactory();
        const rule = factory.create(parsedConfig.rules[0].rule);
        const context = createMockContext(files);
        
        const result = await rule.evaluate(context);
        
        // First file should pass (path includes 'test')
        // Second file should pass too (path includes 'test')
        expect(result.passed).toBe(true);
        expect(result.violations).toHaveLength(0);
    });

    it('should check file status using assert_property', async () => {
        const yamlConfig = `
rules:
  - id: no-deleted-config-files
    description: Ensure config files are not deleted
    rule:
      type: for_each
      select:
        type: select_files
        path_pattern: '**/*.config.ts'
      assert:
        type: assert_property
        property_path: 'status'
        expected_value: 'deleted'
        operator: '!='
`;

        const files: FileInfo[] = [
            {
                path: 'jest.config.ts',
                status: 'modified',
                insertions: 5,
                deletions: 2,
                content: 'export default {};'
            },
            {
                path: 'old.config.ts',
                status: 'deleted',
                insertions: 0,
                deletions: 100,
            },
        ];

        const parsedConfig = parseYAML(yamlConfig) as any;
        const factory = createRuleFactory();
        const rule = factory.create(parsedConfig.rules[0].rule);
        const context = createMockContext(files);
        
        const result = await rule.evaluate(context);
        
        // Should fail for the deleted config file
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations?.[0]?.file).toBe('old.config.ts');
    });

    it('should check file insertions count using assert_property', async () => {
        const yamlConfig = `
rules:
  - id: limit-large-changes
    description: Prevent very large file additions
    rule:
      type: for_each
      select:
        type: select_files
        path_pattern: '**/*.ts'
      assert:
        type: assert_property
        property_path: 'insertions'
        expected_value: 100
        operator: '<='
`;

        const files: FileInfo[] = [
            {
                path: 'small-change.ts',
                status: 'added',
                insertions: 50,
                deletions: 0,
                content: 'export const x = 1;'
            },
            {
                path: 'large-change.ts',
                status: 'added',
                insertions: 150,
                deletions: 0,
                content: 'export const y = 2;'
            },
        ];

        const parsedConfig = parseYAML(yamlConfig) as any;
        const factory = createRuleFactory();
        const rule = factory.create(parsedConfig.rules[0].rule);
        const context = createMockContext(files);
        
        const result = await rule.evaluate(context);
        
        // Should fail for the file with too many insertions
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations?.[0]?.file).toBe('large-change.ts');
    });

    it('should handle nested property access on file items', async () => {
        const yamlConfig = `
rules:
  - id: check-custom-property
    description: Check custom nested property
    rule:
      type: for_each
      select:
        type: select_files
        path_pattern: '**/*.ts'
      assert:
        type: assert_property
        property_path: 'metadata.priority'
        expected_value: 'high'
        operator: '=='
`;

        const files: FileInfo[] = [
            {
                path: 'important.ts',
                status: 'added',
                insertions: 10,
                deletions: 0,
                content: 'export const x = 1;',
                metadata: { priority: 'high' }
            } as any,
            {
                path: 'normal.ts',
                status: 'added',
                insertions: 5,
                deletions: 0,
                content: 'export const y = 2;',
                metadata: { priority: 'low' }
            } as any,
        ];

        const parsedConfig = parseYAML(yamlConfig) as any;
        const factory = createRuleFactory();
        const rule = factory.create(parsedConfig.rules[0].rule);
        const context = createMockContext(files);
        
        const result = await rule.evaluate(context);
        
        // Should fail for the file without high priority
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations?.[0]?.file).toBe('normal.ts');
    });

    it('should use matches operator to check file name patterns', async () => {
        const yamlConfig = `
rules:
  - id: enforce-naming-convention
    description: Ensure files follow naming convention
    rule:
      type: for_each
      select:
        type: select_files
        path_pattern: 'src/**/*.ts'
      assert:
        type: assert_property
        property_path: 'path'
        expected_value: 'src/.*\\.service\\.ts$'
        operator: 'matches'
`;

        const files: FileInfo[] = [
            {
                path: 'src/user.service.ts',
                status: 'added',
                insertions: 100,
                deletions: 0,
                content: 'export class UserService {}'
            },
            {
                path: 'src/helper.ts',
                status: 'added',
                insertions: 50,
                deletions: 0,
                content: 'export function helper() {}'
            },
        ];

        const parsedConfig = parseYAML(yamlConfig) as any;
        const factory = createRuleFactory();
        const rule = factory.create(parsedConfig.rules[0].rule);
        const context = createMockContext(files);
        
        const result = await rule.evaluate(context);
        
        // Should fail for the file that doesn't match the service pattern
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations?.[0]?.file).toBe('src/helper.ts');
    });
});