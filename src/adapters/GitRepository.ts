import simpleGit, { SimpleGit } from 'simple-git';
import { promises as fs } from 'fs';
import * as path from 'path';
import { Repository, FileInfo, DiffInfo, FileStatus } from '../types';

export class GitRepository implements Repository {
    private git: SimpleGit;

    constructor(private repoPath: string) {
        this.git = simpleGit(repoPath);
    }

    async getFiles(diff: DiffInfo): Promise<FileInfo[]> {
        return diff.files;
    }

    async getAllFiles(): Promise<FileInfo[]> {
        // Get all tracked files in the repository
        const lsFiles = await this.git.raw(['ls-files']);
        const trackedFiles = lsFiles
            .trim()
            .split('\n')
            .filter(f => f);

        // Get status to identify any untracked files that might be relevant
        const status = await this.git.status();

        const allFilePaths = new Set<string>([
            ...trackedFiles,
            ...status.not_added,
            ...status.created,
            ...status.modified,
            ...status.renamed.map(r => r.to),
        ]);

        const files: FileInfo[] = await Promise.all(
            Array.from(allFilePaths).map(async filePath => {
                const fileInfo: FileInfo = {
                    path: filePath,
                    status: 'modified', // Default status for getAllFiles
                    insertions: 0, // No diff information available for getAllFiles
                    deletions: 0,
                };

                try {
                    fileInfo.content = await this.getFileContent(filePath);
                } catch (error) {
                    // File might not be readable
                }

                return fileInfo;
            })
        );

        return files;
    }

    async getFileContent(filePath: string): Promise<string> {
        const fullPath = path.join(this.repoPath, filePath);
        return fs.readFile(fullPath, 'utf-8');
    }

    async getDiff(baseBranch: string, headBranch: string): Promise<DiffInfo> {
        // If headBranch is 'HEAD', include both committed and uncommitted changes
        if (headBranch === 'HEAD') {
            // Get diff between baseBranch and HEAD (committed changes)
            const committedDiff = await this.git.diffSummary([`${baseBranch}...HEAD`]);

            // Get working directory changes (staged and unstaged)
            const workingDiff = await this.git.diffSummary(['HEAD']);

            // Combine both diffs
            const allFiles = new Map<string, any>();

            // Add committed changes
            committedDiff.files.forEach(file => {
                allFiles.set(file.file, file);
            });

            // Add/update with working directory changes
            workingDiff.files.forEach(file => {
                allFiles.set(file.file, file);
            });

            const files: FileInfo[] = await Promise.all(
                Array.from(allFiles.values()).map(async (file: any) => {
                    const status = this.mapGitStatus(file);
                    const fileInfo: FileInfo = {
                        path: file.file,
                        status,
                        insertions: file.insertions || 0,
                        deletions: file.deletions || 0,
                    };

                    if (file.binary === false && (status === 'added' || status === 'modified')) {
                        try {
                            fileInfo.content = await this.getFileContent(file.file);
                        } catch (error) {
                            // File might not exist in working directory
                        }
                    }

                    if (status === 'renamed' && 'from' in file && file.from) {
                        fileInfo.oldPath = file.from;
                    }

                    return fileInfo;
                })
            );

            return {
                files,
                baseBranch,
                headBranch,
            };
        } else {
            // Normal diff between two branches/commits
            const diffSummary = await this.git.diffSummary([`${baseBranch}...${headBranch}`]);

            const files: FileInfo[] = await Promise.all(
                diffSummary.files.map(async (file: any) => {
                    const status = this.mapGitStatus(file);
                    const fileInfo: FileInfo = {
                        path: file.file,
                        status,
                        insertions: file.insertions || 0,
                        deletions: file.deletions || 0,
                    };

                    if (file.binary === false && (status === 'added' || status === 'modified')) {
                        try {
                            fileInfo.content = await this.getFileContent(file.file);
                        } catch (error) {
                            // File might not exist in working directory
                        }
                    }

                    if (status === 'renamed' && 'from' in file && file.from) {
                        fileInfo.oldPath = file.from;
                    }

                    return fileInfo;
                })
            );

            return {
                files,
                baseBranch,
                headBranch,
            };
        }
    }

    private mapGitStatus(file: any): FileStatus {
        if (file.deletions === 0 && file.insertions > 0 && !file.from) {
            return 'added';
        } else if (file.deletions > 0 && file.insertions === 0) {
            return 'deleted';
        } else if (file.from && file.file !== file.from) {
            return 'renamed';
        } else {
            return 'modified';
        }
    }
}
