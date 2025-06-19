import { RuleBuilder, RuleFactory, CountCondition, ComparisonOperator } from '../../types';
import { AssertMatchRule, AssertCountRule, AssertPropertyRule } from '../../assertions';

export class AssertMatchBuilder implements RuleBuilder {
    build(config: any, _factory: RuleFactory) {
        const pattern = new RegExp(config.pattern, config.flags || '');

        // Generate a descriptive ID if not provided
        const id = config.id || `assert_match_${config.pattern?.substring(0, 20)}`;

        return new AssertMatchRule(
            id,
            pattern,
            config.should_match !== false,
            config.suggestion,
            config.documentation
        );
    }
}

export class AssertCountBuilder implements RuleBuilder {
    build(config: any, _factory: RuleFactory) {
        return new AssertCountRule(
            config.id || 'assert_count',
            config.condition as CountCondition,
            config.value
        );
    }
}

export class AssertPropertyBuilder implements RuleBuilder {
    build(config: any, _factory: RuleFactory) {
        return new AssertPropertyRule(
            config.id || 'assert_property',
            config.property_path,
            config.expected_value,
            (config.operator as ComparisonOperator) || '=='
        );
    }
}
