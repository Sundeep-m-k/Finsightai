import { Link } from 'react-router-dom';
import { TrendingUp, Shield, MessageCircle, ChevronRight, Sparkles } from 'lucide-react';

const features = [
  {
    icon: Shield,
    title: 'Know your real spending',
    desc: 'Upload your bank transactions. We reveal the gap between what you think you spend and what you actually spend.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10 border-cyan-400/20',
  },
  {
    icon: TrendingUp,
    title: 'Get your readiness scores',
    desc: 'Two scores — Saving Readiness and Investment Readiness — tell you exactly where you stand and what to fix first.',
    color: 'text-indigo-400',
    bg: 'bg-indigo-400/10 border-indigo-400/20',
  },
  {
    icon: MessageCircle,
    title: 'Chat with your AI mentor',
    desc: 'Ask anything. Get cited answers from CFPB, OpenStax, and investor.gov — not generic advice.',
    color: 'text-violet-400',
    bg: 'bg-violet-400/10 border-violet-400/20',
  },
];

const stats = [
  { value: '8', label: 'Questions to start' },
  { value: '90', label: 'Day action plan' },
  { value: '100%', label: 'Free for students' },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Nav */}
      <nav className="px-6 py-4 flex items-center justify-between border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
            <Sparkles size={14} className="text-white" />
          </div>
          <span className="font-bold text-white tracking-tight">FinSight AI</span>
        </div>
        <Link to="/onboard" className="text-sm text-slate-400 hover:text-white transition-colors">
          Get started →
        </Link>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-medium mb-8 animate-fade-up">
          <Sparkles size={12} />
          Built for college students
        </div>

        <h1
          className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.05] tracking-tight max-w-3xl animate-fade-up"
          style={{ animationDelay: '0.06s' }}
        >
          Your money,{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-cyan-400 to-violet-400 bg-clip-text text-transparent">
            finally honest
          </span>
        </h1>

        <p
          className="mt-6 text-lg text-slate-400 max-w-xl leading-relaxed animate-fade-up"
          style={{ animationDelay: '0.12s' }}
        >
          FinSight AI analyses your real transaction history, exposes hidden spending gaps,
          and gives you a personalized 90-day plan backed by real financial research.
        </p>

        <div
          className="mt-10 flex flex-col sm:flex-row gap-3 animate-fade-up"
          style={{ animationDelay: '0.18s' }}
        >
          <Link
            to="/onboard"
            className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-semibold hover:from-indigo-500 hover:to-cyan-500 transition-all shadow-lg shadow-indigo-500/25"
          >
            Get my financial picture
            <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white transition-colors"
          >
            Try with sample data
          </Link>
        </div>

        {/* Stats */}
        <div
          className="mt-16 grid grid-cols-3 gap-8 sm:gap-16 animate-fade-up"
          style={{ animationDelay: '0.24s' }}
        >
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-black text-white">{s.value}</div>
              <div className="text-xs text-slate-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="px-6 pb-20 max-w-4xl mx-auto w-full">
        <div className="grid sm:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`rounded-2xl border p-5 ${f.bg} animate-fade-up`}
              style={{ animationDelay: `${0.3 + i * 0.08}s` }}
            >
              <f.icon size={22} className={f.color} />
              <h3 className="mt-3 font-semibold text-white text-sm">{f.title}</h3>
              <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="pb-6 text-center text-xs text-slate-700">
        Not financial advice · Sources: CFPB, OpenStax, investor.gov
      </div>
    </div>
  );
}
