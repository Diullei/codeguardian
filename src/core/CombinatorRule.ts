import { BaseRule } from './Rule';
import { Rule } from '../types';

export abstract class CombinatorRule extends BaseRule {
    protected rules: Rule[];

    constructor(id: string, rules: Rule[]) {
        super(id, 'combinator');
        this.rules = rules;
    }

    /**
     * Count all sub-rules recursively
     */
    countRules(): number {
        return this.rules.reduce((count, rule) => {
            // Check if rule has countRules method
            if ('countRules' in rule && typeof rule.countRules === 'function') {
                return count + rule.countRules();
            }
            return count + 1;
        }, 0);
    }
}
