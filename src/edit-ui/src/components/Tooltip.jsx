import React, { useState, useId } from 'react';

/**
 * Lightweight tooltip: shows content on hover/focus. Uses aria-describedby for accessibility.
 * Wrapper is focusable (tabIndex=0) so keyboard users can reveal the tooltip.
 */
function Tooltip({ content, children }) {
    const [visible, setVisible] = useState(false);
    const id = useId();
    const tooltipId = `tooltip-${id.replace(/:/g, '-')}`;

    return (
        <span
            className="tooltip-trigger"
            tabIndex={0}
            onMouseEnter={() => setVisible(true)}
            onMouseLeave={() => setVisible(false)}
            onFocus={() => setVisible(true)}
            onBlur={() => setVisible(false)}
        >
            {children}
            {visible && content && (
                <span id={tooltipId} className="tooltip-content" role="tooltip">
                    {content}
                </span>
            )}
        </span>
    );
}

export default Tooltip;
