import { RuleFactory } from './RuleFactory';
import {
    SelectFilesBuilder,
    SelectLinesBuilder,
    SelectASTNodesBuilder,
    SelectFileChangesBuilder,
    AssertMatchBuilder,
    AssertCountBuilder,
    AssertPropertyBuilder,
    AllOfBuilder,
    AnyOfBuilder,
    NoneOfBuilder,
    ForEachBuilder,
} from './builders';

export function createRuleFactory(): RuleFactory {
    const factory = new RuleFactory();

    // Register selector builders
    factory.register('select_files', new SelectFilesBuilder());
    factory.register('select_lines', new SelectLinesBuilder());
    factory.register('select_ast_nodes', new SelectASTNodesBuilder());
    factory.register('select_file_changes', new SelectFileChangesBuilder());

    // Register assertion builders
    factory.register('assert_match', new AssertMatchBuilder());
    factory.register('assert_count', new AssertCountBuilder());
    factory.register('assert_property', new AssertPropertyBuilder());

    // Register combinator builders
    factory.register('all_of', new AllOfBuilder());
    factory.register('any_of', new AnyOfBuilder());
    factory.register('none_of', new NoneOfBuilder());
    factory.register('for_each', new ForEachBuilder());

    return factory;
}

export { RuleFactory } from './RuleFactory';
export { ConfigurationLoader } from './ConfigurationLoader';
export type { LoadedConfiguration } from './ConfigurationLoader';
