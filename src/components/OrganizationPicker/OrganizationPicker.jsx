import React from 'react';
import { Button, Form, Alert } from 'react-bootstrap';

/**
 * Multi-select checklist of organizations with Select All / Deselect All and a
 * "N of M selected" summary. Presentational only — selection state and handlers
 * are owned by the parent, so it can be reused by create / import / edit flows.
 */
function OrganizationPicker({ organizations = [], selectedIds = [], onToggle, onSelectAll }) {
  if (organizations.length === 0) {
    return (
      <Alert variant="warning">
        No organizations available. Please contact an administrator.
      </Alert>
    );
  }

  return (
    <>
      <div className="mb-3 d-flex gap-2">
        <Button
          variant="outline-primary"
          size="sm"
          onClick={() => onSelectAll(true)}
          disabled={selectedIds.length === organizations.length}
        >
          Select All
        </Button>
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={() => onSelectAll(false)}
          disabled={selectedIds.length === 0}
        >
          Deselect All
        </Button>
      </div>

      <div className="organization-selection">
        {organizations.map((org) => (
          <Form.Check
            key={org.id}
            type="checkbox"
            id={`org-${org.id}`}
            label={
              <div>
                <strong>{org.name}</strong>
                {org.description && <div className="text-muted">{org.description}</div>}
              </div>
            }
            checked={selectedIds.includes(org.id)}
            onChange={() => onToggle(org.id)}
            className="mb-3"
          />
        ))}
      </div>

      {selectedIds.length > 0 && (
        <Alert variant="info" className="mt-3">
          Selected organizations: {selectedIds.length} of {organizations.length}
        </Alert>
      )}
    </>
  );
}

export default OrganizationPicker;
