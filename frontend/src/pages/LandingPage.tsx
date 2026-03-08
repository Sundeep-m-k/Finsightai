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
      <nav className={`px-8 py-5 flex items-center justify-between sticky top-0 z-20 backdrop-blur-sm border-b ${
        isLight
          ? 'bg-cream-100/90 border-cream-300'
          : 'bg-[#0a0a0a]/90 border-white/5'
      }`}>
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-display font-black text-sm ${
            isLight ? 'bg-stone-900 text-gold-400' : 'bg-white text-stone-900'
          }`}>
            FS
          </div>
          <span className={`font-semibold tracking-tight text-base ${isLight ? 'text-stone-900' : 'text-white'}`}>
            FinSight AI
          </span>
        </div>

        {/* Centre badge */}
        <div className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold ${
          isLight
            ? 'border-gold-600/40 bg-gold-400/10 text-gold-600'
            : 'border-gold-500/30 bg-gold-500/10 text-gold-400'
        }`}>
          <Trophy size={14} />
          HackBU 2026 · Built in 24 hours
        </div>

        {/* Right: toggle + CTA */}
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link
            to="/onboard"
            className={`hidden sm:inline-flex items-center gap-2 text-base font-semibold px-5 py-2.5 rounded-xl transition-all ${
              isLight
                ? 'bg-stone-900 text-stone-50 hover:bg-stone-700'
                : 'bg-white text-stone-900 hover:bg-cream-100'
            }`}
          >
            Get started <ChevronRight size={16} />
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-28 text-center">

        {/* Tagline — large, prominent */}
        <p
          className={`font-display font-semibold italic mb-6 animate-fade-up ${
            isLight ? 'text-stone-500' : 'text-slate-400'
          }`}
          style={{ fontSize: 'clamp(1.5rem, 3vw, 2.5rem)' }}
        >
          A mentor, not a calculator.
        </p>

        {/* Main headline */}
        <h1
          className={`font-display font-black leading-[1.0] tracking-tight max-w-4xl animate-fade-up ${
            isLight ? 'text-stone-900' : 'text-white'
          }`}
          style={{ fontSize: 'clamp(2.8rem, 7vw, 6rem)', animationDelay: '0.06s' }}
        >
          You probably spend<br />
          <span className={isLight ? 'text-gold-600' : 'text-gold-400'}>
            more than you think.
          </span>
        </h1>

        {/* Sub-copy */}
        <p
          className={`mt-10 text-xl leading-relaxed max-w-xl animate-fade-up ${
            isLight ? 'text-stone-600' : 'text-slate-400'
          }`}
          style={{ animationDelay: '0.12s' }}
        >
          Not because you're bad with money.<br />
          Because nobody ever showed you the gap.
        </p>
        <p
          className={`mt-4 text-lg leading-relaxed max-w-lg animate-fade-up ${
            isLight ? 'text-stone-500' : 'text-slate-500'
          }`}
          style={{ animationDelay: '0.16s' }}
        >
          Upload 3 months of bank transactions.<br />
          We'll show you exactly where it goes.
        </p>

        {/* CTAs */}
        <div
          className="mt-12 flex flex-col sm:flex-row gap-4 animate-fade-up"
          style={{ animationDelay: '0.22s' }}
        >
          <Link
            to="/onboard"
            className={`group inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base transition-all ${
              isLight
                ? 'bg-stone-900 text-stone-50 hover:bg-stone-700 shadow-lg shadow-stone-900/20'
                : 'bg-white text-stone-900 hover:bg-cream-100 shadow-lg shadow-white/10'
            }`}
          >
            Show me my numbers
            <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            to="/upload"
            className={`inline-flex items-center gap-2 px-8 py-4 rounded-xl border text-base font-medium transition-colors ${
              isLight
                ? 'border-stone-300 text-stone-600 hover:border-stone-500 hover:text-stone-900'
                : 'border-white/15 text-slate-400 hover:border-white/30 hover:text-white'
            }`}
          >
            Try with sample data
          </Link>
        </div>

        {/* Mobile HackBU badge */}
        <div className={`mt-10 sm:hidden inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold ${
          isLight
            ? 'border-gold-600/40 bg-gold-400/10 text-gold-600'
            : 'border-gold-500/30 bg-gold-500/10 text-gold-400'
        }`}>
          <Trophy size={13} />
          HackBU 2026 · Built in 24 hours
        </div>
      </section>

      {/* ── Manifesto ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-stone-950 px-8 py-28">

        {/* Ambient gold glow */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(circle, #d4a849 0%, transparent 70%)' }}
          />
        </div>

        <div className="relative max-w-4xl mx-auto">

          {/* Eyebrow */}
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-400/60 mb-10 text-center">
            What we actually are
          </p>

          {/* Main quote */}
          <h2
            className="font-display font-black text-white leading-[1.05] tracking-tight mb-8 text-center"
            style={{ fontSize: 'clamp(2rem, 5vw, 4rem)' }}
          >
            Not your bank.<br />
            Not your dad.<br />
            <span className="text-gold-400">Your financial mirror.</span>
          </h2>

          {/* Emotional paragraph */}
          <p
            className="text-slate-400 leading-relaxed max-w-2xl mx-auto text-center mb-4"
            style={{ fontSize: 'clamp(1rem, 2vw, 1.2rem)' }}
          >
            Whether you're a student on a stipend, a first-generation earner
            figuring it out alone, or a professional who just never learned the rules —
            money stress looks the same. We built this for all of you.
          </p>

          {/* International student callout */}
          <p
            className="font-display font-semibold italic text-gold-400/70 text-center mb-16"
            style={{ fontSize: 'clamp(1.1rem, 2vw, 1.35rem)' }}
          >
            Especially for international students navigating a financial system
            that was never explained to them.
          </p>

          {/* Three pillars — bold text only, no emojis */}
          <div className="grid sm:grid-cols-3 gap-px bg-white/[0.06] rounded-2xl overflow-hidden border border-white/[0.06]">
            {[
              {
                title: 'Your wallet, decoded.',
                desc: 'Months of real transactions turned into a clear picture of your financial life — not a snapshot, a story.',
              },
              {
                title: 'Numbers + the story behind them.',
                desc: 'Spending is habit, stress, and context. We factor in your behaviour, not just what your bank says.',
              },
              {
                title: 'Zero guesswork. Always cited.',
                desc: 'Every insight links back to CFPB, OpenStax, or investor.gov. We never make things up.',
              },
            ].map((pillar, i) => (
              <div
                key={pillar.title}
                className="bg-stone-950 px-8 py-8 hover:bg-white/[0.04] transition-colors"
              >
                <span className="font-display font-black text-gold-400/40 text-5xl leading-none block mb-5">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="font-display font-black text-white text-xl leading-snug mb-3">
                  {pillar.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  {pillar.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Bottom companion line */}
          <p className="text-center text-slate-600 text-sm mt-10 tracking-wide">
            Honest advice · Grounded in data · Never in guesswork
          </p>
        </div>
      </section>

      {/* ── Divider ───────────────────────────────────────────────────────────── */}
      <div className={`mx-8 h-px ${isLight ? 'bg-cream-300' : 'bg-white/5'}`} />

      {/* ── Features ─────────────────────────────────────────────────────────── */}
      <section className="px-8 py-24 max-w-3xl mx-auto w-full">
        <p className={`text-sm font-semibold uppercase tracking-widest mb-14 ${
          isLight ? 'text-stone-400' : 'text-slate-600'
        }`}>
          How it works
        </p>
        <div className="space-y-14">
          {features.map((f) => (
            <div key={f.num} className="flex gap-8">
              <span className={`font-display font-black text-5xl leading-none shrink-0 w-16 ${
                isLight ? 'text-cream-400' : 'text-white/10'
              }`}>
                {f.num}
              </span>
              <div>
                <h3 className={`font-display font-bold text-2xl leading-snug mb-3 ${
                  isLight ? 'text-stone-900' : 'text-white'
                }`}>
                  {f.title}
                </h3>
                <p className={`text-base leading-relaxed ${
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
      <div className={`mx-8 h-px ${isLight ? 'bg-cream-300' : 'bg-white/5'}`} />

      {/* ── Team section ─────────────────────────────────────────────────────── */}
      <section className="px-8 py-24 max-w-4xl mx-auto w-full">
        <div className="mb-14">
          <p className={`text-sm font-semibold uppercase tracking-widest mb-2 ${
            isLight ? 'text-stone-400' : 'text-slate-600'
          }`}>
            Team · HackBU 2026 · Built in 24 hours
          </p>
          <p className={`text-base ${isLight ? 'text-stone-500' : 'text-slate-500'}`}>
            Binghamton University · Thomas J. Watson College of Engineering and Applied Science
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6 mb-12">
          {team.map((member) => (
            <div
              key={member.name}
              className={`rounded-2xl border p-6 transition-all ${
                isLight
                  ? 'bg-white border-cream-300 hover:border-cream-400'
                  : 'bg-white/[0.03] border-white/8 hover:border-white/15'
              }`}
            >
              {/* Name */}
              <p className={`font-display font-bold text-lg leading-snug mb-4 ${
                isLight ? 'text-stone-900' : 'text-white'
              }`}>
                {member.name}
              </p>

              {/* Degree */}
              <p className={`text-sm mb-1 ${isLight ? 'text-stone-500' : 'text-slate-500'}`}>
                {member.degree}
              </p>
              <p className={`text-sm mb-5 ${isLight ? 'text-stone-400' : 'text-slate-600'}`}>
                Binghamton University
              </p>

              {/* Advisor */}
              <div className={`pt-4 border-t ${isLight ? 'border-cream-300' : 'border-white/8'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-1.5 ${isLight ? 'text-stone-400' : 'text-slate-600'}`}>
                  Advised by
                </p>
                <p className={`text-xl font-display font-black leading-snug ${isLight ? 'text-gold-600' : 'text-gold-400'}`}>
                  {member.advisor}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Thank-you note */}
        <p className={`text-xl sm:text-2xl text-center leading-relaxed max-w-2xl mx-auto font-display font-semibold italic ${
          isLight ? 'text-stone-500' : 'text-slate-400'
        }`}>
          "We are grateful to our advisors for their mentorship, guidance, and constant
          encouragement throughout our journey."
        </p>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <div className={`mx-8 h-px ${isLight ? 'bg-cream-300' : 'bg-white/5'}`} />
      <footer className={`px-8 py-10 text-center text-sm ${isLight ? 'text-stone-400' : 'text-slate-700'}`}>
        Not financial advice &nbsp;·&nbsp; Sources: CFPB, OpenStax, investor.gov &nbsp;·&nbsp; © HackBU 2026
      </footer>
    </div>
  );
}
