import React from 'react';
import { helpText, getTypeHelp } from '../helpText';
import Tooltip from './Tooltip';
import FieldLabel from './FieldLabel';

function RuleForm({ ruleData, onChange, onSave }) {
    const handleIdChange = e => {
        onChange({
            ...ruleData,
            id: e.target.value,
        });
    };

    const handleDescriptionChange = e => {
        onChange({
            ...ruleData,
            description: e.target.value,
        });
    };

    const handleRuleChange = rule => {
        onChange({
            ...ruleData,
            rule,
        });
    };

    return (
        <div className="card">
            <div className="section">
                <h2 className="card-title">Rule Identity</h2>
                <div className="form-group">
                    <FieldLabel htmlFor="rule-id" tooltip={helpText.ruleId}>
                        Rule ID *
                    </FieldLabel>
                    <input
                        id="rule-id"
                        type="text"
                        value={ruleData.id || ''}
                        onChange={handleIdChange}
                        placeholder="e.g., no-console-log"
                    />
                </div>
                <div className="form-group">
                    <FieldLabel htmlFor="rule-description" tooltip={helpText.description}>
                        Description
                    </FieldLabel>
                    <textarea
                        id="rule-description"
                        value={ruleData.description || ''}
                        onChange={handleDescriptionChange}
                        placeholder="Describe what this rule does..."
                        rows={3}
                    />
                </div>
            </div>

            <div className="section">
                <h2 className="card-title">Rule Definition</h2>
                <p className="section-hint">{helpText.ruleDefinition}</p>
                <RuleTreeNode rule={ruleData.rule} onChange={handleRuleChange} isRoot={true} />
            </div>
        </div>
    );
}

function RuleTreeNode({ rule, onChange, isRoot = false }) {
    const handleTypeChange = e => {
        const newType = e.target.value;
        let newRule = { type: newType };

        if (newType === 'for_each') {
            newRule.select = {
                type: 'select_files',
                path_pattern: 'src/**/*.{ts,tsx}',
                status: ['added', 'modified'],
            };
            newRule.assert = {
                type: 'assert_match',
                pattern: 'TODO',
                should_match: false,
            };
        } else {
            newRule.rules = [];
        }

        onChange(newRule);
    };

    if (!rule || !rule.type) {
        return (
            <div className="form-group">
                <Tooltip content={helpText.ruleDefinition}>
                    <label htmlFor="rule-type">Rule Type * (?)</label>
                </Tooltip>
                <select id="rule-type" value="" onChange={handleTypeChange}>
                    <option value="">Select a rule type...</option>
                    <option value="for_each">
                        for_each - Apply assertion to each selected item
                    </option>
                    <option value="all_of">all_of - All rules must pass</option>
                    <option value="any_of">any_of - At least one rule must pass</option>
                    <option value="none_of">none_of - No rules should pass</option>
                    <option value="assert_match">assert_match - Check if pattern matches</option>
                    <option value="assert_count">assert_count - Check count of items</option>
                    <option value="assert_property">assert_property - Check property value</option>
                    <option value="assert_line_count">assert_line_count - Check line count</option>
                    <option value="assert_command_output">
                        assert_command_output - Check command output
                    </option>
                </select>
            </div>
        );
    }

    if (
        [
            'assert_match',
            'assert_count',
            'assert_property',
            'assert_line_count',
            'assert_command_output',
        ].includes(rule.type)
    ) {
        return <AssertionForm assertion={rule} onChange={onChange} />;
    }

    if (rule.type === 'for_each') {
        return (
            <div className="rule-node">
                <div className="rule-node-header">
                    <Tooltip content={getTypeHelp(rule.type)}>
                        <select value={rule.type} onChange={handleTypeChange}>
                            <option value="for_each">for_each</option>
                            <option value="all_of">all_of</option>
                            <option value="any_of">any_of</option>
                            <option value="none_of">none_of</option>
                        </select>
                    </Tooltip>
                </div>

                <div className="section">
                    <h3 className="section-title">Select (Selector)</h3>
                    <p className="section-hint">{helpText.selectSelector}</p>
                    <SelectorForm
                        selector={rule.select}
                        onChange={select => onChange({ ...rule, select })}
                    />
                </div>

                <div className="section">
                    <h3 className="section-title">Assert (Assertion or Combinator)</h3>
                    <p className="section-hint">{helpText.assertSection}</p>
                    <RuleTreeNode
                        rule={rule.assert}
                        onChange={assert => onChange({ ...rule, assert })}
                    />
                </div>
            </div>
        );
    } else {
        return (
            <div className="rule-node">
                <div className="rule-node-header">
                    <Tooltip content={getTypeHelp(rule.type)}>
                        <select value={rule.type} onChange={handleTypeChange}>
                            <option value="for_each">for_each</option>
                            <option value="all_of">all_of</option>
                            <option value="any_of">any_of</option>
                            <option value="none_of">none_of</option>
                        </select>
                    </Tooltip>
                </div>

                <div className="section">
                    <h3 className="section-title">Rules</h3>
                    <RuleList
                        rules={rule.rules || []}
                        onChange={rules => onChange({ ...rule, rules })}
                    />
                </div>
            </div>
        );
    }
}

function RuleList({ rules, onChange }) {
    const handleAddRule = () => {
        onChange([...rules, { type: 'assert_match', pattern: '', should_match: false }]);
    };

    const handleRuleChange = (index, newRule) => {
        const newRules = [...rules];
        newRules[index] = newRule;
        onChange(newRules);
    };

    const handleRemoveRule = index => {
        const newRules = rules.filter((_, i) => i !== index);
        onChange(newRules);
    };

    return (
        <div className="rule-tree">
            {rules.map((rule, index) => (
                <div key={index} className="rule-node">
                    <div className="rule-node-header">
                        <span>Rule {index + 1}</span>
                        <div className="rule-node-actions">
                            <button
                                className="btn btn-danger"
                                onClick={() => handleRemoveRule(index)}
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                    <RuleTreeNode
                        rule={rule}
                        onChange={newRule => handleRuleChange(index, newRule)}
                    />
                </div>
            ))}
            <button className="btn btn-secondary" onClick={handleAddRule}>
                + Add Rule
            </button>
        </div>
    );
}

function SelectorForm({ selector, onChange }) {
    const handleTypeChange = e => {
        const newType = e.target.value;
        let newSelector = { type: newType };

        switch (newType) {
            case 'select_files':
                newSelector = {
                    type: 'select_files',
                    path_pattern: 'src/**/*.{ts,tsx}',
                    status: ['added', 'modified'],
                };
                break;
            case 'select_lines':
                newSelector = { type: 'select_lines', pattern: '' };
                break;
            case 'select_ast_nodes':
                newSelector = {
                    type: 'select_ast_nodes',
                    query: '',
                    language: 'typescript',
                };
                break;
            case 'select_file_changes':
                newSelector = {
                    type: 'select_file_changes',
                    min_percentage: 10,
                    max_percentage: 50,
                };
                break;
            case 'select_command_output':
                newSelector = { type: 'select_command_output', command: '' };
                break;
        }

        onChange(newSelector);
    };

    const handleFieldChange = (field, value) => {
        onChange({ ...selector, [field]: value });
    };

    if (!selector || !selector.type) {
        return (
            <div className="form-group">
                <Tooltip content={helpText.selectSelector}>
                    <label htmlFor="selector-type">Selector Type * (?)</label>
                </Tooltip>
                <select id="selector-type" value="" onChange={handleTypeChange}>
                    <option value="">Select a selector type...</option>
                    <option value="select_files">
                        select_files - Select files by path and status
                    </option>
                    <option value="select_lines">select_lines - Select lines by pattern</option>
                    <option value="select_ast_nodes">
                        select_ast_nodes - Select AST nodes by query
                    </option>
                    <option value="select_file_changes">
                        select_file_changes - Select files by change percentage
                    </option>
                    <option value="select_command_output">
                        select_command_output - Select command output
                    </option>
                </select>
            </div>
        );
    }

    return (
        <div className="card" style={{ marginLeft: '10px' }}>
            <div className="form-group">
                <Tooltip content={getTypeHelp(selector.type)}>
                    <label htmlFor="selector-type">Selector Type (?)</label>
                </Tooltip>
                <select id="selector-type" value={selector.type} onChange={handleTypeChange}>
                    <option value="select_files">select_files</option>
                    <option value="select_lines">select_lines</option>
                    <option value="select_ast_nodes">select_ast_nodes</option>
                    <option value="select_file_changes">select_file_changes</option>
                    <option value="select_command_output">select_command_output</option>
                </select>
            </div>

            {selector.type === 'select_files' && (
                <>
                    <div className="form-group">
                        <FieldLabel htmlFor="path-pattern" tooltip={helpText.path_pattern}>
                            Path Pattern *
                        </FieldLabel>
                        <input
                            id="path-pattern"
                            type="text"
                            value={selector.path_pattern || ''}
                            onChange={e => handleFieldChange('path_pattern', e.target.value)}
                            placeholder="e.g., src/**/*.ts"
                        />
                    </div>
                    <div className="form-group">
                        <FieldLabel htmlFor="exclude-pattern" tooltip={helpText.exclude_pattern}>
                            Exclude Pattern
                        </FieldLabel>
                        <input
                            id="exclude-pattern"
                            type="text"
                            value={selector.exclude_pattern || ''}
                            onChange={e => handleFieldChange('exclude_pattern', e.target.value)}
                            placeholder="e.g., **/*.test.ts"
                        />
                    </div>
                    <div className="form-group">
                        <Tooltip content={helpText.status}>
                            <label>Status (?)</label>
                        </Tooltip>
                        <div>
                            {['added', 'modified', 'deleted', 'renamed'].map(status => (
                                <label key={status} style={{ marginRight: '15px' }}>
                                    <input
                                        type="checkbox"
                                        checked={selector.status?.includes(status) || false}
                                        onChange={e => {
                                            const currentStatus = selector.status || [];
                                            const newStatus = e.target.checked
                                                ? [...currentStatus, status]
                                                : currentStatus.filter(s => s !== status);
                                            handleFieldChange('status', newStatus);
                                        }}
                                        style={{ marginRight: '5px' }}
                                    />
                                    {status}
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="form-group">
                        <Tooltip content={helpText.select_all}>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={selector.select_all || false}
                                    onChange={e => handleFieldChange('select_all', e.target.checked)}
                                    style={{ marginRight: '5px' }}
                                />
                                Select all files (ignore diff) (?)
                            </label>
                        </Tooltip>
                    </div>
                </>
            )}

            {selector.type === 'select_lines' && (
                <>
                    <div className="form-group">
                        <FieldLabel htmlFor="pattern" tooltip={helpText.pattern}>
                            Pattern *
                        </FieldLabel>
                        <input
                            id="pattern"
                            type="text"
                            value={selector.pattern || ''}
                            onChange={e => handleFieldChange('pattern', e.target.value)}
                            placeholder="e.g., console\\.log"
                        />
                    </div>
                    <div className="form-group">
                        <FieldLabel htmlFor="flags" tooltip={helpText.regex_flags}>
                            Regex Flags
                        </FieldLabel>
                        <input
                            id="flags"
                            type="text"
                            value={selector.flags || ''}
                            onChange={e => handleFieldChange('flags', e.target.value)}
                            placeholder="e.g., i, m, g"
                        />
                    </div>
                </>
            )}

            {selector.type === 'select_ast_nodes' && (
                <>
                    <div className="form-group">
                        <FieldLabel htmlFor="query" tooltip={helpText.query}>
                            Query *
                        </FieldLabel>
                        <input
                            id="query"
                            type="text"
                            value={selector.query || ''}
                            onChange={e => handleFieldChange('query', e.target.value)}
                            placeholder="e.g., async_function"
                        />
                    </div>
                    <div className="form-group">
                        <FieldLabel htmlFor="language" tooltip={helpText.language}>
                            Language *
                        </FieldLabel>
                        <select
                            id="language"
                            value={selector.language || 'typescript'}
                            onChange={e => handleFieldChange('language', e.target.value)}
                        >
                            <option value="typescript">TypeScript</option>
                            <option value="javascript">JavaScript</option>
                            <option value="tsx">TSX</option>
                            <option value="html">HTML</option>
                            <option value="css">CSS</option>
                        </select>
                    </div>
                </>
            )}

            {selector.type === 'select_file_changes' && (
                <>
                    <div className="form-group">
                        <FieldLabel htmlFor="min-percentage" tooltip={helpText.min_percentage}>
                            Min Percentage (%)
                        </FieldLabel>
                        <input
                            id="min-percentage"
                            type="number"
                            value={selector.min_percentage || 0}
                            onChange={e =>
                                handleFieldChange('min_percentage', parseFloat(e.target.value) || 0)
                            }
                            min="0"
                            max="100"
                        />
                    </div>
                    <div className="form-group">
                        <FieldLabel htmlFor="max-percentage" tooltip={helpText.max_percentage}>
                            Max Percentage (%)
                        </FieldLabel>
                        <input
                            id="max-percentage"
                            type="number"
                            value={selector.max_percentage || 100}
                            onChange={e =>
                                handleFieldChange(
                                    'max_percentage',
                                    parseFloat(e.target.value) || 100
                                )
                            }
                            min="0"
                            max="100"
                        />
                    </div>
                </>
            )}

            {selector.type === 'select_command_output' && (
                <div className="form-group">
                    <FieldLabel htmlFor="command" tooltip={helpText.command}>
                        Command *
                    </FieldLabel>
                    <input
                        id="command"
                        type="text"
                        value={selector.command || ''}
                        onChange={e => handleFieldChange('command', e.target.value)}
                        placeholder="e.g., npm test"
                    />
                </div>
            )}
        </div>
    );
}

function AssertionForm({ assertion, onChange }) {
    const handleTypeChange = e => {
        const newType = e.target.value;
        let newAssertion = { type: newType };

        switch (newType) {
            case 'assert_match':
                newAssertion = { type: 'assert_match', pattern: '', should_match: false };
                break;
            case 'assert_count':
                newAssertion = { type: 'assert_count', condition: '==', value: 0 };
                break;
            case 'assert_property':
                newAssertion = { type: 'assert_property', property_path: '', expected_value: '' };
                break;
            case 'assert_line_count':
                newAssertion = { type: 'assert_line_count', operator: '<=', max_lines: 450 };
                break;
            case 'assert_command_output':
                newAssertion = { type: 'assert_command_output', target: 'stdout' };
                break;
        }

        onChange(newAssertion);
    };

    const handleFieldChange = (field, value) => {
        onChange({ ...assertion, [field]: value });
    };

    if (!assertion || !assertion.type) {
        return (
            <div className="form-group">
                <Tooltip content={helpText.assertSection}>
                    <label htmlFor="assertion-type">Assertion Type * (?)</label>
                </Tooltip>
                <select id="assertion-type" value="" onChange={handleTypeChange}>
                    <option value="">Select an assertion type...</option>
                    <option value="assert_match">assert_match - Check if pattern matches</option>
                    <option value="assert_count">assert_count - Check count of items</option>
                    <option value="assert_property">assert_property - Check property value</option>
                    <option value="assert_line_count">assert_line_count - Check line count</option>
                    <option value="assert_command_output">
                        assert_command_output - Check command output
                    </option>
                </select>
            </div>
        );
    }

    return (
        <div className="card" style={{ marginLeft: '10px' }}>
            <div className="form-group">
                <Tooltip content={getTypeHelp(assertion.type)}>
                    <label htmlFor="assertion-type">Assertion Type (?)</label>
                </Tooltip>
                <select id="assertion-type" value={assertion.type} onChange={handleTypeChange}>
                    <option value="assert_match">assert_match</option>
                    <option value="assert_count">assert_count</option>
                    <option value="assert_property">assert_property</option>
                    <option value="assert_line_count">assert_line_count</option>
                    <option value="assert_command_output">assert_command_output</option>
                </select>
            </div>

            {assertion.type === 'assert_match' && (
                <>
                    <div className="form-group">
                        <FieldLabel htmlFor="pattern" tooltip={helpText.assert_pattern}>
                            Pattern *
                        </FieldLabel>
                        <input
                            id="pattern"
                            type="text"
                            value={assertion.pattern || ''}
                            onChange={e => handleFieldChange('pattern', e.target.value)}
                            placeholder="e.g., console\\.log"
                        />
                    </div>
                    <div className="form-group">
                        <Tooltip content={helpText.should_match}>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={assertion.should_match !== false}
                                    onChange={e => handleFieldChange('should_match', e.target.checked)}
                                    style={{ marginRight: '5px' }}
                                />
                                Should match (?)
                            </label>
                        </Tooltip>
                    </div>
                    <div className="form-group">
                        <FieldLabel htmlFor="assert-match-message" tooltip={helpText.message}>
                            Message
                        </FieldLabel>
                        <input
                            id="assert-match-message"
                            type="text"
                            value={assertion.message || ''}
                            onChange={e => handleFieldChange('message', e.target.value)}
                            placeholder="Custom error message"
                        />
                    </div>
                    <div className="form-group">
                        <FieldLabel htmlFor="assert-match-suggestion" tooltip={helpText.suggestion}>
                            Suggestion
                        </FieldLabel>
                        <input
                            id="assert-match-suggestion"
                            type="text"
                            value={assertion.suggestion || ''}
                            onChange={e => handleFieldChange('suggestion', e.target.value)}
                            placeholder="Actionable suggestion"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="documentation">Documentation URL</label>
                        <input
                            id="documentation"
                            type="text"
                            value={assertion.documentation || ''}
                            onChange={e => handleFieldChange('documentation', e.target.value)}
                            placeholder="https://example.com/docs"
                        />
                    </div>
                </>
            )}

            {assertion.type === 'assert_count' && (
                <>
                    <div className="form-group">
                        <label htmlFor="condition">Condition *</label>
                        <select
                            id="condition"
                            value={assertion.condition || '=='}
                            onChange={e => handleFieldChange('condition', e.target.value)}
                        >
                            <option value="==">== (equals)</option>
                            <option value="!=">!= (not equals)</option>
                            <option value=">">&gt; (greater than)</option>
                            <option value="<">&lt; (less than)</option>
                            <option value=">=">&gt;= (greater or equal)</option>
                            <option value="<=">&lt;= (less or equal)</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="value">Value *</label>
                        <input
                            id="value"
                            type="number"
                            value={assertion.value || 0}
                            onChange={e =>
                                handleFieldChange('value', parseInt(e.target.value) || 0)
                            }
                        />
                    </div>
                </>
            )}

            {assertion.type === 'assert_property' && (
                <>
                    <div className="form-group">
                        <FieldLabel htmlFor="property-path" tooltip={helpText.property_path}>
                            Property Path *
                        </FieldLabel>
                        <input
                            id="property-path"
                            type="text"
                            value={assertion.property_path || ''}
                            onChange={e => handleFieldChange('property_path', e.target.value)}
                            placeholder="e.g., stdout or user.name"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="operator">Operator</label>
                        <select
                            id="operator"
                            value={assertion.operator || '=='}
                            onChange={e => handleFieldChange('operator', e.target.value)}
                        >
                            <option value="==">== (equals)</option>
                            <option value="!=">!= (not equals)</option>
                            <option value=">">&gt; (greater than)</option>
                            <option value="<">&lt; (less than)</option>
                            <option value=">=">&gt;= (greater or equal)</option>
                            <option value="<=">&lt;= (less or equal)</option>
                            <option value="includes">includes</option>
                            <option value="matches">matches (regex)</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="expected-value">Expected Value *</label>
                        <input
                            id="expected-value"
                            type="text"
                            value={assertion.expected_value || ''}
                            onChange={e => handleFieldChange('expected_value', e.target.value)}
                            placeholder="Value to compare against"
                        />
                    </div>
                    <div className="form-group">
                        <FieldLabel htmlFor="extract-pattern" tooltip={helpText.extract_pattern}>
                            Extract Pattern (regex)
                        </FieldLabel>
                        <input
                            id="extract-pattern"
                            type="text"
                            value={assertion.extract_pattern || ''}
                            onChange={e => handleFieldChange('extract_pattern', e.target.value)}
                            placeholder="e.g., Total: ([\\d,]+)"
                        />
                    </div>
                </>
            )}

            {assertion.type === 'assert_line_count' && (
                <>
                    <div className="form-group">
                        <FieldLabel htmlFor="line-count-operator" tooltip={helpText.assert_line_count_desc}>
                            Operator *
                        </FieldLabel>
                        <select
                            id="line-count-operator"
                            value={assertion.operator || '<='}
                            onChange={e => handleFieldChange('operator', e.target.value)}
                        >
                            <option value="==">== (equals)</option>
                            <option value="!=">!= (not equals)</option>
                            <option value=">">&gt; (greater than)</option>
                            <option value="<">&lt; (less than)</option>
                            <option value=">=">&gt;= (greater or equal)</option>
                            <option value="<=">&lt;= (less or equal)</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <FieldLabel htmlFor="max-lines" tooltip={helpText.assert_line_count_desc}>
                            Max Lines *
                        </FieldLabel>
                        <input
                            id="max-lines"
                            type="number"
                            value={assertion.max_lines || assertion.expected_value || 450}
                            onChange={e =>
                                handleFieldChange('max_lines', parseInt(e.target.value) || 450)
                            }
                        />
                    </div>
                    <div className="form-group">
                        <FieldLabel htmlFor="assert-line-count-message" tooltip={helpText.message}>
                            Message
                        </FieldLabel>
                        <input
                            id="assert-line-count-message"
                            type="text"
                            value={assertion.message || ''}
                            onChange={e => handleFieldChange('message', e.target.value)}
                            placeholder="Custom error message"
                        />
                    </div>
                    <div className="form-group">
                        <FieldLabel htmlFor="assert-line-count-suggestion" tooltip={helpText.suggestion}>
                            Suggestion
                        </FieldLabel>
                        <input
                            id="assert-line-count-suggestion"
                            type="text"
                            value={assertion.suggestion || ''}
                            onChange={e => handleFieldChange('suggestion', e.target.value)}
                            placeholder="Actionable suggestion"
                        />
                    </div>
                </>
            )}

            {assertion.type === 'assert_command_output' && (
                <>
                    <div className="form-group">
                        <FieldLabel htmlFor="target" tooltip={helpText.target}>
                            Target *
                        </FieldLabel>
                        <select
                            id="target"
                            value={assertion.target || 'stdout'}
                            onChange={e => handleFieldChange('target', e.target.value)}
                        >
                            <option value="stdout">stdout (standard output)</option>
                            <option value="stderr">stderr (standard error)</option>
                            <option value="exitCode">exitCode</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="condition">Condition</label>
                        <select
                            id="condition"
                            value={assertion.condition || '=='}
                            onChange={e => handleFieldChange('condition', e.target.value)}
                        >
                            <option value="==">== (equals)</option>
                            <option value="!=">!= (not equals)</option>
                            <option value=">">&gt; (greater than)</option>
                            <option value="<">&lt; (less than)</option>
                            <option value=">=">&gt;= (greater or equal)</option>
                            <option value="<=">&lt;= (less or equal)</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="expected-value">Expected Value</label>
                        <input
                            id="expected-value"
                            type="text"
                            value={assertion.expected_value || ''}
                            onChange={e => handleFieldChange('expected_value', e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <FieldLabel htmlFor="assert-cmd-message" tooltip={helpText.message}>
                            Message
                        </FieldLabel>
                        <input
                            id="assert-cmd-message"
                            type="text"
                            value={assertion.message || ''}
                            onChange={e => handleFieldChange('message', e.target.value)}
                            placeholder="Custom error message"
                        />
                    </div>
                    <div className="form-group">
                        <FieldLabel htmlFor="assert-cmd-suggestion" tooltip={helpText.suggestion}>
                            Suggestion
                        </FieldLabel>
                        <input
                            id="assert-cmd-suggestion"
                            type="text"
                            value={assertion.suggestion || ''}
                            onChange={e => handleFieldChange('suggestion', e.target.value)}
                            placeholder="Actionable suggestion"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="documentation">Documentation URL</label>
                        <input
                            id="documentation"
                            type="text"
                            value={assertion.documentation || ''}
                            onChange={e => handleFieldChange('documentation', e.target.value)}
                            placeholder="https://example.com/docs"
                        />
                    </div>
                </>
            )}
        </div>
    );
}

export default RuleForm;
