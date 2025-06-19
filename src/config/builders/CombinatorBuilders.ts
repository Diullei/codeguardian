import { RuleBuilder, RuleFactory, Rule } from '../../types';
import { AllOfRule, AnyOfRule, NoneOfRule, ForEachRule } from '../../combinators';
import { SelectorRule, AssertionRule, CombinatorRule } from '../../core';

export class AllOfBuilder implements RuleBuilder {
    build(config: any, factory: RuleFactory) {
        const rules: Rule[] = (config.rules || []).map((ruleConfig: any) =>
            factory.create(ruleConfig)
        );

        return new AllOfRule(config.id || 'all_of', rules);
    }
}

export class AnyOfBuilder implements RuleBuilder {
    build(config: any, factory: RuleFactory) {
        const rules: Rule[] = (config.rules || []).map((ruleConfig: any) =>
            factory.create(ruleConfig)
        );

        return new AnyOfRule(config.id || 'any_of', rules);
    }
}

export class NoneOfBuilder implements RuleBuilder {
    build(config: any, factory: RuleFactory) {
        const rules: Rule[] = (config.rules || []).map((ruleConfig: any) =>
            factory.create(ruleConfig)
        );

        return new NoneOfRule(config.id || 'none_of', rules);
    }
}

export class ForEachBuilder implements RuleBuilder {
    build(config: any, factory: RuleFactory) {
        const selector = factory.create(config.select);
        const assertion = factory.create(config.assert);

        if (!(selector instanceof SelectorRule)) {
            throw new Error('ForEach rule requires a selector rule');
        }

        if (!(assertion instanceof AssertionRule || assertion instanceof CombinatorRule)) {
            throw new Error('ForEach rule requires an assertion or combinator rule');
        }

        return new ForEachRule(config.id || 'for_each', selector, assertion);
    }
}
