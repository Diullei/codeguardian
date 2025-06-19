import { SelectorRule } from '../core';
import { EvaluationContext, ASTNode } from '../types';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

type SupportedLanguage = 'typescript' | 'javascript' | 'tsx' | 'html' | 'css';

const CLI_LANGUAGE_MAP: Record<SupportedLanguage, string> = {
    typescript: 'ts',
    javascript: 'js',
    tsx: 'tsx',
    html: 'html',
    css: 'css',
};

export class SelectASTNodesRule extends SelectorRule {
    constructor(
        id: string,
        private query: string,
        private language: SupportedLanguage
    ) {
        super(id);
    }

    async select(context: EvaluationContext): Promise<ASTNode[]> {
        const content = context.currentItem as string;
        if (!content || typeof content !== 'string') {
            return [];
        }

        // Check if ast-grep CLI is available (cached)
        const isAstGrepAvailable = await context.cache.get('isAstGrepAvailable', async () => {
            try {
                await execAsync('ast-grep --version');
                return true;
            } catch (e) {
                return false;
            }
        });

        if (!isAstGrepAvailable) {
            if (context.cliArgs?.skipMissingAstGrep) {
                console.warn(
                    'Warning: ast-grep CLI is not installed. Skipping AST-based rule checks.'
                );
                console.warn('To install ast-grep, visit: https://ast-grep.github.io');
                return [];
            } else {
                throw new Error(
                    'ast-grep CLI is not installed. Please install it from https://ast-grep.github.io\n' +
                        'Alternatively, run with --skip-missing-ast-grep flag to skip AST-based rules.'
                );
            }
        }

        const cliLang = CLI_LANGUAGE_MAP[this.language];
        if (!cliLang) {
            throw new Error(`Unsupported language: ${this.language}`);
        }

        try {
            // Escape the content for shell safety
            const escapedContent = content.replace(/'/g, "'\\''");

            // Construct the command - use 'run' subcommand with --stdin flag
            const command = `echo '${escapedContent}' | ast-grep run --pattern '${this.query}' --lang '${cliLang}' --json=compact --stdin`;

            // Execute the command
            const { stdout, stderr } = await execAsync(command, {
                maxBuffer: 10 * 1024 * 1024, // 10MB buffer
            });

            if (stderr && !stdout) {
                // If there's only stderr and no stdout, it's likely an error
                throw new Error(`ast-grep error: ${stderr}`);
            }

            // Parse the JSON output
            if (!stdout || stdout.trim() === '') {
                return [];
            }

            const results = JSON.parse(stdout);

            // Map ast-grep results to ASTNode format
            return results.map((match: any) => {
                const node: ASTNode = {
                    type: 'match', // ast-grep doesn't provide node type in the same way
                    text: match.text,
                };

                if (match.range) {
                    // ast-grep provides byteOffset for range
                    node.range = [match.range.byteOffset.start, match.range.byteOffset.end];
                    node.loc = {
                        start: {
                            line: match.range.start.line + 1, // ast-grep uses 0-based line numbers
                            column: match.range.start.column,
                        },
                        end: {
                            line: match.range.end.line + 1, // ast-grep uses 0-based line numbers
                            column: match.range.end.column,
                        },
                    };
                }

                return node;
            });
        } catch (error) {
            if (error instanceof SyntaxError) {
                // JSON parsing error - likely no matches found
                return [];
            }

            // Re-throw other errors
            throw error;
        }
    }
}
