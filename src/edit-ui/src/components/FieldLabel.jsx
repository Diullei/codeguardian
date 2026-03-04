import React from 'react';
import Tooltip from './Tooltip';

/**
 * Label with optional tooltip. When tooltip is provided, wraps label in Tooltip and shows a (?) hint.
 */
function FieldLabel({ htmlFor, tooltip, children }) {
    const label = (
        <label htmlFor={htmlFor}>
            {children}
            {tooltip && <span className="field-label-hint"> (?)</span>}
        </label>
    );

    if (tooltip) {
        return (
            <Tooltip content={tooltip}>
                {label}
            </Tooltip>
        );
    }
    return label;
}

export default FieldLabel;
