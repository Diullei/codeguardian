import { SelectorRule } from '../core';
import { EvaluationContext, FileInfo } from '../types';

export class SelectFileChangesRule extends SelectorRule {
    constructor(
        id: string,
        private minPercentage?: number,
        private maxPercentage?: number
    ) {
        super(id);
    }

    async select(context: EvaluationContext): Promise<FileInfo[]> {
        // Get all files from the diff
        const allFiles = await context.repository.getFiles(context.diff, context.mode);

        // Filter for modified or added files (percentage is most relevant for these)
        const relevantFiles = allFiles.filter(
            file => file.status === 'modified' || file.status === 'added'
        );

        // Calculate change percentage for each file and filter based on criteria
        const selectedFiles: FileInfo[] = [];

        for (const file of relevantFiles) {
            // Load file content to count total lines
            let totalLines = 0;
            try {
                const content = await context.repository.getFileContent(file.path);
                totalLines = content.split('\n').length;
            } catch (error) {
                // If we can't read the file, skip it
                continue;
            }

            // Calculate change percentage
            // Handle edge case where totalLines is 0 to avoid division by zero
            let changePercentage = 0;
            if (totalLines > 0) {
                changePercentage = ((file.insertions + file.deletions) / totalLines) * 100;
            } else if (file.insertions > 0 || file.deletions > 0) {
                // If file has changes but no lines (empty file), consider it 100% changed
                changePercentage = 100;
            }

            // Check if file meets the percentage criteria
            const meetsMinCriteria = this.minPercentage === undefined || changePercentage >= this.minPercentage;
            const meetsMaxCriteria = this.maxPercentage === undefined || changePercentage <= this.maxPercentage;

            if (meetsMinCriteria && meetsMaxCriteria) {
                selectedFiles.push(file);
            }
        }

        return selectedFiles;
    }
}