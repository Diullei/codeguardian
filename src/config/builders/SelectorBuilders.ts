import { RuleBuilder, RuleFactory, FileStatus } from '../../types';
import { SelectFilesRule, SelectLinesRule, SelectASTNodesRule, SelectFileChangesRule } from '../../selectors';

export class SelectFilesBuilder implements RuleBuilder {
    build(config: any, _factory: RuleFactory) {
        const status = config.status
            ? ((Array.isArray(config.status) ? config.status : [config.status]) as FileStatus[])
            : undefined;

        return new SelectFilesRule(
            config.id || 'select_files',
            config.path_pattern,
            status,
            config.exclude_pattern,
            config.select_all || false
        );
    }
}

export class SelectLinesBuilder implements RuleBuilder {
    build(config: any, _factory: RuleFactory) {
        const pattern = new RegExp(config.pattern, config.flags || '');

        return new SelectLinesRule(
            config.id || 'select_lines',
            pattern,
            config.include_context || 0
        );
    }
}

export class SelectASTNodesBuilder implements RuleBuilder {
    build(config: any, _factory: RuleFactory) {
        return new SelectASTNodesRule(
            config.id || 'select_ast_nodes',
            config.query,
            config.language
        );
    }
}

export class SelectFileChangesBuilder implements RuleBuilder {
    build(config: any, _factory: RuleFactory) {
        return new SelectFileChangesRule(
            config.id || 'select_file_changes',
            config.min_percentage,
            config.max_percentage
        );
    }
}
