import { AssertionRule } from '../core';
import { EvaluationContext, AssertionResult, ComparisonOperator } from '../types';

export class AssertLineCountRule extends AssertionRule {
    constructor(
        id: string,
        private operator: ComparisonOperator,
        private expectedValue: number,
        private message?: string,
        private suggestion?: string,
        private documentation?: string
    ) {
        super(id);
    }

    async assert(item: any, _context: EvaluationContext): Promise<boolean> {
        const lineCount = this.getLineCount(item);
        return this.compareValues(lineCount, this.expectedValue, this.operator);
    }

    async assertWithDetails(item: any, _context: EvaluationContext): Promise<AssertionResult> {
        const lineCount = this.getLineCount(item);
        const passed = this.compareValues(lineCount, this.expectedValue, this.operator);

        if (!passed) {
            const itemType = this.getItemType(item);
            const filePath = this.getFilePath(item);
            
            const defaultMessage = this.message || 
                `${itemType} has ${lineCount} lines, expected ${this.operator} ${this.expectedValue}`;

            return {
                passed: false,
                message: defaultMessage,
                context: {
                    code: filePath ? `File: ${filePath} (${lineCount} lines)` : `Lines: ${lineCount}`,
                    suggestion: this.suggestion || 
                        (lineCount > this.expectedValue ? 'Consider breaking this file into smaller modules' : undefined),
                    documentation: this.documentation,
                },
            };
        }

        return { passed: true };
    }

    private getLineCount(item: any): number {
        if (typeof item === 'string') {
            return this.countLines(item);
        }
        
        if (item && typeof item === 'object') {
            if ('content' in item && typeof item.content === 'string') {
                return this.countLines(item.content);
            }
            if ('text' in item && typeof item.text === 'string') {
                return this.countLines(item.text);
            }
            if ('lineCount' in item && typeof item.lineCount === 'number') {
                return item.lineCount;
            }
        }
        
        return 0;
    }

    private countLines(text: string): number {
        if (!text) return 0;
        
        // Split by line endings and filter empty lines at the end
        const lines = text.split(/\r?\n/);
        
        // Remove trailing empty lines but keep internal empty lines
        while (lines.length > 0 && lines[lines.length - 1] === '') {
            lines.pop();
        }
        
        return lines.length;
    }

    private compareValues(actual: number, expected: number, operator: ComparisonOperator): boolean {
        switch (operator) {
            case '==':
                return actual === expected;
            case '!=':
                return actual !== expected;
            case '>':
                return actual > expected;
            case '>=':
                return actual >= expected;
            case '<':
                return actual < expected;
            case '<=':
                return actual <= expected;
            default:
                throw new Error(`Unsupported operator for line count comparison: ${operator}`);
        }
    }

    private getItemType(item: any): string {
        if (typeof item === 'string') return 'text';
        if (item && typeof item === 'object') {
            if ('content' in item && 'path' in item) return 'file';
            if ('path' in item) return 'file path';
            if ('text' in item) return 'text content';
        }
        return 'item';
    }

    private getFilePath(item: any): string | undefined {
        if (item && typeof item === 'object' && 'path' in item) {
            return String(item.path);
        }
        return undefined;
    }
}