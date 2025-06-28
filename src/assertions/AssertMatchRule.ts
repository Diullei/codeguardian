import { AssertionRule } from '../core';
import { EvaluationContext, AssertionResult } from '../types';

export class AssertMatchRule extends AssertionRule {
    constructor(
        id: string,
        private pattern: RegExp,
        private shouldMatch: boolean = true,
        private suggestion?: string,
        private documentation?: string
    ) {
        super(id);
    }

    async assert(item: any, _context: EvaluationContext): Promise<boolean> {
        const text = this.extractText(item);
        const matches = this.pattern.test(text);
        return this.shouldMatch ? matches : !matches;
    }

    async assertWithDetails(item: any, _context: EvaluationContext): Promise<AssertionResult> {
        // Special handling for deleted files
        if (item && typeof item === 'object' && 'status' in item && item.status === 'deleted' && !item.content) {
            // For deleted files, we can't match against content
            // If we're expecting a match, it will fail (no content to match)
            // If we're expecting no match, it will pass (no content means no match)
            if (this.shouldMatch) {
                return {
                    passed: false,
                    message: `Cannot match pattern against deleted file`,
                    context: {
                        suggestion: 'Deleted files have no content to match against. Use assert_property to check file status instead.',
                        documentation: this.documentation,
                    },
                };
            } else {
                // If we don't want a match and the file is deleted, that's fine
                return { passed: true };
            }
        }

        const text = this.extractText(item);
        const matches = this.pattern.test(text);
        const passed = this.shouldMatch ? matches : !matches;

        if (!passed) {
            const itemType = this.getItemType(item);
            const patternStr = this.pattern.source;

            // Extract a snippet of code around the violation
            let codeSnippet: string | undefined;
            if (text && text.length < 200) {
                codeSnippet = text;
            } else if (text) {
                // Find the first match or non-match location
                const match = text.match(this.pattern);
                if (match && match.index !== undefined) {
                    const start = Math.max(0, match.index - 50);
                    const end = Math.min(text.length, match.index + match[0].length + 50);
                    codeSnippet = '...' + text.substring(start, end) + '...';
                } else {
                    codeSnippet = text.substring(0, 150) + '...';
                }
            }

            return {
                passed: false,
                message: this.shouldMatch
                    ? `Expected ${itemType} to match pattern '${patternStr}' but it didn't`
                    : `Expected ${itemType} NOT to match pattern '${patternStr}' but it did`,
                context: {
                    code: codeSnippet,
                    suggestion: this.suggestion,
                    documentation: this.documentation,
                },
            };
        }

        return { passed: true };
    }

    private extractText(item: any): string {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
            if ('content' in item) return String(item.content);
            if ('text' in item) return String(item.text);
            if ('path' in item) return String(item.path);
        }
        return String(item);
    }

    private getItemType(item: any): string {
        if (typeof item === 'string') return 'text';
        if (item && typeof item === 'object') {
            if ('content' in item && 'path' in item) return 'file content';
            if ('lineNumber' in item) return 'line';
            if ('type' in item && item.type) return 'AST node';
            if ('path' in item) return 'file path';
        }
        return 'item';
    }
}
