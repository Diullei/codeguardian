import { RuleBuilder, RuleFactory, CountCondition, ComparisonOperator } from '../../types';
import { AssertMatchRule, AssertCountRule, AssertPropertyRule, AssertCommandOutputRule, AssertLineCountRule } from '../../assertions';

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
        const extractPattern = config.extract_pattern 
            ? new RegExp(config.extract_pattern, config.extract_flags || '') 
            : undefined;

        return new AssertPropertyRule(
            config.id || 'assert_property',
            config.property_path,
            config.expected_value,
            (config.operator as ComparisonOperator) || '==',
            extractPattern
        );
    }
}

export class AssertCommandOutputBuilder implements RuleBuilder {
    build(config: any, _factory: RuleFactory) {
        const pattern = config.pattern ? new RegExp(config.pattern, config.flags || '') : undefined;
        
        return new AssertCommandOutputRule(
            config.id || `assert_command_output_${config.target}`,
            config.target,
            pattern,
            config.condition as CountCondition,
            config.value,
            config.first_lines,
            config.last_lines,
            config.should_match !== false
        );
    }
}

export class AssertLineCountBuilder implements RuleBuilder {
    build(config: any, _factory: RuleFactory) {
        return new AssertLineCountRule(
            config.id || 'assert_line_count',
            (config.operator as ComparisonOperator) || '<=',
            config.max_lines || config.expected_value,
            config.message,
            config.suggestion,
            config.documentation
        );
    }
}
