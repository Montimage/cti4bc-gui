import React from 'react';
import { Badge, Tooltip, OverlayTrigger } from 'react-bootstrap';

/**
 * Compact list of organization names as badges, collapsing the overflow into a
 * "+N more" badge with a tooltip listing all of them.
 *
 * Extracted verbatim from FormsView so it can be reused across the app
 * (Events, Reports, …). Behaviour is unchanged.
 */
function OrganizationBadges({ organizations, maxVisible = 2 }) {
  if (!organizations || organizations.length === 0) {
    return <span className="text-muted">No organization</span>;
  }

  const visibleOrgs = organizations.slice(0, maxVisible);
  const remainingCount = organizations.length - maxVisible;

  return (
    <div className="organization-badges-compact">
      {visibleOrgs.map((name, index) => (
        <Badge key={index} bg="secondary" className="me-1">
          {name.length > 12 ? `${name.substring(0, 12)}...` : name}
        </Badge>
      ))}
      {remainingCount > 0 && (
        <OverlayTrigger
          placement="top"
          overlay={
            <Tooltip className="organizations-tooltip">
              <div>
                <strong>All Organizations:</strong>
                <div className="mt-1">
                  {organizations.map((name, index) => (
                    <Badge key={index} bg="info" className="me-1 mb-1">
                      {name}
                    </Badge>
                  ))}
                </div>
              </div>
            </Tooltip>
          }
        >
          <Badge bg="info" className="organization-badge-more">
            +{remainingCount}
          </Badge>
        </OverlayTrigger>
      )}
    </div>
  );
}

export default OrganizationBadges;
