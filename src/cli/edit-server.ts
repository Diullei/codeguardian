import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as http from 'http';
import open from 'open';
import { parse as parseYAML, stringify as stringifyYAML } from 'yaml';
import { createRuleFactory } from '../config';
import { EditArgs } from './index';

interface RuleRequest {
    id: string;
    description?: string;
    rule: any;
}

interface RuleResponse {
    id: string;
    description?: string;
    rule: any;
    filePath: string;
}

interface SaveResponse {
    success: boolean;
    message?: string;
}

interface ValidateResponse {
    valid: boolean;
    errors?: Array<{ message: string; path?: string }>;
}

export async function startEditServer(args: EditArgs): Promise<void> {
    const port = args.port || 3847;
    const host = args.host || '127.0.0.1';

    let ruleFilePath: string;

    if (args.file) {
        ruleFilePath = path.resolve(args.file);
    } else {
        ruleFilePath = path.resolve('.codeguardian/development-rules.cg.yaml');
    }

    const app: Express = express();
    app.use(cors());
    app.use(express.json());

    const uiDistPath = await resolveUiDistPath();

    app.get('/api/rule', async (req: Request, res: Response) => {
        try {
            const fileParam = req.query.file as string | undefined;
            const pathToRead = fileParam ? path.resolve(process.cwd(), fileParam) : ruleFilePath;
            const yamlContent = await fs.readFile(pathToRead, 'utf-8');
            const config = parseYAML(yamlContent) as any;

            let rule: any;
            if (config.rule) {
                rule = config.rule;
            } else if (config.type) {
                rule = config;
            } else {
                throw new Error('Invalid rule file: missing "rule" or "type" property');
            }

            const response: RuleResponse = {
                id: config.id || '',
                description: config.description || '',
                rule,
                filePath: pathToRead,
            };

            res.json(response);
        } catch (error) {
            if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
                const pathToRead = (req.query.file as string | undefined) ? path.resolve(process.cwd(), req.query.file as string) : ruleFilePath;
                const templateResponse: RuleResponse = {
                    id: '',
                    description: '',
                    rule: {
                        type: 'for_each',
                        select: {
                            type: 'select_files',
                            path_pattern: 'src/**/*.{ts,tsx}',
                            status: ['added', 'modified'],
                        },
                        assert: {
                            type: 'assert_match',
                            pattern: 'TODO',
                            should_match: false,
                        },
                    },
                    filePath: pathToRead,
                };
                res.json(templateResponse);
            } else {
                console.error('Error loading rule file:', error);
                res.status(500).json({
                    success: false,
                    message: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }
    });

    app.put('/api/rule', async (req: Request, res: Response) => {
        try {
            const { id, description, rule, filePath: bodyFilePath }: RuleRequest & { filePath?: string } = req.body;

            if (!id || !rule || !rule.type) {
                res.status(400).json({
                    success: false,
                    message: 'Missing required fields: id and rule.type',
                });
                return;
            }

            const pathToWrite = bodyFilePath ? path.resolve(process.cwd(), bodyFilePath) : ruleFilePath;

            const config: any = {
                id,
                description,
                rule,
            };

            const yamlContent = stringifyYAML(config, {
                indent: 2,
                lineWidth: 0,
                defaultKeyType: 'PLAIN',
                defaultStringType: 'QUOTE_DOUBLE',
            });

            await fs.writeFile(pathToWrite, yamlContent, 'utf-8');

            const response: SaveResponse = {
                success: true,
                message: 'Rule saved successfully',
            };

            res.json(response);
        } catch (error) {
            console.error('Error saving rule file:', error);
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });

    app.post('/api/validate', async (req: Request, res: Response) => {
        try {
            const { id, description, rule }: RuleRequest = req.body;

            if (!id || !rule || !rule.type) {
                const response: ValidateResponse = {
                    valid: false,
                    errors: [{ message: 'Missing required fields: id and rule.type' }],
                };
                res.status(200).json(response);
                return;
            }

            const config: any = {
                id,
                description,
                rule,
            };

            const yamlContent = stringifyYAML(config, {
                indent: 2,
                lineWidth: 0,
                defaultKeyType: 'PLAIN',
                defaultStringType: 'QUOTE_DOUBLE',
            });

            const factory = createRuleFactory();
            factory.loadFromYAML(yamlContent);

            const response: ValidateResponse = { valid: true };
            res.status(200).json(response);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            const response: ValidateResponse = {
                valid: false,
                errors: [{ message }],
            };
            res.status(200).json(response);
        }
    });

    app.use(express.static(uiDistPath));

    app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.join(uiDistPath, 'index.html'));
    });

    const server = http.createServer(app);

    async function getAvailablePort(desiredPort: number): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            const testServer = http.createServer();
            testServer.listen(desiredPort, host, () => {
                testServer.once('close', () => {
                    resolve(desiredPort);
                });
                testServer.close();
            });
            testServer.on('error', (err: any) => {
                if (err.code === 'EADDRINUSE') {
                    resolve(getAvailablePort(desiredPort + 1));
                } else {
                    reject(err);
                }
            });
        });
    }

    try {
        const actualPort = await getAvailablePort(port);
        server.listen(actualPort, host, () => {
            const url = `http://${host}:${actualPort}`;
            console.log(`\nCodeGuardian Edit Server started`);
            console.log(`  URL: ${url}`);
            console.log(`  File: ${ruleFilePath}`);
            console.log(`  Press Ctrl+C to stop\n`);

            if (!args.noOpen) {
                open(url).catch(err => {
                    console.warn(`Failed to open browser: ${err.message}`);
                });
            }
        });

        process.on('SIGINT', () => {
            console.log('\n\nShutting down server...');
            server.close(() => {
                console.log('Server stopped');
                process.exit(0);
            });
        });
    } catch (error) {
        console.error('Error starting server:', error);
        process.exit(1);
    }
}

async function resolveUiDistPath(): Promise<string> {
    const candidates = [
        // Local dev: from repo root (run ./dist/cli/index.js or codeguardian from project root)
        path.resolve(process.cwd(), 'src/edit-ui/dist'),
        // Local dev: from compiled CLI (dist/cli -> src/edit-ui/dist)
        path.resolve(__dirname, '../../src/edit-ui/dist'),
        // ts-node/dev: (src/cli -> src/edit-ui/dist)
        path.resolve(__dirname, '../edit-ui/dist'),
        // Packaged: UI copied under dist/edit-ui/dist
        path.resolve(__dirname, '../edit-ui/dist'),
        // Packaged: UI copied under dist/edit-ui
        path.resolve(__dirname, '../edit-ui'),
    ];

    for (const candidate of candidates) {
        try {
            const indexPath = path.join(candidate, 'index.html');
            await fs.access(indexPath);
            return candidate;
        } catch {
            // Try next candidate
        }
    }

    throw new Error(
        `Edit UI build not found. Expected index.html in one of: ${candidates.join(', ')}. ` +
            'Run "npm run build:ui" and try again.'
    );
}
