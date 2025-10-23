import * as React from 'react';
import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);

    return () => {
      clearTimeout(timer);
    };
  }, [onClose]);

  const baseClasses = 'fixed top-5 right-5 p-4 rounded-lg shadow-lg text-white text-sm z-50 flex items-center animate-fade-in-down';
  const typeClasses = {
    success: 'bg-green-500',
    error: 'bg-red-500',
  };

  return (
    <div className={`${baseClasses} ${typeClasses[type]}`}>
      <span className="flex-grow">{message}</span>
      <button onClick={onClose} className="ml-4 font-bold text-lg leading-none">&times;</button>
    </div>
  );
};

export default Toast;