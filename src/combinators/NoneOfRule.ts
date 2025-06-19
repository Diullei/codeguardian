import { CombinatorRule, AssertionRule } from '../core';
import { Rule, EvaluationContext, RuleResult, Violation } from '../types';

export class NoneOfRule extends CombinatorRule {
    constructor(id: string, rules: Rule[]) {
        super(id, rules);
    }

    async evaluate(context: EvaluationContext): Promise<RuleResult> {
        const violations: Violation[] = [];

        for (const rule of this.rules) {
            let passed: boolean;
            let ruleMessage: string | undefined;
            let ruleContext: any;

            // Special handling for assertions
            if (rule instanceof AssertionRule && context.currentItem !== undefined) {
                try {
                    const assertionResult = await rule.assertWithDetails(
                        context.currentItem,
                        context
                    );
                    passed = assertionResult.passed;
                    ruleMessage = assertionResult.message;
                    ruleContext = assertionResult.context;
                } catch (error) {
                    // If assertion throws, treat as failed (which is good for none_of)
                    passed = false;
                    ruleMessage = `Assertion error: ${error instanceof Error ? error.message : String(error)}`;
                }
            } else {
                const result = await rule.evaluate(context);
                passed = result.passed;
                ruleMessage = result.message;
            }

            if (passed) {
                violations.push({
                    message: ruleMessage || `Rule '${rule.id}' should have failed but passed`,
                    severity: 'error',
                    context: ruleContext,
                });
                return {
                    passed: false,
                    message: `Rule '${rule.id}' should have failed but passed`,
                    violations,
                };
            }
        }

        return { passed: true };
    }
}
