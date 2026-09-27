
import React from 'react';

interface ModalProps {
  onClose: () => void;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ onClose, children }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="pixel-border bg-black p-8 relative max-w-md w-full text-green-400">
        <button onClick={onClose} className="absolute top-2 right-2 text-2xl px-2">&times;</button>
        {children}
      </div>
    </div>
  );
};

export default Modal;
