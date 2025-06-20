import { CombinatorRule, AssertionRule } from '../core';
import { Rule, EvaluationContext, RuleResult, Violation } from '../types';

export class AllOfRule extends CombinatorRule {
    constructor(id: string, rules: Rule[]) {
        super(id, rules);
    }

    async evaluate(context: EvaluationContext): Promise<RuleResult> {
        const violations: Violation[] = [];
        const subResults: RuleResult['subResults'] = [];

        for (const rule of this.rules) {
            let passed: boolean;
            let ruleViolations: Violation[] = [];

            // Special handling for assertions
            if (rule instanceof AssertionRule && context.currentItem !== undefined) {
                try {
                    const assertionResult = await rule.assertWithDetails(
                        context.currentItem,
                        context
                    );
                    passed = assertionResult.passed;
                    if (!passed) {
                        ruleViolations = [
                            {
                                message: assertionResult.message || `Assertion '${rule.id}' failed`,
                                severity: 'error',
                                context: assertionResult.context,
                            },
                        ];
                    }
                } catch (error) {
                    passed = false;
                    ruleViolations = [
                        {
                            message: `Assertion '${rule.id}' error: ${error instanceof Error ? error.message : String(error)}`,
                            severity: 'error',
                        },
                    ];
                }
            } else {
                const result = await rule.evaluate(context);
                passed = result.passed;
                ruleViolations = result.violations || [];
                
                // Collect sub-results from nested combinators
                if (result.subResults) {
                    subResults.push(...result.subResults);
                }
            }

            // Track this rule's result
            subResults.push({
                ruleId: rule.id,
                passed,
                violations: ruleViolations,
            });

            if (!passed) {
                violations.push(...ruleViolations);
                return {
                    passed: false,
                    message: `Rule '${rule.id}' failed`,
                    violations,
                    subResults,
                };
            }
        }

        return { passed: true, subResults };
    }
}
