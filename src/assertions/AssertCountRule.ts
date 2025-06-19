import { AssertionRule } from '../core';
import { EvaluationContext, CountCondition } from '../types';

export class AssertCountRule extends AssertionRule {
    constructor(
        id: string,
        private condition: CountCondition,
        private value: number
    ) {
        super(id);
    }

    async assert(items: any, _context: EvaluationContext): Promise<boolean> {
        const count = Array.isArray(items) ? items.length : 0;

        switch (this.condition) {
            case '>':
                return count > this.value;
            case '>=':
                return count >= this.value;
            case '<':
                return count < this.value;
            case '<=':
                return count <= this.value;
            case '==':
                return count === this.value;
            case '!=':
                return count !== this.value;
            default:
                throw new Error(`Unknown condition: ${this.condition}`);
        }
    }
}
