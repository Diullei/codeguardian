import { CombinatorRule, SelectorRule, AssertionRule } from '../core';
import { EvaluationContext, RuleResult, Violation } from '../types';

export class ForEachRule extends CombinatorRule {
    private selector: SelectorRule;
    private assertion: AssertionRule | CombinatorRule;

    constructor(id: string, selector: SelectorRule, assertion: AssertionRule | CombinatorRule) {
        super(id, [selector, assertion]);
        this.selector = selector;
        this.assertion = assertion;
    }

    /**
     * ForEach counts as 1 rule (the selector-assertion pair)
     */
    countRules(): number {
        return 1;
    }

    async evaluate(context: EvaluationContext): Promise<RuleResult> {
        const selectorResult = await this.selector.evaluate(context);
        const items = selectorResult.details?.items || [];

        const violations: Violation[] = [];

        for (const item of items) {
            // For file items, load the content if not already present
            let itemToAssert = item;
            if (item && typeof item === 'object' && 'path' in item && !item.content) {
                // Check if this is a deleted file
                const isDeleted = 'status' in item && item.status === 'deleted';
                
                if (!isDeleted) {
                    try {
                        const content = await context.repository.getFileContent(item.path);
                        itemToAssert = { ...item, content };
                    } catch (error) {
                        // If we can't get the content, use the item as-is
                        itemToAssert = item;
                    }
                }
                // For deleted files, pass them through without content so assertions can handle them appropriately
            }

            const itemContext = { ...context, currentItem: itemToAssert };

            try {
                if (this.assertion instanceof AssertionRule) {
                    // For AssertPropertyRule, we need to pass the full item object
                    // so it can access properties like path, status, etc.
                    // For other assertions that work on content, we pass the content
                    const isPropertyAssertion = this.assertion.constructor.name === 'AssertPropertyRule';
                    const itemForAssertion = isPropertyAssertion 
                        ? itemToAssert 
                        : (itemToAssert.content || itemToAssert);
                    
                    const assertionResult = await this.assertion.assertWithDetails(
                        itemForAssertion,
                        itemContext
                    );
                    if (!assertionResult.passed) {
                        const violation: Violation = {
                            file: this.getItemFile(item),
                            line: this.getItemLine(item),
                            message:
                                assertionResult.message ||
                                `Assertion '${this.assertion.id}' failed`,
                            severity: 'error',
                            context: assertionResult.context,
                        };

                        violations.push(violation);
                    }
                } else {
                    const result = await this.assertion.evaluate(itemContext);
                    if (!result.passed) {
                        // Add file/line information to violations if not already present
                        const enhancedViolations = (result.violations || []).map(v => ({
                            ...v,
                            file: v.file || this.getItemFile(item),
                            line: v.line || this.getItemLine(item),
                        }));
                        violations.push(...enhancedViolations);
                    }
                }
            } catch (error) {
                violations.push({
                    file: this.getItemFile(item),
                    line: this.getItemLine(item),
                    message: `Error evaluating assertion: ${error instanceof Error ? error.message : String(error)}`,
                    severity: 'error',
                });
            }
        }

        return {
            passed: violations.length === 0,
            violations,
        };
    }

    private getItemFile(item: any): string | undefined {
        if (item && typeof item === 'object') {
            if ('file' in item) return String(item.file);
            if ('path' in item) return String(item.path);
        }
        return undefined;
    }

    private getItemLine(item: any): number | undefined {
        if (item && typeof item === 'object') {
            if ('line' in item && typeof item.line === 'number') return item.line;
            if ('lineNumber' in item && typeof item.lineNumber === 'number') return item.lineNumber;
        }
        return undefined;
    }
}
