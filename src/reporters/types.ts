import { DiffInfo } from '../types';

export interface ValidationReport {
    passed: boolean;
    summary: {
        totalFiles: number;
        passedRules: number;
        failedRules: number;
        violations: number;
        totalIndividualRules?: number;
    };
    results: RuleValidationResult[];
    diff: DiffInfo;
    duration: number;
}

export interface RuleValidationResult {
    ruleId: string;
    ruleDescription?: string;
    configFile?: string;
    passed: boolean;
    violations: ViolationDetail[];
}

export interface ViolationDetail {
    file?: string;
    line?: number;
    column?: number;
    message: string;
    severity: 'error' | 'warning';
    context?: {
        code?: string;
        suggestion?: string;
        documentation?: string;
    };
}

export interface ValidationReporter {
    report(report: ValidationReport): void | Promise<void>;
}
