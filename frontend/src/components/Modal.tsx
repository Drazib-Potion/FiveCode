
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

  const typeStyles = {
    info: 'bg-blue-50 text-blue-700',
    error: 'bg-red-50 text-red-700',
    warning: 'bg-orange-50 text-orange-700',
    success: 'bg-green-50 text-green-700',
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex justify-center items-center z-[1000] animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-lg max-w-[500px] w-[90%] max-h-[90vh] overflow-y-auto animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`p-6 border-b border-gray-light rounded-t-lg ${typeStyles[type]}`}>
          <h3 className="m-0 text-xl font-semibold">{title}</h3>
        </div>
        <div className="p-6 text-gray-dark leading-relaxed">
          <p className="m-0">{message}</p>
        </div>
        <div className="p-4 pt-4 border-t border-gray-light flex justify-end gap-4">
          {showConfirm ? (
            <>
              <button 
                onClick={onClose}
                className="px-6 py-3 border-none rounded cursor-pointer text-base font-medium transition-all duration-200 bg-gray-500 text-white hover:bg-gray-600"
              >
                {cancelText}
              </button>
              <button 
                onClick={handleConfirm}
                className="px-6 py-3 border-none rounded cursor-pointer text-base font-medium transition-all duration-200 bg-purple-dark text-white hover:bg-purple-dark/90"
              >
                {confirmText}
              </button>
            </>
          ) : (
            <button 
              onClick={onClose}
              className="px-6 py-3 border-none rounded cursor-pointer text-base font-medium transition-all duration-200 bg-purple text-white hover:bg-purple/90"
            >
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

