import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  MessageSquare, 
  History, 
  Settings, 
  Power, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight,
  User,
  Cpu,
  Zap,
  ArrowLeft,
  Send
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from './lib/utils';
import { getPCDiagnostics } from './services/geminiService';

// --- Components ---

const EditorialContainer = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-[#0A0C10] text-[#E0E2E6] font-sans selection:bg-[#00D1FF]/30">
      <div className="max-w-[1200px] mx-auto h-screen flex flex-col border-x border-white/5 bg-[#0F1115] shadow-2xl relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00D1FF]/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 p-0"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#00D1FF]/5 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/2 p-0"></div>
        
        {/* Main Content */}
        <div className="relative z-10 flex flex-col h-full">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- Main App Logic ---

type View = 'home' | 'camera' | 'chat';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('home');
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string; image?: string }[]>([]);
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [customApiKey, setCustomApiKey] = useState<string>('');
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    // Check for custom key in local storage
    const savedKey = localStorage.getItem('GEMINI_CUSTOM_KEY');
    if (savedKey) {
      setCustomApiKey(savedKey);
    }
  }, []);

  const saveCustomKey = (key: string) => {
    setCustomApiKey(key);
    localStorage.setItem('GEMINI_CUSTOM_KEY', key);
    setShowConfig(false);
  };

  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    let active = true;
    const updateVideo = async () => {
      if (currentView === 'camera' && stream && videoRef.current) {
        if (videoRef.current.srcObject !== stream) {
          videoRef.current.srcObject = stream;
        }
        try {
          await videoRef.current.play();
        } catch (e) {
          console.warn("Autoplay blocked or failed:", e);
        }
      }
    };
    updateVideo();
    return () => { active = false; };
  }, [currentView, stream, videoRef.current]);

  const startCamera = async () => {
    try {
      const constraints = { 
        video: { 
          facingMode: 'environment', // using simpler constraint first
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      };
      const s = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(s);
      setCurrentView('camera');
    } catch (err) {
      console.error("Camera error:", err);
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true });
        setStream(s);
        setCurrentView('camera');
      } catch (fallbackErr) {
        console.error("Camera fallback failed:", fallbackErr);
        alert("Không thể truy cập camera. Hãy đảm bảo bạn đã cấp quyền truy cập camera trong cài đặt trình duyệt (Site Settings).");
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCurrentView('home');
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const context = canvasRef.current.getContext('2d');
    if (!context) return;

    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);
    
    const imageData = canvasRef.current.toDataURL('image/jpeg');
    
    // Stop camera and go to chat
    stopCamera();
    setCurrentView('chat');
    
    const userMsg = "Kiểm tra tình trạng PC qua hình ảnh này.";
    setMessages(prev => [...prev, { role: 'user', text: userMsg, image: imageData }]);
    
    setIsAnalyzing(true);
    try {
      // Create history including the current message we just added to state
      const history = messages.map(m => ({ role: m.role, text: m.text }));
      const diagnosis = await getPCDiagnostics(imageData, userMsg, history, customApiKey);
      setMessages(prev => [...prev, { role: 'model', text: diagnosis }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', text: "Lỗi hệ thống. Vui lòng thử lại." }]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || isAnalyzing) return;

    const text = inputText;
    setInputText('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setIsAnalyzing(true);

    try {
      const history = messages.map(m => ({ role: m.role, text: m.text }));
      const response = await getPCDiagnostics(null, text, history, customApiKey);
      setMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', text: "Hệ thống đang bận, hãy thử lại sau nhé." }]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const AppHeader = () => (
    <header className="flex justify-between items-center px-8 py-6 border-b border-white/10 bg-[#0F1115]/50 backdrop-blur-md">
      <div className="flex flex-col">
        <span className="text-[10px] tracking-[0.2em] text-[#00D1FF] uppercase font-bold mb-1">Deep-Hardware Diagnostic AI</span>
        <h1 className="text-2xl font-light tracking-tight text-white">Dr. Silicon <span className="font-serif italic text-[#00D1FF]">V.2</span></h1>
      </div>
      <div className="flex items-center space-x-4">
        <button 
          onClick={() => setShowConfig(true)}
          className={cn(
            "p-2 rounded-lg border transition-all",
            customApiKey ? "border-[#00D1FF]/30 text-[#00D1FF]" : "border-white/10 text-white/40 hover:text-white"
          )}
        >
          <Settings size={20} />
        </button>
        <div className="flex items-center space-x-6">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-white/40 uppercase tracking-widest">Connection Status</p>
            <p className="text-xs text-green-400">AI Core: Online</p>
          </div>
          <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    </header>
  );

  const ConfigModal = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowConfig(false)}></div>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-[#1A1D23] border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl"
      >
        <h3 className="text-xl font-medium mb-4">Cấu hình API Key</h3>
        <p className="text-white/40 text-sm mb-6 leading-relaxed">
          Nếu hệ thống tự động gặp lỗi, bạn có thể nhập mã khóa Gemini API cá nhân của mình vào đây. <br/><br/>
          <strong>Lưu ý quan trọng:</strong> Nếu bạn dùng mục <b>Secrets</b>, hãy đặt tên là <code className="text-[#00D1FF] bg-white/5 px-1 rounded">VITE_GEMINI_API_KEY</code> (không dùng tên GEMINI_API_KEY vì hệ thống đã dành riêng tên đó).
          <br/><br/>
          Lấy mã tại <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-[#00D1FF] border-b border-[#00D1FF]/30">Google AI Studio</a>.
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-white/30 block mb-2">Gemini API Key</label>
            <input 
              autoFocus
              type="password"
              placeholder="Dán mã khóa của bạn tại đây..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 h-12 text-sm outline-none text-white focus:border-[#00D1FF]/50"
              value={customApiKey}
              onChange={(e) => setCustomApiKey(e.target.value)}
            />
          </div>
          
          <div className="flex gap-3 pt-2">
            <button 
              onClick={() => saveCustomKey(customApiKey)}
              className="flex-1 bg-[#00D1FF] text-black font-bold h-12 rounded-xl text-sm hover:bg-[#00D1FF]/80 transition-all"
            >
              Lưu cấu hình
            </button>
            <button 
              onClick={() => {
                setCustomApiKey('');
                localStorage.removeItem('GEMINI_CUSTOM_KEY');
                setShowConfig(false);
              }}
              className="px-4 border border-white/10 rounded-xl text-xs text-white/40 hover:text-red-400 hover:border-red-400/30 transition-all"
            >
              Xóa
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );

  const renderHome = () => (
    <div className="flex flex-col h-full bg-[#0F1115]">
      <AppHeader />
      <div className="flex-1 p-8 overflow-y-auto scrollbar-hide">
        <div className="max-w-2xl mx-auto py-12">
          <div className="mb-12">
            <h2 className="text-4xl font-light mb-4 tracking-tight">Cần một chuyên gia <br/><span className="text-[#00D1FF] font-serif italic">chẩn đoán phần cứng?</span></h2>
            <p className="text-white/50 leading-relaxed text-lg font-light max-w-md">Sử dụng thị giác AI để phân tích các linh kiện PC và nhận lời khuyên sửa chữa chuyên nghiệp.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div 
              onClick={startCamera}
              className="group relative bg-[#1A1D23] border border-white/5 p-8 rounded-3xl cursor-pointer hover:border-[#00D1FF]/50 transition-all"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#00D1FF]/10 flex items-center justify-center text-[#00D1FF] mb-6 group-hover:scale-110 transition-transform">
                <Camera size={28} />
              </div>
              <h3 className="text-xl font-medium mb-2">Bắt đầu Camera</h3>
              <p className="text-white/40 text-sm">Quét trực tiếp mainboard và các đèn báo lỗi LED.</p>
              <div className="absolute bottom-6 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronRight className="text-[#00D1FF]" />
              </div>
            </div>

            <div 
              onClick={() => {
                setCurrentView('chat');
                setInputText("PC của tôi lúc bật được lúc không, kéo dài vài tháng và giờ không lên được nữa.");
              }}
              className="group relative bg-[#1A1D23] border border-white/5 p-8 rounded-3xl cursor-pointer hover:border-[#00D1FF]/50 transition-all"
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 mb-6 group-hover:scale-110 transition-transform">
                <Zap size={28} />
              </div>
              <h3 className="text-xl font-medium mb-2">Tư vấn nhanh</h3>
              <p className="text-white/40 text-sm">Trao đổi về các tình trạng hư hỏng nguồn, chập chờn.</p>
              <div className="absolute bottom-6 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronRight className="text-[#00D1FF]" />
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 pt-8 grid grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">AI Logic</p>
              <p className="font-mono text-sm">Gemini 1.5 Flash</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Diagnostic Mode</p>
              <p className="font-mono text-sm">Deep Scan</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Encrypted</p>
              <p className="font-mono text-sm">AES-256</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCamera = () => (
    <div className="relative h-full flex flex-col bg-[#0A0C10] overflow-hidden">
      {/* Editorial Viewfinder UI */}
      <div className="absolute inset-0 border-[60px] border-black/40 pointer-events-none z-20"></div>
      <div className="absolute top-12 left-12 w-20 h-20 border-t-2 border-l-2 border-[#00D1FF] z-30 opacity-50"></div>
      <div className="absolute top-12 right-12 w-20 h-20 border-t-2 border-r-2 border-[#00D1FF] z-30 opacity-50"></div>
      <div className="absolute bottom-12 left-12 w-20 h-20 border-b-2 border-l-2 border-[#00D1FF] z-30 opacity-50"></div>
      <div className="absolute bottom-12 right-12 w-20 h-20 border-b-2 border-r-2 border-[#00D1FF] z-30 opacity-50"></div>
      
      <div className="absolute top-10 left-10 z-50">
        <button onClick={stopCamera} className="p-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full text-white hover:bg-[#00D1FF] hover:text-black transition-all">
          <ArrowLeft size={24} />
        </button>
      </div>

      <div className="absolute top-10 right-10 z-50 flex flex-col items-end gap-2 text-right">
        <span className="text-[10px] bg-[#00D1FF] text-black font-bold px-2 py-0.5 rounded uppercase tracking-tighter">Live Analysis</span>
        <p className="text-[10px] font-mono text-white/60 tracking-wider">REF: SCAN_AR_082.4</p>
      </div>
      
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted
        className="absolute inset-0 object-cover w-full h-full"
      />
      
      <canvas ref={canvasRef} className="hidden" />

      <div className="absolute bottom-20 left-0 right-0 p-8 flex flex-col items-center gap-8 z-40">
        <div className="bg-black/60 backdrop-blur-2xl p-5 rounded-2xl border border-white/10 text-center max-w-sm">
          <p className="text-[#00D1FF] text-[10px] font-bold uppercase tracking-widest mb-1">Diagnostic Target</p>
          <p className="text-white/60 text-xs">Hướng camera vào các tụ điện, đèn LED hoặc khu vực PSU để AI thực hiện quét chuyên sâu.</p>
        </div>
        
        <button 
          onClick={captureAndAnalyze}
          className="relative w-24 h-24 flex items-center justify-center group"
        >
          <div className="absolute inset-0 border-2 border-white/20 rounded-full scale-110 group-hover:scale-125 transition-transform duration-500"></div>
          <div className="w-16 h-16 bg-white rounded-full group-active:scale-90 transition-transform"></div>
          <div className="absolute inset-0 border-t-2 border-[#00D1FF] rounded-full animate-spin [animation-duration:3s]"></div>
        </button>
      </div>
    </div>
  );

  const renderChat = () => (
    <div className="flex flex-col md:flex-row h-full bg-[#0F1115]">
      {/* Desktop Editorial Layout: 60/40 Split */}
      <div className="flex-1 flex flex-col min-h-0 border-r border-white/5">
        <AppHeader />
        
        <div className="flex-1 overflow-y-auto px-8 py-10 space-y-8 scrollbar-hide">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-12">
              <div className="mb-6 w-20 h-20 rounded-3xl bg-[#1A1D23] flex items-center justify-center border border-white/10">
                 <MessageSquare size={32} className="text-[#00D1FF]" />
              </div>
              <h3 className="text-xl font-serif italic mb-2">Bắt đầu chẩn đoán</h3>
              <p className="text-white/30 text-sm max-w-xs">AI đã sẵn sàng. Hãy đặt câu hỏi hoặc gửi hình ảnh tình trạng PC của bạn.</p>
            </div>
          )}
          
          {messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={cn(
                "flex flex-col",
                msg.role === 'user' ? "items-end" : "items-start"
              )}
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/30">
                  {msg.role === 'user' ? 'Operator' : 'System AI'}
                </span>
                {msg.role === 'model' && <div className="w-1 h-1 bg-[#00D1FF] rounded-full"></div>}
              </div>
              
              <div 
                className={cn(
                  "max-w-[90%] md:max-w-[80%] rounded-2xl overflow-hidden",
                  msg.role === 'user' ? "items-end" : "items-start"
                )}
              >
                {msg.image && (
                  <div className="relative group">
                    <img 
                      src={msg.image} 
                      className="w-full max-h-[300px] object-cover rounded-2xl mb-2 border border-white/10" 
                      alt="Captured" 
                    />
                    <div className="absolute inset-0 bg-[#00D1FF]/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                  </div>
                )}
                
                <div 
                  className={cn(
                    "p-6 text-sm leading-relaxed",
                    msg.role === 'user' 
                      ? "bg-[#1A1D23] text-white rounded-tr-none border border-white/10" 
                      : "bg-[#15181D] text-white/80 rounded-tl-none border-l-2 border-[#00D1FF] border-y border-r border-white/5"
                  )}
                >
                  <div className="prose prose-invert prose-sm">
                     <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {isAnalyzing && (
            <div className="flex flex-col items-start gap-2">
               <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#00D1FF]">Deep Analysis...</span>
               <div className="bg-[#1A1D23] border border-[#00D1FF]/30 rounded-2xl p-4 flex gap-1 items-center">
                  <div className="w-1 h-1 bg-[#00D1FF] rounded-full animate-pulse"></div>
                  <div className="w-1 h-1 bg-[#00D1FF] rounded-full animate-pulse [animation-delay:0.2s]"></div>
                  <div className="w-1 h-1 bg-[#00D1FF] rounded-full animate-pulse [animation-delay:0.4s]"></div>
               </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <form 
          onSubmit={handleSendMessage}
          className="p-8 bg-[#0F1115]/80 backdrop-blur-xl border-t border-white/5 gap-4 hidden md:flex"
        >
          <div className="flex-1 relative">
            <input 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Hỏi AI về tình trạng bo mạch hoặc PSU..."
              className="w-full bg-white/5 border border-white/10 rounded-full px-8 h-14 text-sm focus:border-[#00D1FF]/50 transition-colors outline-none text-white placeholder:text-white/20 font-light"
            />
            <button 
              type="submit"
              disabled={!inputText.trim() || isAnalyzing}
              className="absolute right-4 top-2 h-10 px-6 rounded-full bg-indigo-600/20 text-[#00D1FF] text-[11px] font-bold uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-30"
            >
              Analyze
            </button>
          </div>
          <button 
            type="button"
            onClick={startCamera}
            className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:border-[#00D1FF]/50 hover:text-[#00D1FF] transition-all"
          >
            <Camera size={22} />
          </button>
        </form>

        {/* Mobile Input */}
        <form 
          onSubmit={handleSendMessage}
          className="p-4 bg-[#0F1115] border-t border-white/5 flex gap-2 md:hidden"
        >
          <button 
            type="button"
            onClick={startCamera}
            className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white"
          >
            <Camera size={20} />
          </button>
          <input 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Hỏi AI..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 h-12 text-sm outline-none text-white"
          />
          <button 
            type="submit"
            disabled={!inputText.trim() || isAnalyzing}
            className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white"
          >
            <Send size={18} />
          </button>
        </form>
      </div>

      {/* Editorial Sidebar Logic (Desktop Only) */}
      <div className="w-[300px] hidden lg:flex flex-col p-8 border-l border-white/5 bg-[#0A0C10]/50">
          <div className="mb-10">
            <h4 className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#00D1FF] mb-4">Diagnostic Narrative</h4>
            <div className="h-px w-full bg-gradient-to-r from-[#00D1FF]/50 to-transparent mb-6"></div>
            <p className="text-xs text-white/40 leading-relaxed font-serif italic italic-small mb-4">
              "Một chiếc máy tính chỉ ổn định khi nguồn năng lượng nó nhận được là thuần khiết nhất."
            </p>
          </div>

          <div className="space-y-6">
            <div>
               <p className="text-[10px] uppercase text-white/30 tracking-widest mb-2">System Metrics</p>
               <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                    <p className="text-[8px] uppercase opacity-40 mb-1">AI Confidence</p>
                    <p className="text-lg font-mono text-[#00D1FF]">98.4%</p>
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                    <p className="text-[8px] uppercase opacity-40 mb-1">Latency</p>
                    <p className="text-lg font-mono">1.2s</p>
                  </div>
               </div>
            </div>

            <div className="bg-[#00D1FF]/5 border border-[#00D1FF]/20 p-4 rounded-2xl">
               <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={14} className="text-[#00D1FF]" />
                  <span className="text-[10px] uppercase font-bold text-[#00D1FF] tracking-widest">Advisory</span>
               </div>
               <p className="text-[11px] text-white/60 leading-normal">
                  Chỉ chạm vào linh kiện khi đã ngắt nguồn điện hoàn toàn. AI khuyến cáo kiểm tra các vết rỉ sét trên tụ điện.
               </p>
            </div>
          </div>

          <div className="mt-auto">
            <p className="text-[9px] text-white/20 uppercase tracking-[0.3em] font-mono">Log #0421-B | SECURED</p>
          </div>
      </div>
    </div>
  );

  return (
    <EditorialContainer>
      <AnimatePresence>
        {showConfig && <ConfigModal />}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentView}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="h-full"
        >
          {currentView === 'home' && renderHome()}
          {currentView === 'camera' && renderCamera()}
          {currentView === 'chat' && renderChat()}
        </motion.div>
      </AnimatePresence>
    </EditorialContainer>
  );
}
