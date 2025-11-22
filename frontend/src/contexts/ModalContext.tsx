import React, { createContext, useContext, useState, useCallback } from 'react';
import Modal from '../components/Modal';

interface ModalContextType {
  showAlert: (message: string, type?: 'info' | 'error' | 'warning' | 'success') => Promise<void>;
  showConfirm: (message: string, title?: string) => Promise<boolean>;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'info' | 'error' | 'warning' | 'success';
    showConfirm: boolean;
    resolve?: (value: boolean | void) => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    showConfirm: false,
  });

  const showAlert = useCallback(
    (message: string, type: 'info' | 'error' | 'warning' | 'success' = 'info') => {
      return new Promise<void>((resolve) => {
        setModalState({
          isOpen: true,
          title: type === 'error' ? 'Erreur' : type === 'warning' ? 'Attention' : type === 'success' ? 'Succès' : 'Information',
          message,
          type,
          showConfirm: false,
          resolve: resolve as (value: boolean | void) => void,
        });
      });
    },
    [],
  );

  const showConfirm = useCallback((message: string, title: string = 'Confirmation') => {
    return new Promise<boolean>((resolve) => {
      setModalState({
        isOpen: true,
        title,
        message,
        type: 'warning',
        showConfirm: true,
        resolve: resolve as (value: boolean | void) => void,
      });
    });
  }, []);

  const handleClose = useCallback(() => {
    if (modalState.resolve) {
      modalState.resolve(false);
    }
    setModalState((prev) => ({ ...prev, isOpen: false, resolve: undefined }));
  }, [modalState.resolve]);

  const handleConfirm = useCallback(() => {
    if (modalState.resolve) {
      modalState.resolve(true);
    }
    setModalState((prev) => ({ ...prev, isOpen: false, resolve: undefined }));
  }, [modalState.resolve]);

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      <Modal
        isOpen={modalState.isOpen}
        onClose={handleClose}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        showConfirm={modalState.showConfirm}
        onConfirm={handleConfirm}
      />
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}

