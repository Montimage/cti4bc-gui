import React, { useState } from 'react';
import { Form, Button, Row, Col } from 'react-bootstrap';

export const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'number', label: 'Number' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'select', label: 'Select' },
  { value: 'radio', label: 'Radio' },
  { value: 'checkbox', label: 'Checkbox' },
];

// Options are relevant for choice fields. NOTE: this now includes `checkbox`,
// fixing the previous inconsistency where checkbox options could not be entered.
export const needsOptions = (type) => ['select', 'radio', 'checkbox'].includes(type);

const slugify = (label) =>
  (label || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'field';
const optionsToText = (opts) => (Array.isArray(opts) ? opts.join(', ') : opts || '');
const textToOptions = (text) => (text || '').split(',').map((o) => o.trim()).filter(Boolean);

const EMPTY_DRAFT = { label: '', type: 'text', required: false, options: '' };

/**
 * Field list builder: add, inline-edit, remove and reorder form fields.
 * `name` (the answer key) is auto-derived from the label for new fields and
 * kept stable for existing fields so previously collected answers still map.
 */
function FieldEditor({ fields, onChange }) {
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editDraft, setEditDraft] = useState(null);

  const uniqueName = (base) => {
    const existing = new Set(fields.map((f) => f.name));
    if (!existing.has(base)) return base;
    let i = 2;
    while (existing.has(`${base}_${i}`)) i += 1;
    return `${base}_${i}`;
  };

  const addField = () => {
    if (!draft.label.trim()) return;
    const field = {
      name: uniqueName(slugify(draft.label)),
      type: draft.type,
      label: draft.label.trim(),
      required: draft.required,
    };
    if (needsOptions(draft.type)) field.options = textToOptions(draft.options);
    onChange([...fields, field]);
    setDraft(EMPTY_DRAFT);
  };

  const removeField = (index) => {
    if (editingIndex === index) { setEditingIndex(null); setEditDraft(null); }
    onChange(fields.filter((_, i) => i !== index));
  };

  const move = (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const startEdit = (index) => {
    setEditingIndex(index);
    setEditDraft({ ...fields[index], options: optionsToText(fields[index].options) });
  };
  const cancelEdit = () => { setEditingIndex(null); setEditDraft(null); };
  const saveEdit = () => {
    if (editingIndex === null || !editDraft) return;
    const original = fields[editingIndex];
    const updated = {
      name: original.name, // keep the answer key stable
      label: editDraft.label.trim() || original.name,
      type: editDraft.type,
      required: editDraft.required,
    };
    if (needsOptions(editDraft.type)) updated.options = textToOptions(editDraft.options);
    const next = [...fields];
    next[editingIndex] = updated;
    onChange(next);
    setEditingIndex(null);
    setEditDraft(null);
  };

  const renderDraftForm = (value, setValue, onPrimary, primaryLabel, onCancel) => (
    <div className="fb-add">
      <Row className="g-2">
        <Col md={6}>
          <Form.Label>Field label</Form.Label>
          <Form.Control
            size="sm"
            value={value.label}
            placeholder="e.g. Additional comments"
            onChange={(e) => setValue({ ...value, label: e.target.value })}
          />
        </Col>
        <Col md={6}>
          <Form.Label>Type</Form.Label>
          <Form.Select size="sm" value={value.type} onChange={(e) => setValue({ ...value, type: e.target.value })}>
            {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Form.Select>
        </Col>
      </Row>
      {needsOptions(value.type) && (
        <div className="mt-2">
          <Form.Label>Options <span className="text-muted">(comma-separated)</span></Form.Label>
          <Form.Control
            size="sm"
            value={value.options}
            placeholder="Option 1, Option 2, Option 3"
            onChange={(e) => setValue({ ...value, options: e.target.value })}
          />
        </div>
      )}
      <div className="mt-2 d-flex align-items-center gap-3">
        <Form.Check
          type="switch"
          label="Required"
          checked={value.required}
          onChange={(e) => setValue({ ...value, required: e.target.checked })}
        />
        <div className="ms-auto d-flex gap-2">
          {onCancel && <Button size="sm" variant="light" onClick={onCancel}>Cancel</Button>}
          <Button size="sm" variant={onCancel ? 'primary' : 'outline-primary'} onClick={onPrimary} disabled={!value.label.trim()}>
            {!onCancel && <i className="bi bi-plus-lg me-1"></i>}{primaryLabel}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="fb-section-title">
        <span>Fields</span>
        {fields.length > 1 && (
          <span className="text-muted" style={{ fontSize: '.78rem', fontWeight: 400 }}>Use arrows to reorder</span>
        )}
      </div>

      {fields.length === 0 && (
        <p className="text-muted" style={{ fontSize: '.88rem' }}>No fields yet. Add your first field below.</p>
      )}

      {fields.map((field, index) =>
        editingIndex === index
          ? <div key={field.name}>{renderDraftForm(editDraft, setEditDraft, saveEdit, 'Save field', cancelEdit)}</div>
          : (
            <div key={field.name} className="fb-field-item">
              <div className="fb-grip">
                <button type="button" className="btn btn-sm btn-link p-0" title="Move up" disabled={index === 0} onClick={() => move(index, -1)}>
                  <i className="bi bi-chevron-up"></i>
                </button>
                <button type="button" className="btn btn-sm btn-link p-0" title="Move down" disabled={index === fields.length - 1} onClick={() => move(index, 1)}>
                  <i className="bi bi-chevron-down"></i>
                </button>
              </div>
              <div className="fb-field-main">
                <div className="fb-field-label">{field.label || field.name}<span className="fb-type-badge">{field.type}</span></div>
                <div className="fb-field-meta">
                  {field.name}
                  {field.required ? ' · required' : ''}
                  {needsOptions(field.type) && field.options?.length ? ` · ${field.options.length} options` : ''}
                </div>
              </div>
              <div className="d-flex gap-1">
                <button type="button" className="mi-icon-btn" title="Edit" onClick={() => startEdit(index)}><i className="bi bi-pencil"></i></button>
                <button type="button" className="mi-icon-btn mi-icon-btn--danger" title="Remove" onClick={() => removeField(index)}><i className="bi bi-trash"></i></button>
              </div>
            </div>
          )
      )}

      {editingIndex === null && renderDraftForm(draft, setDraft, addField, 'Add field', null)}
    </>
  );
}

export default FieldEditor;
