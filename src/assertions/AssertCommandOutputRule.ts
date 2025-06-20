import { AssertionRule } from '../core';
import { EvaluationContext, CommandOutput, CountCondition } from '../types';

type CommandOutputTarget = 'stdout' | 'stderr' | 'exitCode';

export class AssertCommandOutputRule extends AssertionRule {
    constructor(
        id: string,
        private target: CommandOutputTarget,
        private pattern?: RegExp,
        private condition?: CountCondition,
        private value?: number,
        private firstLines?: number,
        private lastLines?: number,
        private shouldMatch: boolean = true
    ) {
        super(id);

        if (this.firstLines && this.lastLines) {
            throw new Error('Cannot use firstLines and lastLines simultaneously.');
        }
    }

    async assert(item: any, _context: EvaluationContext): Promise<boolean> {
        const commandOutput = item as CommandOutput;
        if (!commandOutput || typeof commandOutput.exitCode !== 'number') {
            return false;
        }

        switch (this.target) {
            case 'exitCode':
                return this.assertExitCode(commandOutput.exitCode);
            case 'stdout':
            case 'stderr':
                return this.assertOutputText(commandOutput[this.target]);
            default:
                return false;
        }
    }
    
    private assertExitCode(exitCode: number): boolean {
        if (this.condition === undefined || this.value === undefined) {
            throw new Error('Asserting against exitCode requires "condition" and "value"');
        }
        
        switch (this.condition) {
            case '==': return exitCode === this.value;
            case '!=': return exitCode !== this.value;
            case '>':  return exitCode > this.value;
            case '>=': return exitCode >= this.value;
            case '<':  return exitCode < this.value;
            case '<=': return exitCode <= this.value;
            default: return false;
        }
    }

    private assertOutputText(text: string): boolean {
        if (!this.pattern) {
            throw new Error('Asserting against stdout/stderr requires a "pattern"');
        }
        
        let targetText = text;
        const lines = text.split('\n');

        if (this.firstLines) {
            targetText = lines.slice(0, this.firstLines).join('\n');
        } else if (this.lastLines) {
            targetText = lines.slice(-this.lastLines).join('\n');
        }

        const matches = this.pattern.test(targetText);
        return this.shouldMatch ? matches : !matches;
    }
}