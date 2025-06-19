import { RuleFactory } from '../../../src/config/RuleFactory';
import { RuleBuilder, Rule } from '../../../src/types';
import { createRuleFactory } from '../../../src/config';

class MockRule implements Rule {
    constructor(
        public id: string,
        public type: 'selector' | 'assertion' | 'combinator' = 'selector'
    ) {}

    async evaluate(): Promise<any> {
        return { passed: true };
    }
}

class MockBuilder implements RuleBuilder {
    build(config: any): Rule {
        return new MockRule(config.id || 'mock-rule');
    }
}

describe('RuleFactory', () => {
    describe('basic functionality', () => {
        let factory: RuleFactory;

        beforeEach(() => {
            factory = new RuleFactory();
        });

        it('should register and create rules', () => {
            const builder = new MockBuilder();
            factory.register('mock', builder);

            const rule = factory.create({ type: 'mock', id: 'test-rule' });

            expect(rule).toBeInstanceOf(MockRule);
            expect(rule.id).toBe('test-rule');
        });

        it('should throw error for unknown rule type', () => {
            expect(() => {
                factory.create({ type: 'unknown' });
            }).toThrow('Unknown rule type: unknown');
        });

        it('should generate rule ID if not provided', () => {
            const builder = new MockBuilder();
            factory.register('mock', builder);

            const yaml = `
rule:
  type: mock
`;
            const rule = factory.loadFromYAML(yaml);

            expect(rule.id).toMatch(/^rule_\d+$/);
        });

        it('should use provided rule ID from YAML', () => {
            const builder = new MockBuilder();
            factory.register('mock', builder);

            const yaml = `
id: custom-id
rule:
  type: mock
`;
            const rule = factory.loadFromYAML(yaml);

            expect(rule.id).toBe('custom-id');
        });

        it('should throw error for invalid YAML without rule property', () => {
            expect(() => {
                factory.loadFromYAML('invalid: yaml');
            }).toThrow('Invalid configuration: missing "type" property');
        });
    });

    describe('createRuleFactory with built-in rules', () => {
        let factory: RuleFactory;

        beforeEach(() => {
            factory = createRuleFactory();
        });

        it('should create select_files rule', () => {
            const rule = factory.create({
                type: 'select_files',
                path_pattern: '**/*.ts',
                status: ['added', 'modified'],
            });

            expect(rule.type).toBe('selector');
        });

        it('should create assert_match rule', () => {
            const rule = factory.create({
                type: 'assert_match',
                pattern: 'console\\.log',
                should_match: false,
            });

            expect(rule.type).toBe('assertion');
        });

        it('should create for_each rule', () => {
            const rule = factory.create({
                type: 'for_each',
                select: { type: 'select_files' },
                assert: { type: 'assert_match', pattern: 'test' },
            });

            expect(rule.type).toBe('combinator');
        });

        it('should parse complex YAML configuration', () => {
            const yaml = `
id: complex-rule
description: Complex validation rule
rule:
  type: all_of
  rules:
    - type: for_each
      select:
        type: select_files
        path_pattern: '**/*.ts'
      assert:
        type: assert_match
        pattern: 'console\\.log'
        should_match: false
    - type: any_of
      rules:
        - type: assert_count
          condition: '>'
          value: 0
`;

            const rule = factory.loadFromYAML(yaml);

            expect(rule.id).toBe('complex-rule');
            expect(rule.type).toBe('combinator');
        });
    });
});
