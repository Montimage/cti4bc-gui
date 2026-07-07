import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import OrganizationPicker from '../../components/OrganizationPicker/OrganizationPicker';
import FieldEditor, { needsOptions } from './FieldEditor';
import './FormBuilder.css';

const BLANK = { title: '', description: '', is_active: true, fields: [], organizations: [] };

function FormPreview({ title, fields }) {
  return (
    <div className="fb-preview">
      <h4>Live preview</h4>
      {title && <div style={{ fontWeight: 600, marginBottom: 12 }}>{title}</div>}
      {fields.length === 0 && (
        <div className="text-muted" style={{ fontSize: '.85rem' }}>Fields you add will appear here.</div>
      )}
      {fields.map((f) => (
        <div className="fb-pv-field" key={f.name}>
          <label>{f.label || f.name}{f.required && <span className="text-danger"> *</span>}</label>
          {f.type === 'textarea' ? (
            <textarea className="form-control form-control-sm" rows={2} disabled placeholder="Answer" />
          ) : f.type === 'select' ? (
            <select className="form-select form-select-sm" disabled>
              <option>Select…</option>
              {(f.options || []).map((o, i) => <option key={i}>{o}</option>)}
            </select>
          ) : f.type === 'radio' || f.type === 'checkbox' ? (
            <div>
              {(f.options || []).map((o, i) => <Form.Check key={i} type={f.type} disabled label={o} name={`pv-${f.name}`} />)}
              {(f.options || []).length === 0 && <Form.Check type={f.type} disabled label="Option" />}
            </div>
          ) : (
            <input
              className="form-control form-control-sm"
              disabled
              type={f.type === 'number' ? 'number' : f.type === 'email' ? 'email' : 'text'}
              placeholder="Answer"
            />
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Unified create / edit form modal. Owns its own draft state (initialised from
 * `initialForm` on open) and delegates persistence to `onSave(payload, mode)`
 * which must return a truthy value on success.
 */
function FormBuilderModal({ show, mode = 'create', initialForm, organizations = [], onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [fields, setFields] = useState([]);
  const [orgIds, setOrgIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!show) return;
    const src = initialForm || BLANK;
    setTitle(src.title || '');
    setDescription(src.description || '');
    setIsActive(src.is_active !== undefined ? src.is_active : true);
    setFields(Array.isArray(src.fields) ? src.fields : []);
    setOrgIds(Array.isArray(src.organizations) ? src.organizations : []);
    setSubmitting(false);
  }, [show, initialForm]);

  const toggleOrg = (id) => setOrgIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const selectAllOrgs = (all) => setOrgIds(all ? organizations.map((o) => o.id) : []);

  const canSave = title.trim() && orgIds.length > 0 && fields.length > 0 && !submitting;

  const handleSubmit = async () => {
    setSubmitting(true);
    const ok = await onSave(
      {
        id: initialForm?.id,
        title: title.trim(),
        description,
        fields,
        is_active: isActive,
        organizations: orgIds,
      },
      mode
    );
    setSubmitting(false);
    if (ok) onClose();
  };

  return (
    <Modal show={show} onHide={onClose} size="xl" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>{mode === 'edit' ? 'Edit Form' : 'Create Form'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="fb-grid">
          <div>
            <Form.Group className="mb-3">
              <Form.Label>Title <span className="text-danger">*</span></Form.Label>
              <Form.Control value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter form title" autoFocus />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control as="textarea" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
            </Form.Group>
            <Form.Group className="mb-3 d-flex align-items-center justify-content-between">
              <Form.Label className="mb-0">Status</Form.Label>
              <Form.Check type="switch" id="fb-active" label={isActive ? 'Active' : 'Inactive'} checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Organizations <span className="text-danger">*</span></Form.Label>
              <OrganizationPicker organizations={organizations} selectedIds={orgIds} onToggle={toggleOrg} onSelectAll={selectAllOrgs} />
            </Form.Group>
            <FieldEditor fields={fields} onChange={setFields} />
          </div>
          <FormPreview title={title} fields={fields} />
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="light" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={!canSave}>
          <i className="bi bi-check-lg me-2"></i>{submitting ? 'Saving…' : 'Save form'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default FormBuilderModal;
