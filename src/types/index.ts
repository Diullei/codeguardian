export type RuleType = 'selector' | 'assertion' | 'combinator';

export type FileStatus = 'added' | 'modified' | 'deleted' | 'renamed';

export type Severity = 'error' | 'warning';

export type CountCondition = '>' | '>=' | '<' | '<=' | '==' | '!=';

export type ComparisonOperator = '==' | '!=' | '>' | '<' | '>=' | '<=' | 'includes' | 'matches';

export interface Violation {
    file?: string;
    line?: number;
    column?: number;
    message: string;
    severity: Severity;
    context?: {
        code?: string;
        suggestion?: string;
        documentation?: string;
    };
}

export interface RuleResult {
    passed: boolean;
    message?: string;
    details?: any;
    violations?: Violation[];
}

export interface FileInfo {
    path: string;
    status: FileStatus;
    content?: string;
    oldPath?: string;
    insertions: number;
    deletions: number;
}

export interface LineInfo {
    lineNumber: number;
    content: string;
    context?: string[];
}

export interface ASTNode {
    type: string;
    range?: [number, number];
    loc?: {
        start: { line: number; column: number };
        end: { line: number; column: number };
    };
    [key: string]: any;
}

export interface DiffInfo {
    files: FileInfo[];
    baseBranch: string;
    headBranch: string;
}

export interface Repository {
    getFiles(diff: DiffInfo): Promise<FileInfo[]>;
    getAllFiles(): Promise<FileInfo[]>;
    getFileContent(path: string): Promise<string>;
    getDiff(baseBranch: string, headBranch: string): Promise<DiffInfo>;
}

export interface ResultCache {
    get<T>(key: string, factory: () => Promise<T>): Promise<T>;
    has(key: string): boolean;
    set(key: string, value: any): void;
    clear(): void;
}

export interface RuleConfig {
    id?: string;
    description?: string;
    type: string;
    rules?: RuleConfig[];
    [key: string]: any;
}

export interface EvaluationContext {
    repository: Repository;
    diff: DiffInfo;
    cache: ResultCache;
    config: RuleConfig;
    currentItem?: any;
    cliArgs?: {
        skipMissingAstGrep?: boolean;
    };
}

export interface AssertionResult {
    passed: boolean;
    message?: string;
    context?: {
        code?: string;
        suggestion?: string;
        documentation?: string;
    };
}

export interface Rule {
    id: string;
    type: RuleType;
    evaluate(context: EvaluationContext): Promise<RuleResult>;
}

export interface RuleDefinition {
    type: string;
    [key: string]: any;
}

export interface RuleBuilder {
    build(config: any, factory: RuleFactory): Rule;
}

export interface RuleFactory {
    register(type: string, builder: RuleBuilder): void;
    create(config: RuleDefinition): Rule;
    loadFromYAML(yaml: string): Rule;
}
