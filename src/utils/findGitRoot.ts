import * as fs from 'fs';
import * as path from 'path';

/**
 * Finds the root of a Git repository by traversing upward from the given directory.
 * @param startPath The directory to start searching from (defaults to current working directory)
 * @returns The absolute path to the Git repository root, or null if not found
 */
export function findGitRoot(startPath: string = process.cwd()): string | null {
    let currentPath = path.resolve(startPath);
    const root = path.parse(currentPath).root;

    while (currentPath !== root) {
        const gitPath = path.join(currentPath, '.git');
        
        try {
            const stats = fs.statSync(gitPath);
            if (stats.isDirectory() || stats.isFile()) {
                // .git can be a directory (normal repos) or a file (submodules/worktrees)
                return currentPath;
            }
        } catch (error) {
            // .git doesn't exist in this directory, continue searching
        }

        // Move up one directory
        currentPath = path.dirname(currentPath);
    }

    // Check the root directory as well
    try {
        const gitPath = path.join(root, '.git');
        const stats = fs.statSync(gitPath);
        if (stats.isDirectory() || stats.isFile()) {
            return root;
        }
    } catch (error) {
        // .git doesn't exist in root either
    }

    return null;
}

/**
 * Resolves the repository path based on the provided options.
 * @param explicitPath Explicitly provided repository path (from --repo flag)
 * @param changeDirectory Directory to change to first (from -C flag)
 * @returns The resolved repository path
 */
export function resolveRepositoryPath(
    explicitPath?: string,
    changeDirectory?: string
): string {
    // If -C is provided, change to that directory first
    const startPath = changeDirectory 
        ? path.resolve(changeDirectory) 
        : process.cwd();

    // If explicit repo path is provided, use it (relative to startPath)
    if (explicitPath !== undefined) {
        return path.resolve(startPath, explicitPath);
    }

    // Otherwise, auto-discover from the start path
    const gitRoot = findGitRoot(startPath);
    
    // If no git root found, use the start path
    return gitRoot || startPath;
}