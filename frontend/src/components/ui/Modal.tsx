// src/components/ui/Modal.tsx
import React, { useEffect, useCallback } from 'react';
import './Modal.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showClose?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showClose = true,
}) => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className={`modal modal--${size}`}
        onClick={e => e.stopPropagation()}
        role="document"
      >
        {(title || showClose) && (
          <div className="modal__header">
            {title && <h2 className="modal__title">{title}</h2>}
            {showClose && (
              <button className="modal__close" onClick={onClose} aria-label="Đóng">
                ✕
              </button>
            )}
          </div>
        )}
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
