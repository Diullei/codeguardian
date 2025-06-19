import { Rule, RuleType, EvaluationContext, RuleResult } from '../types';

export abstract class BaseRule implements Rule {
    constructor(
        public readonly id: string,
        public readonly type: RuleType
    ) {}

    abstract evaluate(context: EvaluationContext): Promise<RuleResult>;
}
