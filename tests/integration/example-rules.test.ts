import { promises as fs } from 'fs';
import * as path from 'path';
import { createRuleFactory } from '../../src/config';
import { ResultCache } from '../../src/core';
import { EvaluationContext, FileInfo, DiffInfo } from '../../src/types';

describe('Example Rules Integration Tests', () => {
    const factory = createRuleFactory();

    const createMockContext = (files: FileInfo[]): EvaluationContext => {
        const mockRepository = {
            getFiles: jest.fn().mockResolvedValue(files),
            getFileContent: jest.fn().mockImplementation((filePath: string) => {
                const file = files.find(f => f.path === filePath);
                if (file?.content) {
                    return Promise.resolve(file.content);
                }
                throw new Error(`File not found: ${filePath}`);
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
            repository: mockRepository as any,
            diff: mockDiff,
            cache: new ResultCache(),
            config: { type: 'test' },
        };
    };

    describe('no-console-log.yaml', () => {
        it('should detect console.log in modified files', async () => {
            const yamlPath = path.join(__dirname, '../../examples/no-console-log.cg.yaml');
            const yaml = await fs.readFile(yamlPath, 'utf-8');
            const rule = factory.loadFromYAML(yaml);

            const files: FileInfo[] = [
                {
                    path: 'src/utils.ts',
                    status: 'modified',
                    insertions: 0,
                    deletions: 0,
                    content: `export function debug(msg: string) {
  console.log('Debug:', msg);
}`,
                },
                {
                    path: 'src/index.ts',
                    status: 'modified',
                    insertions: 0,
                    deletions: 0,
                    content: `export function main() {
  return 'Hello World';
}`,
                },
                {
                    path: 'src/utils.test.ts',
                    status: 'modified',
                    insertions: 0,
                    deletions: 0,
                    content: `console.log('This is in a test file');`,
                },
            ];

            const context = createMockContext(files);
            const result = await rule.evaluate(context);

            expect(result.passed).toBe(false);
            expect(result.violations).toHaveLength(1);
            expect(result.violations![0]?.file).toBe('src/utils.ts');
        });
    });

    describe('security-checks.yaml', () => {
        it('should detect hardcoded secrets', async () => {
            const yamlPath = path.join(__dirname, '../../examples/security-checks.cg.yaml');
            const yaml = await fs.readFile(yamlPath, 'utf-8');
            const rule = factory.loadFromYAML(yaml);

            const files: FileInfo[] = [
                {
                    path: 'config.js',
                    status: 'added',
                    insertions: 0,
                    deletions: 0,
                    content: `const config = {
  api_key: 'sk-1234567890abcdef',
  endpoint: 'https://api.example.com'
};`,
                },
                {
                    path: 'App.tsx',
                    status: 'modified',
                    insertions: 0,
                    deletions: 0,
                    content: `<div dangerouslySetInnerHTML={{ __html: userInput }} />`,
                },
            ];

            const context = createMockContext(files);
            const result = await rule.evaluate(context);

            expect(result.passed).toBe(false);
            // The all_of combinator short-circuits on first failure
            expect(result.violations).toHaveLength(1);
            // Could be either file depending on evaluation order
            expect(result.violations![0]?.severity).toBe('error');
        });

        it('should pass when no security issues found', async () => {
            const yamlPath = path.join(__dirname, '../../examples/security-checks.cg.yaml');
            const yaml = await fs.readFile(yamlPath, 'utf-8');
            const rule = factory.loadFromYAML(yaml);

            const files: FileInfo[] = [
                {
                    path: 'config.js',
                    status: 'added',
                    insertions: 0,
                    deletions: 0,
                    content: `const config = {
  apiKey: process.env.API_KEY,
  endpoint: process.env.API_ENDPOINT
};`,
                },
                {
                    path: 'App.tsx',
                    status: 'modified',
                    insertions: 0,
                    deletions: 0,
                    content: `<div>{userContent}</div>`,
                },
            ];

            const context = createMockContext(files);
            const result = await rule.evaluate(context);

            expect(result.passed).toBe(true);
        });
    });

    describe('clean-architecture.yaml', () => {
        it('should detect architecture violations', async () => {
            const yamlPath = path.join(__dirname, '../../examples/clean-architecture.cg.yaml');
            const yaml = await fs.readFile(yamlPath, 'utf-8');
            const rule = factory.loadFromYAML(yaml);

            const files: FileInfo[] = [
                {
                    path: 'src/domain/user.ts',
                    status: 'modified',
                    insertions: 0,
                    deletions: 0,
                    content: `import { Database } from '../infrastructure/database';

export class User {
  constructor(private db: Database) {}
}`,
                },
                {
                    path: 'src/application/userService.ts',
                    status: 'added',
                    insertions: 0,
                    deletions: 0,
                    content: `import { UserComponent } from '../presentation/UserComponent';

export class UserService {
  render() {
    return new UserComponent();
  }
}`,
                },
            ];

            const context = createMockContext(files);
            const result = await rule.evaluate(context);

            expect(result.passed).toBe(false);
            // We have two rules but the presentation violation is only checked on application files
            expect(result.violations).toHaveLength(1);
            expect(result.violations![0]?.file).toBe('src/domain/user.ts');
        });
    });
});
