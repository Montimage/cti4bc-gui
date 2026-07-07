import React from 'react';
import './EmptyState.css';

/**
 * Consistent, on-brand empty-state placeholder: icon + title + description +
 * optional action. Replaces ad-hoc "No X found" text scattered across pages.
 */
function EmptyState({ icon = 'bi-inbox', title, description, action }) {
  return (
    <div className="mi-empty">
      <i className={`bi ${icon} mi-empty__icon`}></i>
      {title && <h3 className="mi-empty__title">{title}</h3>}
      {description && <div className="mi-empty__desc">{description}</div>}
      {action && <div className="mi-empty__action">{action}</div>}
    </div>
  );
}

export default EmptyState;
