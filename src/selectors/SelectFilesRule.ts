import { minimatch } from 'minimatch';
import { SelectorRule } from '../core';
import { EvaluationContext, FileInfo, FileStatus } from '../types';

export class SelectFilesRule extends SelectorRule {
    constructor(
        id: string,
        private pathPattern?: string,
        private status?: FileStatus[],
        private excludePattern?: string,
        private selectAll: boolean = false
    ) {
        super(id);
    }

    async select(context: EvaluationContext): Promise<FileInfo[]> {
        const allFiles = this.selectAll
            ? await context.repository.getAllFiles()
            : await context.repository.getFiles(context.diff);

        return allFiles.filter(file => {
            if (this.pathPattern && !minimatch(file.path, this.pathPattern)) {
                return false;
            }

            // When using selectAll, we don't filter by status since all files have 'modified' status
            if (!this.selectAll && this.status && !this.status.includes(file.status)) {
                return false;
            }

            if (this.excludePattern && minimatch(file.path, this.excludePattern)) {
                return false;
            }

            return true;
        });
    }
}
