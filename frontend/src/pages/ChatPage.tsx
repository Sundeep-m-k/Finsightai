import { useState, useRef, useEffect } from 'react';
import { useProfile } from '../context/ProfileContext';
import { useTheme } from '../context/ThemeContext';
import { sendChat } from '../lib/api';
import { CitationPills } from '../components/chat/CitationPills';
import type { Source } from 'shared/schemas/insight';
import { Send } from 'lucide-react';

type Message = { role: 'user' | 'assistant'; content: string; sources?: Source[] };

const STARTER_QUESTIONS = [
  'What should I focus on first?',
  'How do I build an emergency fund?',
  'Should I pay debt or invest first?',
  'What does my savings rate mean?',
];

export function ChatPage() {
  const { profile } = useProfile();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.message, sources: res.sources },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Something went wrong: ${e instanceof Error ? e.message : String(e)}`,
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 8rem)' }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <p className={`font-display font-black text-3xl mb-2 ${isLight ? 'text-stone-900' : 'text-white'}`}>
              Ask your mentor.
            </p>
            <p className={`text-sm max-w-xs mb-8 ${isLight ? 'text-stone-500' : 'text-slate-500'}`}>
              Answers cited from CFPB, OpenStax, and investor.gov — not generic advice.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
              {STARTER_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className={`text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                    isLight
                      ? 'border-cream-300 bg-white text-stone-700 hover:border-stone-300 hover:bg-cream-50'
                      : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-600 hover:bg-slate-900'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                m.role === 'user'
                  ? isLight
                    ? 'bg-stone-900 text-white'
                    : 'bg-slate-700 text-white'
                  : isLight
                    ? 'bg-white border border-cream-300 text-stone-700'
                    : 'bg-slate-900 border border-slate-800 text-slate-200'
              }`}
            >
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</p>
              {m.sources && m.sources.length > 0 && (
                <CitationPills sources={m.sources} />
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className={`rounded-2xl border px-4 py-3 flex items-center gap-2 ${
              isLight ? 'bg-white border-cream-300' : 'bg-slate-900 border-slate-800'
            }`}>
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full animate-bounce ${
                      isLight ? 'bg-stone-400' : 'bg-slate-500'
                    }`}
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              <span className={`text-sm ${isLight ? 'text-stone-400' : 'text-slate-500'}`}>
                Thinking…
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className={`border-t pt-4 ${isLight ? 'border-cream-300' : 'border-slate-800'}`}>
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your finances…"
            className={`flex-1 rounded-xl border px-4 py-3 text-sm focus:outline-none transition-colors ${
              isLight
                ? 'border-cream-300 bg-white text-stone-900 placeholder:text-stone-400 focus:border-stone-400'
                : 'border-slate-700 bg-slate-900 text-white placeholder:text-slate-600 focus:border-slate-500'
            }`}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
              isLight
                ? 'bg-stone-900 text-white hover:bg-stone-700'
                : 'bg-slate-700 text-white hover:bg-slate-600'
            }`}
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
