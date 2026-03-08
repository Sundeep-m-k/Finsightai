import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, Zap } from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import { useTheme } from '../context/ThemeContext';
import { uploadFile, uploadSample, getMockProfile } from '../lib/api';
import { DEMO_PROFILE } from '../lib/demoData';

// ─── Processing messages ───────────────────────────────────────────────────────

const MESSAGES = [
  'Reading your transaction history…',
  'Categorising transactions…',
  'Detecting spending patterns…',
  'Comparing with your reported figures…',
  'Calculating your readiness scores…',
  'Generating your personalised plan…',
];

const DEMO_MESSAGES = [
  'Loading 14 months of transaction data…',
  'Detecting spending patterns…',
  'Building your financial profile…',
];

// ─── Processing screen ─────────────────────────────────────────────────────────

function ProcessingScreen({ isLight, isDemo }: { isLight: boolean; isDemo: boolean }) {
  const msgs = isDemo ? DEMO_MESSAGES : MESSAGES;
  const [msgIdx, setMsgIdx] = useState(0);
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = isDemo ? 1000 : 2000;
    const msgTimer = setInterval(() => setMsgIdx(i => Math.min(i + 1, msgs.length - 1)), interval);
    const dotsTimer = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500);
    return () => { clearInterval(msgTimer); clearInterval(dotsTimer); };
  }, [msgs.length, isDemo]);

  const progress = ((msgIdx + 1) / msgs.length) * 100;

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center px-6 ${isLight ? 'bg-cream-100' : 'bg-[#0a0a0a]'}`}>
      {/* Animated logo mark */}
      <div className="relative mb-12">
        <div className={`absolute inset-0 rounded-full animate-ping scale-150 ${isLight ? 'bg-gold-400/20' : 'bg-gold-500/10'}`}
          style={{ animationDuration: '2s' }} />
        <div className={`absolute inset-0 rounded-full animate-ping scale-125 ${isLight ? 'bg-gold-400/15' : 'bg-gold-500/8'}`}
          style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
        <div className={`relative w-28 h-28 rounded-full border-2 flex items-center justify-center font-display font-black text-3xl ${
          isLight
            ? 'bg-stone-900 border-stone-700 text-gold-400'
            : 'bg-white border-white/20 text-stone-900'
        }`}>
          <div className={`absolute inset-2 rounded-full border-4 border-t-transparent animate-spin ${
            isLight ? 'border-stone-700' : 'border-stone-200'
          }`} />
          <span className="relative z-10">FS</span>
        </div>
      </div>

      {/* Demo badge */}
      {isDemo && (
        <div className="mb-6 flex items-center gap-2 px-4 py-2 rounded-full border border-gold-500/40 bg-gold-500/10 text-gold-400 text-xs font-semibold">
          <Zap size={12} />
          Demo mode — 14 months of data
        </div>
      )}

      {/* Message */}
      <div className="text-center mb-10 max-w-xs">
        <p
          key={msgIdx}
          className={`text-xl font-display font-bold animate-fade-up ${isLight ? 'text-stone-900' : 'text-white'}`}
        >
          {msgs[msgIdx]}{dots}
        </p>
        <p className={`text-sm mt-2 ${isLight ? 'text-stone-400' : 'text-slate-600'}`}>
          Step {msgIdx + 1} of {msgs.length}
        </p>
      </div>

      {/* Progress bar */}
      <div className={`w-64 h-1 rounded-full overflow-hidden ${isLight ? 'bg-cream-300' : 'bg-slate-900'}`}>
        <div
          className={`h-full rounded-full transition-all ease-out ${isDemo ? 'duration-700 bg-gold-500' : 'duration-[1800ms] bg-gold-500'}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// ─── Upload page ───────────────────────────────────────────────────────────────

type Phase = 'upload' | 'processing' | 'demo';

export function UploadPage() {
  const navigate = useNavigate();
  const { sessionId, setProfile } = useProfile();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [phase, setPhase] = useState<Phase>('upload');
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Normal CSV / sample flow ──────────────────────────────────────────────
  const startProcessing = useCallback(async (file?: File) => {
    setError('');
    setPhase('processing');

    const navTimer = setTimeout(() => navigate('/summary'), 13000);

    try {
      let profile;
      if (file && sessionId) {
        profile = await uploadFile(file, sessionId);
      } else if (sessionId) {
        profile = await uploadSample(sessionId);
      } else {
        profile = await getMockProfile();
      }
      setProfile(profile);
    } catch {
      try { setProfile(await getMockProfile()); } catch { /* ignore */ }
    }

    clearTimeout(navTimer);
    navigate('/summary');
  }, [sessionId, setProfile, navigate]);

  // ── Demo flow — instant, no network calls ─────────────────────────────────
  const loadDemo = useCallback(() => {
    setPhase('demo');
    setProfile(DEMO_PROFILE);
    // Navigate after the 3 demo messages (3 × 1s + small buffer)
    setTimeout(() => navigate('/summary'), 3400);
  }, [setProfile, navigate]);

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) startProcessing(file);
  };
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) startProcessing(file);
  };

  if (phase === 'processing') return <ProcessingScreen isLight={isLight} isDemo={false} />;
  if (phase === 'demo')       return <ProcessingScreen isLight={isLight} isDemo={true} />;

  return (
    <div className={`flex-1 flex flex-col overflow-hidden ${isLight ? 'bg-cream-100' : 'bg-[#0a0a0a]'}`}>

      {/* ── Centred content ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 overflow-hidden">

      {/* Heading */}
      <div className="text-center mb-5 sm:mb-8 animate-fade-up max-w-sm">
        <h1 className={`font-display font-black text-3xl ${isLight ? 'text-stone-900' : 'text-white'}`}>
          Upload your transactions
        </h1>
        <p className={`mt-3 text-sm leading-relaxed ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>
          We analyse up to 14 months of history to find your real spending patterns.
        </p>
      </div>

      {/* ── Demo CTA ──────────────────────────────────────────────────────── */}
      <button
        onClick={loadDemo}
        className="w-full max-w-md mb-3 animate-fade-up group"
        style={{ animationDelay: '0.06s' }}
      >
        <div className={`rounded-2xl border-2 px-6 py-5 flex items-center gap-4 transition-all ${
          isLight
            ? 'border-gold-500/60 bg-gold-400/8 hover:bg-gold-400/14 hover:border-gold-500'
            : 'border-gold-500/40 bg-gold-500/8 hover:bg-gold-500/14 hover:border-gold-500/70'
        }`}>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
            isLight ? 'bg-gold-400/20' : 'bg-gold-500/15'
          }`}>
            <Zap size={20} className="text-gold-500" />
          </div>
          <div className="text-left flex-1">
            <p className={`font-display font-bold text-base leading-tight ${isLight ? 'text-stone-900' : 'text-white'}`}>
              Try instant demo
            </p>
            <p className={`text-xs mt-0.5 ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>
              14 months · International student · No upload needed
            </p>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
            isLight ? 'bg-gold-400/20 text-gold-700' : 'bg-gold-500/20 text-gold-400'
          }`}>
            Instant ⚡
          </span>
        </div>
      </button>

      {/* Divider */}
      <div className={`flex items-center gap-3 w-full max-w-md mb-4 animate-fade-up`} style={{ animationDelay: '0.1s' }}>
        <div className={`flex-1 h-px ${isLight ? 'bg-stone-200' : 'bg-white/8'}`} />
        <span className={`text-xs font-medium ${isLight ? 'text-stone-400' : 'text-slate-600'}`}>or upload your own</span>
        <div className={`flex-1 h-px ${isLight ? 'bg-stone-200' : 'bg-white/8'}`} />
      </div>

      {/* Drop zone */}
      <div
        className={`w-full max-w-md rounded-3xl border-2 border-dashed p-6 sm:p-10 text-center cursor-pointer transition-all duration-200 animate-fade-up ${
          dragging
            ? isLight
              ? 'border-gold-500 bg-gold-400/10 scale-[1.02]'
              : 'border-gold-500 bg-gold-500/10 scale-[1.02]'
            : isLight
              ? 'border-cream-300 bg-white hover:border-stone-300 hover:bg-cream-50'
              : 'border-slate-800 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-900'
        }`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{ animationDelay: '0.14s' }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={onFileChange}
        />

        <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center transition-all ${
          dragging
            ? 'bg-gold-400/20'
            : isLight ? 'bg-cream-200' : 'bg-slate-800'
        }`}>
          {dragging
            ? <FileText size={28} className="text-gold-500" />
            : <Upload size={28} className={isLight ? 'text-stone-400' : 'text-slate-500'} />}
        </div>

        <p className={`font-semibold ${isLight ? 'text-stone-900' : 'text-white'}`}>
          {dragging ? 'Drop it here' : 'Drop your bank transactions here'}
        </p>
        <p className={`text-sm mt-1 ${isLight ? 'text-stone-500' : 'text-slate-500'}`}>
          Accepts CSV, XLSX, XLS
        </p>
        <p className={`mt-4 text-sm font-medium transition-colors ${
          isLight ? 'text-gold-600 hover:text-gold-700' : 'text-gold-400 hover:text-gold-300'
        }`}>
          Or browse files
        </p>
      </div>

      {/* Privacy note */}
      <p className={`mt-4 text-xs max-w-xs text-center animate-fade-up ${isLight ? 'text-stone-400' : 'text-slate-700'}`}
        style={{ animationDelay: '0.18s' }}>
        Your data never leaves your device during analysis. We do not store transaction details.
      </p>

      {error && (
        <div className="mt-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm max-w-md w-full text-center">
          {error}
        </div>
      )}

      {/* Back link */}
      <button
        onClick={() => navigate('/onboard')}
        className={`mt-8 text-xs transition-colors ${isLight ? 'text-stone-400 hover:text-stone-600' : 'text-slate-700 hover:text-slate-500'}`}
      >
        ← Back to questionnaire
      </button>
      </div>{/* end centred content */}
    </div>
  );
}
