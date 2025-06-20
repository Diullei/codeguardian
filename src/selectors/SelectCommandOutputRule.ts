import { SelectorRule } from '../core';
import { EvaluationContext, CommandOutput } from '../types';
import { exec } from 'child_process';

export class SelectCommandOutputRule extends SelectorRule {
    constructor(
        id: string,
        private command: string
    ) {
        super(id);
    }

    async select(_context: EvaluationContext): Promise<CommandOutput[]> {
        return new Promise<CommandOutput[]>(resolve => {
            exec(this.command, (error, stdout, stderr) => {
                const result: CommandOutput = {
                    command: this.command,
                    exitCode: error ? (error as any).code || 1 : 0,
                    stdout: stdout.trim(),
                    stderr: stderr.trim(),
                };
                resolve([result]);
            });
        });
    }
}