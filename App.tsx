
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Language, Message, AppStatus } from './types';
import { GeminiService, decodeAudio, decodeAudioData, encodeAudio } from './services/gemini';
import DonationModal from './components/DonationModal';
import VoiceOverlay from './components/VoiceOverlay';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [language, setLanguage] = useState<Language>('uz');
  const [isDonationOpen, setIsDonationOpen] = useState(false);
  const [appStatus, setAppStatus] = useState<AppStatus>(AppStatus.IDLE);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const geminiRef = useRef(new GeminiService());
  const audioContextRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const liveSessionRef = useRef<any>(null);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef(0);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Show donation modal on first load
  useEffect(() => {
    const hasVisited = localStorage.getItem('visited_quran_ai');
    if (!hasVisited) {
      setTimeout(() => setIsDonationOpen(true), 2000);
      localStorage.setItem('visited_quran_ai', 'true');
    }
  }, []);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));
      
      const response = await geminiRef.current.getResponse(userMessage.content, history);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: response || 'Kechirasiz, xatolik yuz berdi.',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTyping(false);
    }
  };

  const startVoice = async () => {
    try {
      setAppStatus(AppStatus.CONNECTING);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const inCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = { input: inCtx, output: outCtx };

      const sessionPromise = geminiRef.current.connectLive({
        onopen: () => {
          setAppStatus(AppStatus.ACTIVE);
          const source = inCtx.createMediaStreamSource(stream);
          const processor = inCtx.createScriptProcessor(4096, 1, 1);
          
          processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const int16 = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
                int16[i] = inputData[i] * 32768;
            }
            const base64 = encodeAudio(new Uint8Array(int16.buffer));
            sessionPromise.then(session => {
                session.sendRealtimeInput({ media: { data: base64, mimeType: 'audio/pcm;rate=16000' } });
            });
          };

          source.connect(processor);
          processor.connect(inCtx.destination);
          (window as any)._audioProcessor = processor; // Prevent GC
        },
        onmessage: async (message: any) => {
          const audioBase64 = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audioBase64 && outCtx) {
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
            const buffer = await decodeAudioData(decodeAudio(audioBase64), outCtx, 24000, 1);
            const source = outCtx.createBufferSource();
            source.buffer = buffer;
            source.connect(outCtx.destination);
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += buffer.duration;
            audioSourcesRef.current.add(source);
            source.onended = () => audioSourcesRef.current.delete(source);
          }

          if (message.serverContent?.interrupted) {
            audioSourcesRef.current.forEach(s => s.stop());
            audioSourcesRef.current.clear();
            nextStartTimeRef.current = 0;
          }
        },
        onerror: (e: any) => {
          console.error('Live error:', e);
          stopVoice();
        },
        onclose: () => {
          stopVoice();
        }
      });

      liveSessionRef.current = await sessionPromise;
    } catch (err) {
      console.error(err);
      setAppStatus(AppStatus.ERROR);
    }
  };

  const stopVoice = useCallback(() => {
    if (liveSessionRef.current) {
        liveSessionRef.current.close();
        liveSessionRef.current = null;
    }
    audioSourcesRef.current.forEach(s => s.stop());
    audioSourcesRef.current.clear();
    if (audioContextRef.current) {
        audioContextRef.current.input.close();
        audioContextRef.current.output.close();
        audioContextRef.current = null;
    }
    setAppStatus(AppStatus.IDLE);
  }, []);

  return (
    <div className="max-w-4xl mx-auto h-screen flex flex-col p-4 md:p-6 overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between mb-6 glass-panel p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-700 rounded-xl flex items-center justify-center text-white text-xl shadow-lg">
            📖
          </div>
          <div>
            <h1 className="font-bold text-emerald-900 tracking-tight text-lg">QUR’ON AI</h1>
            <p className="text-xs text-emerald-600 font-medium uppercase tracking-widest">Islomiy Yo‘lko‘rsatuvchi</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <select 
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="bg-white border border-emerald-100 rounded-lg px-2 py-1 text-sm font-medium text-emerald-800 outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="uz">O‘zbek</option>
            <option value="ru">Русский</option>
            <option value="en">English</option>
          </select>
          <button 
            onClick={() => setIsDonationOpen(true)}
            className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-emerald-100 transition-colors hidden sm:block"
          >
            🤲 Hissa qo‘shish
          </button>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 overflow-y-auto mb-4 space-y-6 px-2 custom-scrollbar">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-6">
            <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center text-5xl mb-2 border border-emerald-100 animate-bounce duration-[3000ms]">
              🌙
            </div>
            <div className="max-w-md">
              <h2 className="text-2xl font-bold text-emerald-900 mb-2">As-salomu alaykum!</h2>
              <p className="text-emerald-700 italic font-quran text-lg mb-4">
                "Biz seni faqat olamlarga rahmat qilib yubordik." (Al-Anbiyo, 107)
              </p>
              <p className="text-gray-600 leading-relaxed">
                Men Qur’on AI - islomiy yo‘lko‘rsatuvchiman. Menga istalgan islomiy savolingizni berishingiz mumkin.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
              {['Namozning hikmati nima?', 'Sabr haqida oyat bormi?', 'Farzand tarbiyasi haqida', 'Taqvo nima degani?'].map(q => (
                <button 
                  key={q}
                  onClick={() => { setInputValue(q); }}
                  className="p-3 bg-white/60 hover:bg-emerald-50 border border-emerald-100 rounded-xl text-left text-sm text-emerald-800 transition-all hover:translate-x-1"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-3xl p-5 ${
              m.role === 'user' 
                ? 'bg-emerald-700 text-white shadow-lg rounded-tr-none' 
                : 'bg-white text-gray-800 shadow-sm border border-emerald-50 rounded-tl-none'
            }`}>
              <div className="whitespace-pre-wrap leading-relaxed text-[15px]">
                {m.content.split('\n').map((line, i) => {
                  // Custom rendering for the 4-stage structure if it's the model
                  if (m.role === 'model') {
                    if (line.match(/^[1-4]️⃣/)) {
                      return <h4 key={i} className="font-bold text-emerald-800 mt-4 mb-1 border-b border-emerald-50 pb-1">{line}</h4>;
                    }
                    if (line.includes('“') && line.includes('”')) {
                      return <p key={i} className="italic font-quran text-lg text-emerald-900 my-3 bg-emerald-50/50 p-3 rounded-lg border-l-4 border-emerald-500">{line}</p>;
                    }
                  }
                  return <p key={i} className="mb-2">{line}</p>;
                })}
              </div>
              <div className={`text-[10px] mt-2 ${m.role === 'user' ? 'text-emerald-100' : 'text-gray-400'}`}>
                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-emerald-50">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-emerald-300 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce delay-75"></div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-150"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </main>

      {/* Input Section */}
      <footer className="glass-panel p-2 rounded-2xl shadow-lg border border-emerald-100 mb-2">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <button 
            type="button"
            onClick={startVoice}
            className="w-12 h-12 flex items-center justify-center bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-all active:scale-95"
            title="Ovozli savol"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
          
          <input 
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Savolingizni yozing..."
            className="flex-1 bg-transparent py-3 px-4 outline-none text-emerald-950 font-medium"
          />

          <button 
            disabled={!inputValue.trim() || isTyping}
            className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all shadow-md ${
              !inputValue.trim() || isTyping 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-emerald-700 hover:bg-emerald-800 text-white active:scale-95'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </footer>

      {/* Additional UI Modals */}
      <DonationModal 
        isOpen={isDonationOpen} 
        onClose={() => setIsDonationOpen(false)} 
        language={language} 
      />
      
      {(appStatus === AppStatus.CONNECTING || appStatus === AppStatus.ACTIVE) && (
        <VoiceOverlay 
          status={appStatus as any} 
          onStop={stopVoice} 
        />
      )}
    </div>
  );
};

export default App;
