import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}

export default function Modal({ open, onClose, title, children, wide }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative bg-white rounded-xl shadow-xl ${wide ? 'w-full max-w-2xl' : 'w-full max-w-md'} max-h-[85vh] overflow-y-auto mx-4`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-telivity-navy">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-telivity-light-grey transition-colors">
            <X size={18} className="text-telivity-mid-grey" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
