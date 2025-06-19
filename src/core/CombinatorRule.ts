import { BaseRule } from './Rule';
import { Rule } from '../types';

export abstract class CombinatorRule extends BaseRule {
    protected rules: Rule[];

    constructor(id: string, rules: Rule[]) {
        super(id, 'combinator');
        this.rules = rules;
    }
}
