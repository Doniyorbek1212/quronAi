
import React from 'react';

interface VoiceOverlayProps {
  status: 'connecting' | 'active';
  onStop: () => void;
}

const VoiceOverlay: React.FC<VoiceOverlayProps> = ({ status, onStop }) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-emerald-900/95 text-white p-6">
      <div className="text-center space-y-8 max-w-sm w-full">
        <div className="relative">
          <div className={`absolute inset-0 bg-white/20 rounded-full scale-150 blur-3xl ${status === 'active' ? 'animate-pulse' : ''}`}></div>
          <div className="relative flex items-center justify-center h-32 w-32 mx-auto bg-emerald-600 rounded-full border-4 border-emerald-400 shadow-[0_0_50px_rgba(52,211,153,0.5)]">
            {status === 'connecting' ? (
                <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
                <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="w-2 bg-white rounded-full animate-[bounce_1s_infinite]" style={{ height: `${Math.random() * 40 + 20}px`, animationDelay: `${i * 0.1}s` }}></div>
                    ))}
                </div>
            )}
          </div>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">
            {status === 'connecting' ? "Bog‘lanmoqda..." : "Qur’on AI tinglamoqda..."}
          </h2>
          <p className="text-emerald-200">
            {status === 'connecting' ? "Sessiya faollashtirilmoqda" : "Sokin va ishonchli ovozda savolingizni bering"}
          </p>
        </div>

        <button 
          onClick={onStop}
          className="bg-red-500 hover:bg-red-600 text-white px-8 py-4 rounded-full font-bold shadow-xl transition-all transform hover:scale-105 active:scale-95"
        >
          Muloqotni yakunlash
        </button>
      </div>
    </div>
  );
};

export default VoiceOverlay;
