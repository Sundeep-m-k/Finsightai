import { Link } from 'react-router-dom';
import { ChevronRight, Trophy } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { ThemeToggle } from '../components/common/ThemeToggle';

// ─── Team data ─────────────────────────────────────────────────────────────────

const team = [
  {
    name: 'Sundeep Muthukrishnan Kumaraswamy',
    degree: 'MS in Computer Science',
    advisor: 'Prof. Sujoy Sikdar',
  },
  {
    name: 'Niranjan Kumar Kishore Kumar',
    degree: 'PhD in Computer Science',
    advisor: 'Prof. Nancy L. Guo',
  },
  {
    name: 'Sohini Mandal',
    degree: 'PhD in Computer Science',
    advisor: 'Prof. Monika Roznere',
  },
];

// ─── Features ──────────────────────────────────────────────────────────────────

const features = [
  {
    num: '01',
    title: 'We read your bank data, not your vibes.',
    desc: 'Upload a CSV of your transactions. We compare what you told us against what your bank says — and surface the gap, category by category.',
  },
  {
    num: '02',
    title: 'We score you, not shame you.',
    desc: 'Two numbers: Saving Readiness and Investment Readiness. Honest, specific, and fixable — not a generic credit score.',
  },
  {
    num: '03',
    title: 'We cite sources, not opinions.',
    desc: 'Every recommendation links back to CFPB, OpenStax, or investor.gov. If we say it, we can back it up.',
  },
];

// ─── Landing page ──────────────────────────────────────────────────────────────

export function LandingPage() {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  return (
    <div className={`min-h-screen flex flex-col font-sans ${
      isLight ? 'bg-cream-100 text-stone-900' : 'bg-[#0a0a0a] text-white'
    }`}>

      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <nav className={`px-6 py-4 flex items-center justify-between sticky top-0 z-20 backdrop-blur-sm border-b ${
        isLight
          ? 'bg-cream-100/90 border-cream-300'
          : 'bg-[#0a0a0a]/90 border-white/5'
      }`}>
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-display font-black text-sm ${
            isLight ? 'bg-stone-900 text-gold-400' : 'bg-white text-stone-900'
          }`}>
            FS
          </div>
          <span className={`font-semibold tracking-tight text-sm ${isLight ? 'text-stone-900' : 'text-white'}`}>
            FinSight AI
          </span>
        </div>

        {/* Centre badge */}
        <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${
          isLight
            ? 'border-gold-600/40 bg-gold-400/10 text-gold-600'
            : 'border-gold-500/30 bg-gold-500/10 text-gold-400'
        }`}>
          <Trophy size={11} />
          HackBU 2026
        </div>

        {/* Right: toggle + CTA */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            to="/onboard"
            className={`hidden sm:inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl transition-all ${
              isLight
                ? 'bg-stone-900 text-white hover:bg-stone-700'
                : 'bg-white text-stone-900 hover:bg-cream-100'
            }`}
          >
            Get started <ChevronRight size={14} />
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">

        {/* Chip */}
        <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-medium mb-8 animate-fade-up ${
          isLight
            ? 'border-stone-300 bg-stone-100 text-stone-600'
            : 'border-white/10 bg-white/5 text-slate-400'
        }`}>
          A mentor, not a calculator.
        </div>

        {/* Main headline */}
        <h1
          className={`font-display font-black leading-[1.0] tracking-tight max-w-3xl animate-fade-up ${
            isLight ? 'text-stone-900' : 'text-white'
          }`}
          style={{ fontSize: 'clamp(2.8rem, 7vw, 5.5rem)', animationDelay: '0.06s' }}
        >
          You probably spend<br />
          <span className={isLight ? 'text-gold-600' : 'text-gold-400'}>
            more than you think.
          </span>
        </h1>

        {/* Sub-copy */}
        <p
          className={`mt-8 text-lg leading-relaxed max-w-lg animate-fade-up ${
            isLight ? 'text-stone-600' : 'text-slate-400'
          }`}
          style={{ animationDelay: '0.12s' }}
        >
          Not because you're bad with money.<br />
          Because nobody ever showed you the gap.
        </p>
        <p
          className={`mt-3 text-base leading-relaxed max-w-md animate-fade-up ${
            isLight ? 'text-stone-500' : 'text-slate-500'
          }`}
          style={{ animationDelay: '0.16s' }}
        >
          Upload 3 months of bank transactions.<br />
          We'll show you exactly where it goes.
        </p>

        {/* CTAs */}
        <div
          className="mt-10 flex flex-col sm:flex-row gap-3 animate-fade-up"
          style={{ animationDelay: '0.22s' }}
        >
          <Link
            to="/onboard"
            className={`group inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm transition-all ${
              isLight
                ? 'bg-stone-900 text-white hover:bg-stone-700 shadow-lg shadow-stone-900/20'
                : 'bg-white text-stone-900 hover:bg-cream-100 shadow-lg shadow-white/10'
            }`}
          >
            Show me my numbers
            <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            to="/upload"
            className={`inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border text-sm font-medium transition-colors ${
              isLight
                ? 'border-stone-300 text-stone-600 hover:border-stone-500 hover:text-stone-900'
                : 'border-white/15 text-slate-400 hover:border-white/30 hover:text-white'
            }`}
          >
            Try with sample data
          </Link>
        </div>

        {/* Mobile HackBU badge */}
        <div className={`mt-8 sm:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${
          isLight
            ? 'border-gold-600/40 bg-gold-400/10 text-gold-600'
            : 'border-gold-500/30 bg-gold-500/10 text-gold-400'
        }`}>
          <Trophy size={11} />
          Built for HackBU 2026
        </div>
      </section>

      {/* ── Divider ───────────────────────────────────────────────────────────── */}
      <div className={`mx-6 h-px ${isLight ? 'bg-cream-300' : 'bg-white/5'}`} />

      {/* ── Features ─────────────────────────────────────────────────────────── */}
      <section className="px-6 py-20 max-w-3xl mx-auto w-full">
        <p className={`text-xs font-semibold uppercase tracking-widest mb-12 ${
          isLight ? 'text-stone-400' : 'text-slate-600'
        }`}>
          How it works
        </p>
        <div className="space-y-10">
          {features.map((f) => (
            <div key={f.num} className="flex gap-6">
              <span className={`font-display font-black text-3xl leading-none shrink-0 w-12 ${
                isLight ? 'text-cream-400' : 'text-white/10'
              }`}>
                {f.num}
              </span>
              <div>
                <h3 className={`font-display font-bold text-xl leading-snug mb-2 ${
                  isLight ? 'text-stone-900' : 'text-white'
                }`}>
                  {f.title}
                </h3>
                <p className={`text-sm leading-relaxed ${
                  isLight ? 'text-stone-500' : 'text-slate-500'
                }`}>
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Divider ───────────────────────────────────────────────────────────── */}
      <div className={`mx-6 h-px ${isLight ? 'bg-cream-300' : 'bg-white/5'}`} />

      {/* ── Team section ─────────────────────────────────────────────────────── */}
      <section className="px-6 py-20 max-w-4xl mx-auto w-full">
        <div className="mb-12">
          <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${
            isLight ? 'text-stone-400' : 'text-slate-600'
          }`}>
            Team · HackBU 2026
          </p>
          <p className={`text-sm ${isLight ? 'text-stone-500' : 'text-slate-500'}`}>
            Binghamton University · Thomas J. Watson College of Engineering and Applied Science
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-5 mb-10">
          {team.map((member) => (
            <div
              key={member.name}
              className={`rounded-2xl border p-5 transition-all ${
                isLight
                  ? 'bg-white border-cream-300 hover:border-cream-400'
                  : 'bg-white/[0.03] border-white/8 hover:border-white/15'
              }`}
            >
              {/* Name */}
              <p className={`font-display font-bold text-base leading-snug mb-3 ${
                isLight ? 'text-stone-900' : 'text-white'
              }`}>
                {member.name}
              </p>

              {/* Degree */}
              <p className={`text-xs mb-0.5 ${isLight ? 'text-stone-500' : 'text-slate-500'}`}>
                {member.degree}
              </p>
              <p className={`text-xs mb-4 ${isLight ? 'text-stone-400' : 'text-slate-600'}`}>
                Binghamton University
              </p>

              {/* Advisor */}
              <div className={`pt-4 border-t ${isLight ? 'border-cream-300' : 'border-white/8'}`}>
                <p className={`text-xs font-medium mb-0.5 ${isLight ? 'text-stone-400' : 'text-slate-600'}`}>
                  Advised by
                </p>
                <p className={`text-sm font-semibold ${isLight ? 'text-gold-600' : 'text-gold-400'}`}>
                  {member.advisor}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Thank-you note */}
        <p className={`text-sm text-center leading-relaxed max-w-2xl mx-auto italic ${
          isLight ? 'text-stone-500' : 'text-slate-500'
        }`}>
          "We thank our advisors for their mentorship and for providing API access
          that made this project possible."
        </p>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <div className={`mx-6 h-px ${isLight ? 'bg-cream-300' : 'bg-white/5'}`} />
      <footer className={`px-6 py-8 text-center text-xs ${isLight ? 'text-stone-400' : 'text-slate-700'}`}>
        Not financial advice &nbsp;·&nbsp; Sources: CFPB, OpenStax, investor.gov &nbsp;·&nbsp; © HackBU 2026
      </footer>
    </div>
  );
}
