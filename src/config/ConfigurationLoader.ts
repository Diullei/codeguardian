import { promises as fs } from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import * as yaml from 'yaml';
import { RuleConfig } from '../types';

export interface LoadedConfiguration {
    path: string;
    content: RuleConfig;
}

export class ConfigurationLoader {
    private static readonly DEFAULT_PATTERNS = [
        '**/*.codeguardian.yaml',
        '**/*.codeguardian.yml',
        '**/*.cg.yaml',
        '**/*.cg.yml',
        '.codeguardian.yaml',
        '.codeguardian.yml',
        '.cg.yaml',
        '.cg.yml',
        '.codeguardian/*.yaml',
        '.codeguardian/*.yml',
        '.codeguardian/*.cg.yaml',
        '.codeguardian/*.cg.yml',
        '.codeguardian/*.codeguardian.yaml',
        '.codeguardian/*.codeguardian.yml',
    ];

    /**
     * Get all directories containing .cg-ignore files
     * @param basePath Base directory to search from
     * @returns Array of directory patterns to ignore
     */
    private async getSkipDirectories(basePath: string): Promise<string[]> {
        const skipDirs: string[] = [];
        const cgignoreFiles = await glob('**/.cg-ignore', {
            cwd: basePath,
            absolute: true,
            ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
        });

        for (const cgignorePath of cgignoreFiles) {
            const dir = path.dirname(cgignorePath);
            const relativePath = path.relative(basePath, dir);
            skipDirs.push(`${relativePath}/**`);
        }

        return skipDirs;
    }

    /**
     * Load configuration files based on pattern or auto-discovery
     * @param pattern Optional glob pattern or specific file path
     * @param basePath Base directory to search from
     * @param excludePatterns Optional array of glob patterns to exclude
     * @returns Array of loaded configurations
     */
    async loadConfigurations(
        pattern?: string,
        basePath: string = '.',
        excludePatterns?: string[]
    ): Promise<LoadedConfiguration[]> {
        const absoluteBasePath = path.resolve(basePath);
        let filePaths: string[] = [];

        // Get directories to skip based on .cg-ignore files
        const skipDirectories = await this.getSkipDirectories(absoluteBasePath);

        // Build ignore patterns
        const defaultIgnore = ['**/node_modules/**', '**/dist/**', '**/.git/**'];
        const ignorePatterns = [...defaultIgnore, ...skipDirectories, ...(excludePatterns || [])];

        if (pattern) {
            // If pattern is provided, check if it's a specific file or a glob pattern
            const absolutePattern = path.isAbsolute(pattern)
                ? pattern
                : path.join(absoluteBasePath, pattern);

            try {
                const stats = await fs.stat(absolutePattern);
                if (stats.isFile()) {
                    // It's a specific file
                    filePaths = [absolutePattern];
                }
            } catch {
                // Not a file, treat as glob pattern
                filePaths = await glob(pattern, {
                    cwd: absoluteBasePath,
                    absolute: true,
                    ignore: ignorePatterns,
                });
            }
        } else {
            // Auto-discovery mode: search for default patterns
            const allFiles: string[] = [];

            for (const defaultPattern of ConfigurationLoader.DEFAULT_PATTERNS) {
                const files = await glob(defaultPattern, {
                    cwd: absoluteBasePath,
                    absolute: true,
                    ignore: ignorePatterns,
                });
                allFiles.push(...files);
            }

            // Remove duplicates
            filePaths = [...new Set(allFiles)];
        }

        if (filePaths.length === 0) {
            throw new Error(
                pattern
                    ? `No configuration files found matching pattern: ${pattern}`
                    : `No configuration files found. Looked for: ${ConfigurationLoader.DEFAULT_PATTERNS.join(', ')}`
            );
        }

        // Load and parse all configuration files
        const configurations: LoadedConfiguration[] = [];

        for (const filePath of filePaths) {
            try {
                const content = await fs.readFile(filePath, 'utf-8');
                const config = yaml.parse(content) as RuleConfig;

                configurations.push({
                    path: filePath,
                    content: config,
                });
            } catch (error) {
                throw new Error(
                    `Failed to load configuration from ${filePath}: ${error instanceof Error ? error.message : String(error)}`
                );
            }
        }

        return configurations;
    }

    /**
     * Merge multiple configurations into a single rule configuration
     * @param configurations Array of loaded configurations
     * @returns Merged rule configuration
     */
    mergeConfigurations(configurations: LoadedConfiguration[]): RuleConfig {
        if (configurations.length === 0) {
            throw new Error('No configurations to merge');
        }

        if (configurations.length === 1) {
            const firstConfig = configurations[0];
            if (!firstConfig) {
                throw new Error('No configuration found');
            }
            return firstConfig.content;
        }

        // Create a combined rule using all_of combinator
        const mergedRules = configurations.map(config => ({
            ...config.content,
            type: config.content.type || 'unknown',
        }));

        return {
            id: 'merged-configuration',
            description: `Merged configuration from ${configurations.length} files`,
            type: 'all_of',
            rules: mergedRules,
        };
    }
}
