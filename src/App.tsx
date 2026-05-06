import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  Cpu, 
  Settings, 
  ArrowLeft, 
  Send, 
  AlertCircle,
  Zap,
  ShieldCheck,
  Activity,
  Maximize2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { getPCDiagnostics } from './services/geminiService';

// --- Types ---
type View = 'welcome' | 'scan' | 'diagnosis';

interface Message {
  role: 'user' | 'model';
  text: string;
  image?: string;
}

export default function App() {
  const [view, setView] = useState<View>('welcome');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [customKey, setCustomKey] = useState(() => localStorage.getItem('GEMINI_KEY') || '');
  const [showSettings, setShowSettings] = useState(false);

  // --- Camera Logic ---
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAnalyzing]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const initCamera = async () => {
    try {
      // Clean up any old streams first
      stopCamera();

      const constraints = {
        video: {
          facingMode: (window.innerWidth < 768) ? { ideal: 'environment' } : 'user',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setView('scan');
    } catch (err) {
      console.error("Camera access failed:", err);
      alert("⚠️ Không thể mở Camera. Hãy đảm bảo bạn đã 'Cho phép' (Allow) quyền truy cập Camera trong cài đặt trình duyệt.");
    }
  };

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0);
    const base64Image = canvas.toDataURL('image/jpeg', 0.8);

    stopCamera();
    setView('diagnosis');
    
    await processDiagnosis(base64Image, "Hãy chẩn đoán hình ảnh phần cứng này.");
  };

  const processDiagnosis = async (image: string | null, text: string) => {
    const newUserMsg: Message = { role: 'user', text, image: image || undefined };
    setMessages(prev => [...prev, newUserMsg]);
    setIsAnalyzing(true);

    try {
      const history = messages.map(m => ({ role: m.role, text: m.text }));
      const response = await getPCDiagnostics(image, text, history, customKey);
      setMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'model', text: "⚠️ Lỗi kết nối AI: " + (err.message || "Vui lòng kiểm tra API Key.") }]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isAnalyzing) return;
    
    const text = inputText;
    setInputText('');
    processDiagnosis(null, text);
  };

  // --- Views ---

  const WelcomeView = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#00f2ff]/5 blur-[100px] rounded-full pointer-events-none"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center z-10"
      >
        <div className="w-24 h-24 glass rounded-3xl mx-auto flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(0,242,255,0.2)]">
          <Cpu size={48} className="text-[#00f2ff]" />
        </div>
        <h1 className="text-5xl font-bold tracking-tighter mb-4">
          PC <span className="text-[#00f2ff]">DOCTOR</span> <span className="text-xs align-top opacity-50 border border-white/20 px-2 rounded-full">AI v3</span>
        </h1>
        <p className="text-white/40 max-w-sm mx-auto mb-12 text-lg font-light leading-relaxed">
          Chẩn đoán phần cứng máy tính bằng thị giác máy tính và AI thế hệ mới nhất.
        </p>

        <button 
          onClick={initCamera}
          className="neo-button group flex items-center gap-3 mx-auto px-10 py-5 text-lg"
        >
          <Camera size={24} className="group-hover:scale-110 transition-transform" />
          Bắt đầu quét
        </button>

        <div className="mt-16 flex gap-12 opacity-30">
          <div className="flex flex-col items-center">
            <Zap size={20} />
            <span className="text-[10px] uppercase tracking-widest mt-2">Instant</span>
          </div>
          <div className="flex flex-col items-center">
            <ShieldCheck size={20} />
            <span className="text-[10px] uppercase tracking-widest mt-2">Secure</span>
          </div>
          <div className="flex flex-col items-center">
            <Activity size={20} />
            <span className="text-[10px] uppercase tracking-widest mt-2">Deep Scan</span>
          </div>
        </div>
      </motion.div>
    </div>
  );

  const ScanView = () => (
    <div className="flex-1 relative flex flex-col bg-black">
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        className="absolute inset-0 w-full h-full object-cover"
      />
      
      {/* HUD Elements */}
      <div className="viewfinder-corner top-left"></div>
      <div className="viewfinder-corner top-right"></div>
      <div className="viewfinder-corner bottom-left"></div>
      <div className="viewfinder-corner bottom-right"></div>
      
      <div className="absolute inset-0 bg-black/20 pointer-events-none">
        <div className="absolute top-1/2 left-0 w-full h-[2px] bg-[#00f2ff]/30 shadow-[0_0_15px_#00f2ff] animate-[scan-line_3s_linear_infinite]"></div>
      </div>

      <div className="absolute top-10 left-10 right-10 flex justify-between items-center z-20">
        <button onClick={() => { stopCamera(); setView('welcome'); }} className="p-3 glass rounded-full hover:bg-white/10 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="text-right">
          <div className="text-[10px] text-[#00f2ff] font-bold tracking-widest uppercase mb-1">Optical Analysis</div>
          <div className="text-white/40 text-xs font-mono">ID: AI_CORE_8273</div>
        </div>
      </div>

      <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center gap-8 z-20 px-8">
        <div className="glass p-4 rounded-2xl max-w-xs text-center">
          <p className="text-xs text-white/70">Hướng Camera vào khu vực linh kiện gặp vấn đề (tụ điện, đèn LED báo lỗi, dây nguồn...)</p>
        </div>
        
        <button 
          onClick={captureImage}
          className="w-20 h-20 rounded-full border-4 border-white/20 p-1 group relative transition-transform active:scale-95"
        >
          <div className="w-full h-full rounded-full bg-white group-hover:bg-[#00f2ff] transition-colors"></div>
          <div className="absolute -inset-4 border-2 border-[#00f2ff]/20 rounded-full animate-pulse"></div>
        </button>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );

  const DiagnosisView = () => (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0a0c10]">
      {/* Header */}
      <div className="p-6 glass border-x-0 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={() => setView('welcome')} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-sm font-semibold tracking-wide">PHÂN TÍCH HỆ THỐNG</h2>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] text-white/40 uppercase font-mono">Neural Core: Active</span>
            </div>
          </div>
        </div>
        <button onClick={() => setShowSettings(true)} className="p-2 glass rounded-lg text-white/40 hover:text-white transition-colors">
          <Settings size={20} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
        {messages.map((msg, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={idx} 
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <span className="text-[10px] text-white/20 font-bold tracking-widest uppercase mb-2">
              {msg.role === 'user' ? 'Operator' : 'AI Diagnostic'}
            </span>
            
            <div className={`max-w-[85%] rounded-2xl overflow-hidden ${msg.role === 'user' ? 'bg-[#1a1d26] border border-white/5' : 'bg-[#10141d] border-l-2 border-[#00f2ff] border-y border-r border-white/5'}`}>
              {msg.image && <img src={msg.image} className="w-full max-h-60 object-cover border-b border-white/10" />}
              <div className="p-4 text-sm leading-relaxed text-white/90 prose prose-invert prose-sm">
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>
            </div>
          </motion.div>
        ))}
        {isAnalyzing && (
          <div className="flex flex-col items-start gap-3">
             <span className="text-[10px] text-[#00f2ff] font-bold tracking-widest uppercase">Deep Analyzing...</span>
             <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-[#00f2ff] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-[#00f2ff] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-[#00f2ff] rounded-full animate-bounce"></div>
             </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleTextSubmit} className="p-6 glass border-x-0 border-b-0 flex gap-3 bg-black/40">
        <input 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Hỏi AI thêm về tình trạng này..."
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#00f2ff]/50 outline-none transition-colors"
        />
        <button type="submit" disabled={!inputText.trim() || isAnalyzing} className="p-3 bg-[#00f2ff] text-black rounded-xl hover:opacity-80 transition-all disabled:opacity-30">
          <Send size={20} />
        </button>
      </form>
    </div>
  );

  return (
    <div className="h-screen w-full flex flex-col bg-[#050608] text-white selection:bg-[#00f2ff]/30">
      <AnimatePresence mode="wait">
        {view === 'welcome' && <WelcomeView key="welcome" />}
        {view === 'scan' && <ScanView key="scan" />}
        {view === 'diagnosis' && <DiagnosisView key="diagnosis" />}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowSettings(false)}></div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass p-8 rounded-3xl max-w-sm w-full relative z-10"
            >
              <h3 className="text-xl font-bold mb-4">Cấu hình hệ thống</h3>
              <p className="text-xs text-white/40 mb-6">Nhập Gemini API Key cá nhân nếu bạn gặp lỗi kết nối server.</p>
              
              <input 
                type="password"
                placeholder="Dán API Key tại đây..."
                value={customKey}
                onChange={(e) => {
                  setCustomKey(e.target.value);
                  localStorage.setItem('GEMINI_KEY', e.target.value);
                }}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#00f2ff]/50 outline-none mb-6"
              />
              
              <button 
                onClick={() => setShowSettings(false)}
                className="w-full bg-white/10 hover:bg-white/20 py-3 rounded-xl text-sm font-semibold transition-colors"
              >
                Đóng
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
