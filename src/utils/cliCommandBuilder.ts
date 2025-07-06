import { Mode } from '../types';

export interface OriginalCliArgs {
    config?: string;
    exclude?: string[];
    repo?: string;
    C?: string;
    base: string;
    head?: string;
    mode?: Mode;
}

/**
 * Generates a CLI command string preserving original arguments except format and claude-code-hook
 */
export function generateFullViewCommand(originalArgs: OriginalCliArgs): string {
    const parts = ['codeguardian check'];
    
    if (originalArgs.config) {
        parts.push(`--config "${originalArgs.config}"`);
    }
    
    if (originalArgs.exclude?.length) {
        originalArgs.exclude.forEach(pattern => {
            parts.push(`--exclude "${pattern}"`);
        });
    }
    
    if (originalArgs.repo) {
        parts.push(`--repo "${originalArgs.repo}"`);
    }
    
    if (originalArgs.C) {
        parts.push(`-C "${originalArgs.C}"`);
    }
    
    if (originalArgs.base && originalArgs.base !== 'main') {
        parts.push(`--base ${originalArgs.base}`);
    }
    
    if (originalArgs.head && originalArgs.head !== 'HEAD') {
        parts.push(`--head ${originalArgs.head}`);
    }
    
    if (originalArgs.mode && originalArgs.mode !== 'diff') {
        parts.push(`--mode ${originalArgs.mode}`);
    }
    
    parts.push('--format=console');
    
    return parts.join(' ');
}