import React, { useState, useEffect } from 'react';
import RuleForm from './components/RuleForm';
import './styles.css';

const API_BASE = '/api/rule';

function App() {
    const [ruleData, setRuleData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [showYaml, setShowYaml] = useState(false);
    const [validationResults, setValidationResults] = useState(null);

    useEffect(() => {
        loadRule();
    }, []);

    const loadRule = async (filePath) => {
        try {
            setLoading(true);
            const url = filePath ? `${API_BASE}?file=${encodeURIComponent(filePath)}` : API_BASE;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Failed to load rule file');
            }
            const data = await response.json();
            setRuleData(data);
            setError(null);
        } catch (err) {
            setError(err.message || 'Failed to load rule file');
            setRuleData(null);
        } finally {
            setLoading(false);
        }
    };

    const handleOpen = () => {
        const path = window.prompt('Enter path to rule file (relative to project root):', ruleData?.filePath || '.codeguardian/development-rules.cg.yaml');
        if (path != null && path.trim()) {
            loadRule(path.trim());
        }
    };

    const handleSave = async rule => {
        try {
            const body = {
                id: rule.id,
                description: rule.description,
                rule: rule.rule,
            };
            if (ruleData?.filePath) {
                body.filePath = ruleData.filePath;
            }
            const response = await fetch(API_BASE, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                throw new Error('Failed to save rule file');
            }

            const result = await response.json();
            setSuccessMessage(result.message || 'Rule saved successfully');
            setTimeout(() => setSuccessMessage(null), 3000);
            await loadRule();
            return true;
        } catch (err) {
            setError(err.message || 'Failed to save rule file');
            return false;
        }
    };

    const handleRevert = () => {
        loadRule(ruleData?.filePath);
    };

    const generateYaml = () => {
        if (!ruleData) return '';
        const yaml = `id: ${ruleData.id}
description: ${ruleData.description || ''}
rule:
${yamlFromRule(ruleData.rule, 1)}`;
        return yaml;
    };

    const yamlFromRule = (rule, indent) => {
        const spaces = '  '.repeat(indent);
        let yaml = `${spaces}type: ${rule.type}\n`;

        if (rule.type === 'for_each') {
            if (rule.select) {
                yaml += `${spaces}select:\n`;
                yaml += yamlFromSelector(rule.select, indent + 1);
            }
            if (rule.assert) {
                yaml += `${spaces}assert:\n`;
                yaml += yamlFromRule(rule.assert, indent + 1);
            }
        } else if (['all_of', 'any_of', 'none_of'].includes(rule.type)) {
            if (rule.rules && rule.rules.length > 0) {
                yaml += `${spaces}rules:\n`;
                rule.rules.forEach(childRule => {
                    yaml += `${spaces}-\n`;
                    yaml += yamlFromRule(childRule, indent + 1);
                });
            }
        } else {
            yaml += yamlFromProps(rule, indent, ['type']);
        }

        return yaml;
    };

    const yamlFromProps = (obj, indent, excludeKeys = []) => {
        const spaces = '  '.repeat(indent);
        let yaml = '';
        const exclude = new Set(excludeKeys);
        Object.entries(obj).forEach(([key, value]) => {
            if (exclude.has(key) || value === undefined || value === '') return;
            if (Array.isArray(value)) {
                yaml += `${spaces}${key}:\n`;
                value.forEach(v => {
                    yaml += `${spaces}- ${typeof v === 'string' && (v.includes(':') || v.includes('#')) ? `"${v.replace(/"/g, '\\"')}"` : v}\n`;
                });
            } else if (typeof value === 'boolean') {
                yaml += `${spaces}${key}: ${value}\n`;
            } else if (typeof value === 'number') {
                yaml += `${spaces}${key}: ${value}\n`;
            } else {
                const str = String(value);
                const needsQuotes = str.includes('\n') || str.includes(':') || str.includes('#') || str.includes('"');
                yaml += `${spaces}${key}: ${needsQuotes ? `"${str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"` : str}\n`;
            }
        });
        return yaml;
    };

    const yamlFromSelector = (selector, indent) => {
        const spaces = '  '.repeat(indent);
        let yaml = `${spaces}type: ${selector.type}\n`;

        Object.entries(selector).forEach(([key, value]) => {
            if (key !== 'type') {
                if (Array.isArray(value)) {
                    yaml += `${spaces}${key}:\n`;
                    value.forEach(v => {
                        yaml += `${spaces}- ${v}\n`;
                    });
                } else if (typeof value === 'boolean' || typeof value === 'number') {
                    yaml += `${spaces}${key}: ${value}\n`;
                } else {
                    yaml += `${spaces}${key}: ${value}\n`;
                }
            }
        });

        return yaml;
    };

    const handleValidate = async () => {
        setValidationResults(null);
        try {
            const response = await fetch('/api/validate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: ruleData.id,
                    description: ruleData.description,
                    rule: ruleData.rule,
                }),
            });

            if (response.ok) {
                const result = await response.json();
                setValidationResults(result);
            } else {
                setValidationResults({
                    valid: false,
                    errors: [{ message: 'Validation not available on server' }],
                });
            }
        } catch (err) {
            setValidationResults({
                valid: false,
                errors: [{ message: 'Validation not available' }],
            });
        }
    };

    if (loading) {
        return <div className="loading">Loading rule file...</div>;
    }

    if (error && !ruleData) {
        return (
            <div className="container">
                <div className="card">
                    <div className="error-message">{error}</div>
                    <button className="btn btn-secondary" onClick={loadRule}>
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <header className="header">
                <div className="header-left">
                    <p className="file-path">{ruleData?.filePath || ''}</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={handleOpen}>
                        Open
                    </button>
                    {validationResults && (
                        <button
                            className="btn btn-secondary"
                            onClick={() => setValidationResults(null)}
                        >
                            Clear
                        </button>
                    )}
                    <button className="btn btn-secondary" onClick={handleValidate}>
                        Validate
                    </button>
                    <button className="btn btn-secondary" onClick={() => setShowYaml(!showYaml)}>
                        {showYaml ? 'Hide YAML' : 'View YAML'}
                    </button>
                    <button className="btn btn-secondary" onClick={handleRevert}>
                        Revert
                    </button>
                    <button className="btn btn-primary" onClick={() => handleSave(ruleData)}>
                        Save
                    </button>
                </div>
            </header>

            <main className="container">
                {error && <div className="error-message">{error}</div>}
                {successMessage && <div className="success-message">{successMessage}</div>}

                {validationResults && (
                    <div className="card validation-results">
                        <h3>Validation Results</h3>
                        {validationResults.valid ? (
                            <div className="validation-success">Rule is valid</div>
                        ) : (
                            validationResults.errors?.map((err, idx) => (
                                <div key={idx} className="validation-error">
                                    {err.message}
                                    {err.path && <span> (Path: {err.path})</span>}
                                </div>
                            ))
                        )}
                    </div>
                )}

                {showYaml ? (
                    <div className="card">
                        <div className="card-title">Rule YAML</div>
                        <div className="yaml-view">{generateYaml()}</div>
                    </div>
                ) : (
                    <RuleForm ruleData={ruleData} onChange={setRuleData} onSave={handleSave} />
                )}
            </main>
        </div>
    );
}

export default App;
