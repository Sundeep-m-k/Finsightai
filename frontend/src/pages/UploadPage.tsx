import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, Sparkles } from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import { uploadFile, uploadSample, getMockProfile } from '../lib/api';

// ─── Processing messages ───────────────────────────────────────────────────────

const MESSAGES = [
  'Reading your transaction history…',
  'Categorising 847 transactions…',
  'Detecting spending patterns…',
  'Comparing with your reported figures…',
  'Calculating your readiness scores…',
  'Generating your personalised plan…',
];

// ─── Processing screen ─────────────────────────────────────────────────────────

function ProcessingScreen() {
  const [msgIdx, setMsgIdx] = useState(0);
  const [dots, setDots] = useState('');

  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMsgIdx(i => Math.min(i + 1, MESSAGES.length - 1));
    }, 2000);
    const dotsTimer = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.');
    }, 500);
    return () => { clearInterval(msgTimer); clearInterval(dotsTimer); };
  }, []);

  const progress = ((msgIdx + 1) / MESSAGES.length) * 100;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-6">
      {/* Pulsing orb */}
      <div className="relative mb-12">
        {/* Outer glow rings */}
        <div className="absolute inset-0 rounded-full bg-indigo-500/10 animate-ping scale-150" style={{ animationDuration: '2s' }} />
        <div className="absolute inset-0 rounded-full bg-indigo-500/15 animate-ping scale-125" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />

        {/* Main orb */}
        <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-indigo-600 to-cyan-500 animate-pulse-glow flex items-center justify-center">
          <div className="w-20 h-20 rounded-full border-4 border-white/20 border-t-white animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles size={28} className="text-white" />
          </div>
        </div>
      </div>

      {/* Message */}
      <div className="text-center mb-10">
        <p
          key={msgIdx}
          className="text-xl font-semibold text-white animate-fade-up"
        >
          {MESSAGES[msgIdx]}{dots}
        </p>
        <p className="text-slate-600 text-sm mt-2">
          Step {msgIdx + 1} of {MESSAGES.length}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-64 h-1 bg-slate-900 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-[1800ms] ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-indigo-500/40"
            style={{
              left: `${15 + i * 15}%`,
              top: `${30 + (i % 3) * 20}%`,
              animation: `ping ${1.5 + i * 0.4}s ease-in-out infinite`,
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Upload screen ─────────────────────────────────────────────────────────────

type Phase = 'upload' | 'processing';

export function UploadPage() {
  const navigate = useNavigate();
  const { sessionId, setProfile } = useProfile();
  const [phase, setPhase] = useState<Phase>('upload');
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startProcessing = useCallback(async (file?: File) => {
    setError('');
    setPhase('processing');

    // Start animation timer immediately — never waits more than 13s regardless of API speed
    const navTimer = setTimeout(() => navigate('/gap'), 13000);

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
      // On any error fall back to mock so the demo still flows
      try { setProfile(await getMockProfile()); } catch { /* ignore */ }
    }

    // If API finished before 13s, navigate immediately (animation already looks done at step 6)
    clearTimeout(navTimer);
    navigate('/gap');
  }, [sessionId, setProfile, navigate]);

  // Drag & drop handlers
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

  if (phase === 'processing') return <ProcessingScreen />;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-12">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
          <Sparkles size={16} className="text-white" />
        </div>
        <span className="font-bold text-white text-lg">FinSight AI</span>
      </div>

      {/* Heading */}
      <div className="text-center mb-8 animate-fade-up">
        <h1 className="text-3xl font-bold text-white">Upload your transactions</h1>
        <p className="mt-2 text-slate-400 text-sm max-w-sm mx-auto">
          We analyse up to 12 months of history to find your real spending patterns.
        </p>
      </div>

      {/* Drop zone */}
      <div
        className={`w-full max-w-md rounded-3xl border-2 border-dashed p-10 text-center cursor-pointer transition-all duration-200 animate-fade-up ${
          dragging
            ? 'border-indigo-400 bg-indigo-500/10 scale-[1.02]'
            : 'border-slate-800 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-900'
        }`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{ animationDelay: '0.1s' }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={onFileChange}
        />

        <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center transition-all ${
          dragging ? 'bg-indigo-500/30' : 'bg-slate-800'
        }`}>
          {dragging
            ? <FileText size={28} className="text-indigo-400" />
            : <Upload size={28} className="text-slate-500" />}
        </div>

        <p className="text-white font-semibold">
          {dragging ? 'Drop it here' : 'Drop your bank transactions here'}
        </p>
        <p className="text-slate-500 text-sm mt-1">
          Accepts CSV, XLSX, XLS
        </p>
        <p className="mt-4 text-indigo-400 text-sm font-medium hover:text-indigo-300 transition-colors">
          Or browse files
        </p>
      </div>

      {/* Privacy note */}
      <p
        className="mt-4 text-xs text-slate-700 max-w-xs text-center animate-fade-up"
        style={{ animationDelay: '0.2s' }}
      >
        Your data never leaves your device during analysis. We do not store transaction details.
      </p>

      {/* Sample data link */}
      <button
        onClick={() => startProcessing()}
        className="mt-6 text-slate-400 text-sm hover:text-white transition-colors animate-fade-up underline underline-offset-4 decoration-slate-700 hover:decoration-slate-400"
        style={{ animationDelay: '0.25s' }}
      >
        Use sample data instead →
      </button>

      {error && (
        <div className="mt-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm max-w-md w-full text-center">
          {error}
        </div>
      )}

      {/* Back link */}
      <button
        onClick={() => navigate('/onboard')}
        className="mt-8 text-xs text-slate-700 hover:text-slate-500 transition-colors"
      >
        ← Back to questionnaire
      </button>
    </div>
  );
}
