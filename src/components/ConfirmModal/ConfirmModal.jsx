import React from 'react';
import { Modal, Button } from 'react-bootstrap';

/**
 * Generic confirmation dialog. Replaces per-feature bespoke delete/confirm
 * modals so wording, layout and button semantics stay consistent.
 */
function ConfirmModal({
  show,
  title = 'Please confirm',
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'danger',
  confirmIcon,
  loading = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal show={show} onHide={onCancel} centered>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{children}</Modal.Body>
      <Modal.Footer>
        <Button variant="light" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button variant={confirmVariant} onClick={onConfirm} disabled={loading}>
          {confirmIcon && <i className={`bi ${confirmIcon} me-2`}></i>}
          {loading ? 'Working…' : confirmLabel}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default ConfirmModal;
