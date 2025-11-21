import React from 'react';

export const Toast: React.FC<{ message: string; onClose: () => void }> = ({ message, onClose }) => {
  if (!message) return null as any;
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-[#18181b] text-white border border-zinc-800 rounded-xl shadow-lg px-4 py-3 max-w-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm">{message}</span>
          <button onClick={onClose} className="text-xs text-zinc-400 hover:text-white">Close</button>
        </div>
      </div>
    </div>
  );
};