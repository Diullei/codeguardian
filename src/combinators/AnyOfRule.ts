import { CombinatorRule, AssertionRule } from '../core';
import { Rule, EvaluationContext, RuleResult, Violation } from '../types';

export class AnyOfRule extends CombinatorRule {
    constructor(id: string, rules: Rule[]) {
        super(id, rules);
    }

    async evaluate(context: EvaluationContext): Promise<RuleResult> {
        const allViolations: Violation[] = [];

        for (const rule of this.rules) {
            let passed: boolean;
            let violations: Violation[] = [];

            // Special handling for assertions
            if (rule instanceof AssertionRule && context.currentItem !== undefined) {
                try {
                    const assertionResult = await rule.assertWithDetails(
                        context.currentItem,
                        context
                    );
                    passed = assertionResult.passed;
                    if (!passed) {
                        violations = [
                            {
                                message: assertionResult.message || `Assertion '${rule.id}' failed`,
                                severity: 'error',
                                context: assertionResult.context,
                            },
                        ];
                    }
                } catch (error) {
                    passed = false;
                    violations = [
                        {
                            message: `Assertion '${rule.id}' error: ${error instanceof Error ? error.message : String(error)}`,
                            severity: 'error',
                        },
                    ];
                }
            } else {
                const result = await rule.evaluate(context);
                passed = result.passed;
                violations = result.violations || [];
            }

            if (passed) {
                return { passed: true };
            }
            allViolations.push(...violations);
        }

        return {
            passed: false,
            message: 'None of the rules passed',
            violations: allViolations,
        };
    }
}
