import { useState, useRef, useEffect } from 'react';
import { useProfile } from '../context/ProfileContext';
import { useTheme } from '../context/ThemeContext';
import { sendChat } from '../lib/api';
import { CitationPills } from '../components/chat/CitationPills';
import type { Source } from 'shared/schemas/insight';
import { Send } from 'lucide-react';

type Message = { role: 'user' | 'assistant'; content: string; sources?: Source[] };

const c = (isLight: boolean, light: string, dark: string) => (isLight ? light : dark);

const STARTER_QUESTIONS = [
  'What should I prioritise with my money right now?',
  'How much emergency fund do I actually need?',
  'Should I pay off debt before investing?',
  'Why is my savings rate lower than I thought?',
  'What is lifestyle creep and am I experiencing it?',
  'How do I build wealth on a student income?',
];

const SOURCE_BADGES = [
  { label: 'CFPB Guidelines',  color: 'bg-blue-500/10 border-blue-500/20 text-blue-500' },
  { label: 'OpenStax Finance', color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' },
  { label: 'investor.gov',     color: 'bg-gold-500/10 border-gold-500/20 text-gold-500' },
  { label: 'Your data',        color: 'bg-stone-500/10 border-stone-500/20 text-stone-500' },
];

export function ChatPage() {
  const { profile } = useProfile();
  const { theme }   = useTheme();
  const isLight     = theme === 'light';

  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const message = (text ?? input).trim();
    if (!message || loading) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: message }]);
    setLoading(true);
    try {
      const res = await sendChat(message, profile, sessionId);
      setSessionId(res.session_id);
      setMessages((prev) => [...prev, { role: 'assistant', content: res.message, sources: res.sources }]);
    } catch (e) {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: `Something went wrong: ${e instanceof Error ? e.message : String(e)}`,
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  return (
    <div className="flex flex-col h-full py-4 sm:py-6">

      {/* ── Messages ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pb-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">

            {/* ── Main hook ─────────────────────────────────────────────── */}
            <div className="max-w-2xl w-full">
              <p
                className={`font-display font-black leading-[1.05] tracking-tight mb-4 ${c(isLight, 'text-stone-900', 'text-white')}`}
                style={{ fontSize: 'clamp(2.4rem, 6vw, 4rem)' }}
              >
                We don't hallucinate.<br />
                <span className="text-gold-500">We calculate.</span>
              </p>

              <p className={`text-base sm:text-lg leading-relaxed mb-2 max-w-xl mx-auto ${c(isLight, 'text-stone-600', 'text-slate-400')}`}>
                Most AI makes things up. Every answer here is grounded in your{' '}
                <span className={`font-semibold ${c(isLight, 'text-stone-800', 'text-white')}`}>actual transaction data</span>,
                peer-reviewed financial research, and government guidelines.
              </p>
              <p className={`text-sm italic mb-8 ${c(isLight, 'text-stone-400', 'text-slate-600')}`}>
                Ask something uncomfortable. We'll tell you the truth.
              </p>

              {/* Source badges */}
              <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
                {SOURCE_BADGES.map((b) => (
                  <span
                    key={b.label}
                    className={`px-2.5 py-1 rounded-full border text-xs font-semibold ${b.color}`}
                  >
                    {b.label}
                  </span>
                ))}
              </div>

              {/* Starter questions — 2-col, bigger */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
                {STARTER_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    className={`px-4 py-3.5 rounded-xl border text-sm font-medium text-left transition-all leading-snug ${
                      c(isLight,
                        'border-stone-200 bg-white text-stone-700 hover:border-stone-400 hover:bg-stone-50',
                        'border-white/8 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:bg-white/[0.06]',
                      )
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? c(isLight, 'bg-stone-900 text-stone-50', 'bg-white/10 border border-white/15 text-white')
                    : c(isLight,
                        'bg-white border border-stone-200 text-stone-700',
                        'bg-white/[0.03] border border-white/8 text-slate-200',
                      )
                }`}>
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  {m.sources && m.sources.length > 0 && <CitationPills sources={m.sources} />}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className={`rounded-2xl border px-4 py-3 flex items-center gap-2 ${
                  c(isLight, 'bg-white border-stone-200', 'bg-white/[0.03] border-white/8')
                }`}>
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full animate-bounce ${c(isLight, 'bg-stone-400', 'bg-white/30')}`}
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                  <span className={`text-sm ${c(isLight, 'text-stone-400', 'text-slate-500')}`}>Calculating…</span>
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ────────────────────────────────────────────────────────────── */}
      <div className={`border-t pt-4 ${c(isLight, 'border-stone-200', 'border-white/8')}`}>
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your finances…"
            className={`flex-1 rounded-xl border px-4 py-3 text-sm focus:outline-none transition-colors ${
              c(isLight,
                'border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 focus:border-stone-400',
                'border-white/8 bg-white/[0.03] text-white placeholder:text-white/25 focus:border-white/20',
              )
            }`}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shrink-0 disabled:opacity-30 disabled:cursor-not-allowed ${
              c(isLight,
                'bg-stone-900 text-stone-50 hover:bg-stone-700',
                'bg-white text-stone-900 hover:bg-cream-100',
              )
            }`}
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
