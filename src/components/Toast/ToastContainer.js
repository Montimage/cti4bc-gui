import React from 'react';
import { createPortal } from 'react-dom';
import { useToast } from './ToastContext';
import Toast from './Toast';
import './Toast.css';

const ToastContainer = () => {
  const { toasts } = useToast();

  if (toasts.length === 0) return null;

  const toastContainer = (
    <div className="toast-container">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>
  );

  // Render toasts in a portal to ensure they appear above all other content
  return createPortal(toastContainer, document.body);
};

export default ToastContainer;
