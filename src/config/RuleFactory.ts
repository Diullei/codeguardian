import { parse as parseYAML } from 'yaml';
import { Rule, RuleDefinition, RuleBuilder, RuleFactory as IRuleFactory } from '../types';

export class RuleFactory implements IRuleFactory {
    private builders = new Map<string, RuleBuilder>();
    private ruleIdCounter = 0;

    register(type: string, builder: RuleBuilder): void {
        this.builders.set(type, builder);
    }

    create(config: RuleDefinition): Rule {
        const builder = this.builders.get(config.type);
        if (!builder) {
            throw new Error(`Unknown rule type: ${config.type}`);
        }
        return builder.build(config, this);
    }

    loadFromYAML(yaml: string): Rule {
        const config = parseYAML(yaml) as any;

        // Handle two formats:
        // 1. Legacy format with "rule" property: { id, description, rule: {...} }
        // 2. Direct format: { id, description, type, ...ruleConfig }

        let ruleConfig: RuleDefinition;

        if (config.rule) {
            // Legacy format
            ruleConfig = config.rule;
            ruleConfig.id = config.id || this.generateRuleId();
        } else if (config.type) {
            // Direct format - the whole config is the rule
            ruleConfig = config;
            ruleConfig.id = config.id || this.generateRuleId();
        } else {
            throw new Error('Invalid configuration: missing "type" property');
        }

        return this.create(ruleConfig);
    }

    private generateRuleId(): string {
        return `rule_${++this.ruleIdCounter}`;
    }
}
