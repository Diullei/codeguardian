import { SelectLinesRule } from '../../../src/selectors/SelectLinesRule';
import { EvaluationContext, Repository, DiffInfo } from '../../../src/types';
import { ResultCache } from '../../../src/core';

describe('SelectLinesRule', () => {
    const createMockContext = (currentItem?: any): EvaluationContext => {
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
            config: { type: 'select-lines' },
            currentItem,
        };
    };

    it('should select lines matching pattern', async () => {
        const content = `function foo() {
  // TODO: implement this
  console.log('hello');
  // TODO: fix this later
}`;

        const rule = new SelectLinesRule('test-rule', /TODO/);
        const context = createMockContext(content);
        const result = await rule.select(context);

        expect(result).toHaveLength(2);
        expect(result[0]?.lineNumber).toBe(2);
        expect(result[0]?.content).toContain('TODO: implement this');
        expect(result[1]?.lineNumber).toBe(4);
        expect(result[1]?.content).toContain('TODO: fix this later');
    });

    it('should include context lines when specified', async () => {
        const content = `line 1
line 2
TODO: match this
line 4
line 5`;

        const rule = new SelectLinesRule('test-rule', /TODO/, 1);
        const context = createMockContext(content);
        const result = await rule.select(context);

        expect(result).toHaveLength(1);
        expect(result[0]?.context).toEqual(['line 2', 'line 4']);
    });

    it('should return empty array for non-string content', async () => {
        const rule = new SelectLinesRule('test-rule', /TODO/);

        const context1 = createMockContext(null);
        const result1 = await rule.select(context1);
        expect(result1).toEqual([]);

        const context2 = createMockContext({ notAString: true });
        const result2 = await rule.select(context2);
        expect(result2).toEqual([]);
    });

    it('should handle empty string content', async () => {
        const rule = new SelectLinesRule('test-rule', /TODO/);
        const context = createMockContext('');
        const result = await rule.select(context);

        expect(result).toEqual([]);
    });

    it('should match with regex flags', async () => {
        const content = `TODO: uppercase
todo: lowercase
ToDo: mixed case`;

        const rule = new SelectLinesRule('test-rule', /todo/i);
        const context = createMockContext(content);
        const result = await rule.select(context);

        expect(result).toHaveLength(3);
    });
});
