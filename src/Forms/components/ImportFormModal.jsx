import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Spinner } from 'react-bootstrap';
import OrganizationPicker from '../../components/OrganizationPicker/OrganizationPicker';

/**
 * Single-step Google Form import: URL + target organizations in one modal, with
 * an inline processing state. Delegates to `onImport(payload)` which must return
 * a truthy value on success.
 */
function ImportFormModal({ show, organizations = [], onClose, onImport }) {
  const [url, setUrl] = useState('');
  const [orgIds, setOrgIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (show) { setUrl(''); setOrgIds([]); setSubmitting(false); }
  }, [show]);

  const toggleOrg = (id) => setOrgIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const selectAllOrgs = (all) => setOrgIds(all ? organizations.map((o) => o.id) : []);
  const canImport = url.trim() && orgIds.length > 0 && !submitting;

  const handleSubmit = async () => {
    setSubmitting(true);
    const ok = await onImport({ form_url: url.trim(), organizations: orgIds });
    setSubmitting(false);
    if (ok) onClose();
  };

  return (
    <Modal show={show} onHide={submitting ? undefined : onClose} backdrop="static">
      <Modal.Header closeButton={!submitting}>
        <Modal.Title>Import Google Form</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {submitting ? (
          <div className="text-center py-4">
            <Spinner animation="border" className="text-primary mb-3" />
            <h6>Importing Google Form…</h6>
            <p className="text-muted mb-0">We&apos;re fetching and processing your form. This may take a few moments.</p>
          </div>
        ) : (
          <>
            <Form.Group className="mb-3">
              <Form.Label>Google Form URL <span className="text-danger">*</span></Form.Label>
              <Form.Control
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://docs.google.com/forms/d/FORM_ID/edit"
              />
              <Form.Text className="text-muted">
                Imported via Google Apps Script. Supported: text, email, number, choice and checkbox questions.
              </Form.Text>
            </Form.Group>
            <Form.Group>
              <Form.Label>Organizations <span className="text-danger">*</span></Form.Label>
              <OrganizationPicker organizations={organizations} selectedIds={orgIds} onToggle={toggleOrg} onSelectAll={selectAllOrgs} />
            </Form.Group>
          </>
        )}
      </Modal.Body>
      {!submitting && (
        <Modal.Footer>
          <Button variant="light" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={!canImport}>
            <i className="bi bi-cloud-arrow-down me-2"></i>Import form
          </Button>
        </Modal.Footer>
      )}
    </Modal>
  );
}

export default ImportFormModal;
