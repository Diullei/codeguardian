import { SelectorRule } from '../core';
import { EvaluationContext, LineInfo } from '../types';

export class SelectLinesRule extends SelectorRule {
    constructor(
        id: string,
        private pattern: RegExp,
        private includeContext: number = 0
    ) {
        super(id);
    }

    async select(context: EvaluationContext): Promise<LineInfo[]> {
        const content = context.currentItem as string;
        if (!content || typeof content !== 'string') {
            return [];
        }

        const lines = content.split('\n');
        const matches: LineInfo[] = [];

        lines.forEach((line, index) => {
            if (this.pattern.test(line)) {
                matches.push({
                    lineNumber: index + 1,
                    content: line,
                    context: this.getContext(lines, index, this.includeContext),
                });
            }
        });

        return matches;
    }

    private getContext(lines: string[], index: number, contextSize: number): string[] {
        if (contextSize === 0) return [];

        const context: string[] = [];
        const start = Math.max(0, index - contextSize);
        const end = Math.min(lines.length - 1, index + contextSize);

        for (let i = start; i <= end; i++) {
            if (i !== index) {
                context.push(lines[i]!);
            }
        }

        return context;
    }
}
