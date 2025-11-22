import './Modal.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'info' | 'error' | 'warning' | 'success';
  showConfirm?: boolean;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  showConfirm = false,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  onConfirm,
}: ModalProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className={`modal-header modal-${type}`}>
          <h3>{title}</h3>
        </div>
        <div className="modal-body">
          <p>{message}</p>
        </div>
        <div className="modal-footer">
          {showConfirm ? (
            <>
              <button onClick={onClose} className="modal-button-cancel">
                {cancelText}
              </button>
              <button onClick={handleConfirm} className="modal-button-confirm">
                {confirmText}
              </button>
            </>
          ) : (
            <button onClick={onClose} className="modal-button-ok">
                OK
              </button>
          )}
        </div>
      </div>
    </div>
  );
}

