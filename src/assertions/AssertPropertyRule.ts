import { AssertionRule } from '../core';
import { EvaluationContext, ComparisonOperator } from '../types';

export class AssertPropertyRule extends AssertionRule {
    constructor(
        id: string,
        private propertyPath: string,
        private expectedValue: any,
        private operator: ComparisonOperator = '=='
    ) {
        super(id);
    }

    async assert(item: any, _context: EvaluationContext): Promise<boolean> {
        const actualValue = this.getNestedProperty(item, this.propertyPath);
        return this.compare(actualValue, this.expectedValue, this.operator);
    }

    private getNestedProperty(obj: any, path: string): any {
        return path.split('.').reduce((curr, prop) => {
            if (curr && typeof curr === 'object' && prop in curr) {
                return curr[prop];
            }
            return undefined;
        }, obj);
    }

    private compare(actual: any, expected: any, operator: ComparisonOperator): boolean {
        switch (operator) {
            case '==':
                return actual == expected;
            case '!=':
                return actual != expected;
            case '>':
                return Number(actual) > Number(expected);
            case '<':
                return Number(actual) < Number(expected);
            case '>=':
                return Number(actual) >= Number(expected);
            case '<=':
                return Number(actual) <= Number(expected);
            case 'includes':
                if (typeof actual === 'string' && typeof expected === 'string') {
                    return actual.includes(expected);
                }
                if (Array.isArray(actual)) {
                    return actual.includes(expected);
                }
                return false;
            case 'matches':
                if (typeof actual === 'string' && typeof expected === 'string') {
                    return new RegExp(expected).test(actual);
                }
                return false;
            default:
                throw new Error(`Unknown operator: ${operator}`);
        }
    }
}
