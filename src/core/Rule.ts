import { Rule, RuleType, EvaluationContext, RuleResult } from '../types';

export abstract class BaseRule implements Rule {
    constructor(
        public readonly id: string,
        public readonly type: RuleType
    ) {}

    abstract evaluate(context: EvaluationContext): Promise<RuleResult>;

    /**
     * Count the number of individual rules in this rule tree.
     * Combinators will count their sub-rules recursively.
     */
    countRules(): number {
        return 1; // Base rules count as 1
    }
}
