
import React from 'react';
import { DONATION_TEXTS } from '../constants';
import { Language } from '../types';

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

const DonationModal: React.FC<DonationModalProps> = ({ isOpen, onClose, language }) => {
  if (!isOpen) return null;

  const content = DONATION_TEXTS[language];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-emerald-100">
        <div className="bg-emerald-800 p-6 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 hover:bg-white/20 p-2 rounded-full transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="text-3xl mb-2">🤲</div>
          <h2 className="text-xl font-bold">{content.title}</h2>
        </div>
        
        <div className="p-8 space-y-6">
          <p className="text-gray-600 leading-relaxed text-center italic">
            "{content.desc}"
          </p>
          
          <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100">
            <div className="text-sm text-emerald-800 font-semibold mb-1 uppercase tracking-wider">Kartaga o‘tkazish (UZCARD)</div>
            <div className="text-2xl font-mono text-emerald-950 font-bold mb-4 tracking-tighter">
              {content.card}
            </div>
            <div className="text-sm text-emerald-800 font-semibold mb-1 uppercase tracking-wider">Sohibi</div>
            <div className="text-lg text-emerald-950 font-medium">
              {content.author}
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-[0.98]"
          >
            Tushunarli
          </button>
        </div>
      </div>
    </div>
  );
};

export default DonationModal;
