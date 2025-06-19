import { BaseRule } from './Rule';
import { EvaluationContext, RuleResult } from '../types';

export abstract class SelectorRule extends BaseRule {
    constructor(id: string) {
        super(id, 'selector');
    }

    abstract select(context: EvaluationContext): Promise<any[]>;

    async evaluate(context: EvaluationContext): Promise<RuleResult> {
        const items = await this.select(context);
        return {
            passed: true,
            details: { items },
        };
    }
}
