import { createRuleFactory } from '../../src/config';
import { EvaluationContext, Repository, DiffInfo, FileInfo } from '../../src/types';
import { ResultCache } from '../../src/core';
import { parse as parseYAML } from 'yaml';

describe('Integration: file_name_matches property issue', () => {
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

    it('should correctly validate file naming convention using matches operator', async () => {
        // This is the correct way to check file names
        const yamlConfig = `
id: test-file-naming
description: Test files must follow proper naming convention
rule:
  type: for_each
  select:
    type: select_files
    path_pattern: 'tests/**/*.py'
    exclude:
      - '**/__init__.py'
  assert:
    type: assert_property
    property_path: 'path'
    expected_value: 'test_.*\\.py$'
    operator: 'matches'
`;

        const files: FileInfo[] = [
            {
                path: 'tests/test_example.py',
                status: 'added',
                insertions: 10,
                deletions: 0,
                content: '"""Test file"""'
            },
            {
                path: 'tests/test_another.py',
                status: 'added',
                insertions: 10,
                deletions: 0,
                content: '"""Another test"""'
            },
            {
                path: 'tests/example_test.py',
                status: 'added',
                insertions: 10,
                deletions: 0,
                content: '"""Bad naming"""'
            },
        ];

        const parsedConfig = parseYAML(yamlConfig) as any;
        const factory = createRuleFactory();
        const rule = factory.create(parsedConfig.rule);
        const context = createMockContext(files);
        
        const result = await rule.evaluate(context);
        
        // Should fail for the file that doesn't match the naming convention
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations?.[0]?.file).toBe('tests/example_test.py');
        expect(result.violations?.[0]?.message).toBe("Assertion 'assert_property' failed");
    });

    it('should handle the incorrect property name gracefully', async () => {
        // This tests the user's original YAML that uses 'property' instead of 'property_path'
        const yamlConfig = `
id: test-file-naming
description: Test files must follow proper naming convention
rule:
  type: for_each
  select:
    type: select_files
    path_pattern: 'tests/**/*.py'
  assert:
    type: assert_property
    property: file_name_matches
    pattern: '^test_.*\\.py$'
`;

        const files: FileInfo[] = [
            {
                path: 'tests/test_example.py',
                status: 'added',
                insertions: 10,
                deletions: 0,
                content: '"""Test file"""'
            },
        ];

        const parsedConfig = parseYAML(yamlConfig) as any;
        const factory = createRuleFactory();
        
        // The builder should handle the incorrect property name
        expect(() => factory.create(parsedConfig.rule)).not.toThrow();
        
        const rule = factory.create(parsedConfig.rule);
        const context = createMockContext(files);
        
        // This will likely fail because 'property' is not recognized
        const result = await rule.evaluate(context);
        
        // The rule should not crash but may not work as expected
        expect(result).toBeDefined();
    });

    it('should check only the filename, not the full path', async () => {
        const yamlConfig = `
id: test-file-naming
description: Test files must start with test_
rule:
  type: for_each
  select:
    type: select_files
    path_pattern: 'tests/**/*.py'
  assert:
    type: assert_property
    property_path: 'path'
    expected_value: '/test_[^/]+\\.py$'
    operator: 'matches'
`;

        const files: FileInfo[] = [
            {
                path: 'tests/subdirectory/test_nested.py',
                status: 'added',
                insertions: 10,
                deletions: 0,
                content: '"""Nested test file"""'
            },
            {
                path: 'tests/subdirectory/nested_test.py',
                status: 'added',
                insertions: 10,
                deletions: 0,
                content: '"""Bad naming in subdirectory"""'
            },
        ];

        const parsedConfig = parseYAML(yamlConfig) as any;
        const factory = createRuleFactory();
        const rule = factory.create(parsedConfig.rule);
        const context = createMockContext(files);
        
        const result = await rule.evaluate(context);
        
        // Should fail only for the file that doesn't follow the convention
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations?.[0]?.file).toBe('tests/subdirectory/nested_test.py');
    });
});