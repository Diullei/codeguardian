import { BaseRule } from './Rule';
import { EvaluationContext, RuleResult, AssertionResult } from '../types';

export abstract class AssertionRule extends BaseRule {
    constructor(id: string) {
        super(id, 'assertion');
    }

    abstract assert(item: any, context: EvaluationContext): Promise<boolean>;

    async assertWithDetails(item: any, context: EvaluationContext): Promise<AssertionResult> {
        // Default implementation - subclasses can override for better messages
        const passed = await this.assert(item, context);
        return { passed };
    }

    async evaluate(_context: EvaluationContext): Promise<RuleResult> {
        throw new Error(
            'Assertions cannot be evaluated directly. They must be used within a combinator.'
        );
    }
}
