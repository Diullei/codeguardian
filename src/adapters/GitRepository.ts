import simpleGit, { SimpleGit } from 'simple-git';
import { promises as fs } from 'fs';
import * as path from 'path';
import { Repository, FileInfo, DiffInfo, FileStatus, Mode } from '../types';

export class GitRepository implements Repository {
    private git: SimpleGit;

    constructor(private repoPath: string) {
        this.git = simpleGit(repoPath);
    }

    async getDefaultBranch(): Promise<string> {
        try {
            // Try to get the default branch from git config
            const remoteHead = await this.git.raw(['symbolic-ref', 'refs/remotes/origin/HEAD']);
            if (remoteHead) {
                // Extract branch name from refs/remotes/origin/main format
                const match = remoteHead.match(/refs\/remotes\/origin\/(.+)/);
                if (match && match[1]) {
                    return match[1].trim();
                }
            }
        } catch {
            // If symbolic-ref fails, continue to fallback logic
        }

        // Check if 'main' branch exists
        try {
            await this.git.raw(['rev-parse', '--verify', 'refs/heads/main']);
            return 'main';
        } catch {
            // 'main' doesn't exist, try 'master'
            try {
                await this.git.raw(['rev-parse', '--verify', 'refs/heads/master']);
                return 'master';
            } catch {
                // Neither exists, default to 'main'
                return 'main';
            }
        }
    }

    async getFiles(diff: DiffInfo, mode: Mode = 'diff'): Promise<FileInfo[]> {
        switch (mode) {
            case 'diff':
                // Default behavior - return files from diff
                return diff.files;
            
            case 'all':
                // Return all files in working directory (tracked and untracked)
                return this.getAllWorkingFiles();
            
            case 'staged':
                // Return only staged files
                return this.getStagedFiles();
            
            default:
                return diff.files;
        }
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

    private async getAllWorkingFiles(): Promise<FileInfo[]> {
        // Get all tracked files
        const lsFiles = await this.git.raw(['ls-files']);
        const trackedFiles = lsFiles
            .trim()
            .split('\n')
            .filter(f => f);

        // Get status to find untracked and modified files
        const status = await this.git.status();

        // Create a map to track file statuses
        const fileStatusMap = new Map<string, FileStatus>();

        // Mark tracked files as 'modified' by default
        trackedFiles.forEach(file => {
            fileStatusMap.set(file, 'modified');
        });

        // Mark new/untracked files as 'added'
        [...status.not_added, ...status.created].forEach(file => {
            fileStatusMap.set(file, 'added');
        });

        // Mark modified files
        status.modified.forEach(file => {
            fileStatusMap.set(file, 'modified');
        });

        // Mark deleted files
        status.deleted.forEach(file => {
            fileStatusMap.set(file, 'deleted');
        });

        // Mark renamed files
        status.renamed.forEach((rename) => {
            fileStatusMap.set(rename.to, 'renamed');
        });

        // Convert to FileInfo array
        const files: FileInfo[] = await Promise.all(
            Array.from(fileStatusMap.entries()).map(async ([filePath, status]) => {
                const fileInfo: FileInfo = {
                    path: filePath,
                    status,
                    insertions: 0,
                    deletions: 0,
                };

                // Get content for non-deleted files
                if (status !== 'deleted') {
                    try {
                        fileInfo.content = await this.getFileContent(filePath);
                    } catch (error) {
                        // File might not be readable
                    }
                }

                return fileInfo;
            })
        );

        return files;
    }

    private async getStagedFiles(): Promise<FileInfo[]> {
        // Get staged files using git diff --cached
        const stagedDiff = await this.git.diffSummary(['--cached']);

        const files: FileInfo[] = await Promise.all(
            stagedDiff.files.map(async (file: any) => {
                const status = this.mapGitStatus(file);
                const fileInfo: FileInfo = {
                    path: file.file,
                    status,
                    insertions: file.insertions || 0,
                    deletions: file.deletions || 0,
                };

                if (file.binary === false && status !== 'deleted') {
                    try {
                        fileInfo.content = await this.getFileContent(file.file);
                    } catch (error) {
                        // File might not exist
                    }
                }

                if (status === 'renamed' && 'from' in file && file.from) {
                    fileInfo.oldPath = file.from;
                }

                return fileInfo;
            })
        );

        return files;
    }
}
