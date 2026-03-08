import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Zap } from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import { DEMO_PROFILE } from '../lib/demoData';
import { useTheme } from '../context/ThemeContext';

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
  const navigate = useNavigate();
  const { setProfile } = useProfile();

  function handleDemo() {
    setProfile(DEMO_PROFILE);
    navigate('/summary');
  }

  return (
    <div className={`flex flex-col font-sans ${
      isLight ? 'bg-cream-100 text-stone-900' : 'bg-[#0a0a0a] text-white'
    }`}>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative flex-1 flex flex-col items-center justify-center px-6 py-8 text-center min-h-[calc(100dvh-4rem)]">

        {/* Tagline */}
        <p
          className={`font-display font-semibold italic mb-4 animate-fade-up ${
            isLight ? 'text-stone-500' : 'text-slate-400'
          }`}
          style={{ fontSize: 'clamp(1.2rem, 2.5vw, 2rem)' }}
        >
          A mentor, not a calculator.
        </p>

        {/* Main headline */}
        <h1
          className={`font-display font-black leading-[1.0] tracking-tight max-w-4xl animate-fade-up ${
            isLight ? 'text-stone-900' : 'text-white'
          }`}
          style={{ fontSize: 'clamp(2.5rem, 6.5vw, 5.5rem)', animationDelay: '0.06s' }}
        >
          You probably spend<br />
          <span className={isLight ? 'text-gold-600' : 'text-gold-400'}>
            more than you think.
          </span>
        </h1>

        {/* Sub-copy */}
        <p
          className={`mt-6 text-lg leading-relaxed max-w-xl animate-fade-up ${
            isLight ? 'text-stone-600' : 'text-slate-400'
          }`}
          style={{ animationDelay: '0.12s' }}
        >
          Not because you're bad with money.<br />
          Because nobody ever showed you the gap.
        </p>
        <p
          className={`mt-3 text-base leading-relaxed max-w-lg animate-fade-up ${
            isLight ? 'text-stone-500' : 'text-slate-500'
          }`}
          style={{ animationDelay: '0.16s' }}
        >
          Upload 3 months of bank transactions. We'll show you exactly where it goes.
        </p>

        {/* CTAs */}
        <div
          className="mt-8 flex flex-col sm:flex-row gap-4 animate-fade-up"
          style={{ animationDelay: '0.22s' }}
        >
          <Link
            to="/onboard"
            className={`group inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-base transition-all ${
              isLight
                ? 'bg-stone-900 text-stone-50 hover:bg-stone-700 shadow-lg shadow-stone-900/20'
                : 'bg-white text-stone-900 hover:bg-cream-100 shadow-lg shadow-white/10'
            }`}
          >
            Start my financial checkup
            <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <button
            onClick={handleDemo}
            className={`inline-flex items-center gap-2 px-8 py-3.5 rounded-xl border text-base font-medium transition-colors ${
              isLight
                ? 'border-gold-500/50 text-gold-600 hover:border-gold-500 hover:bg-gold-400/10'
                : 'border-gold-500/40 text-gold-400 hover:border-gold-500/70 hover:bg-gold-500/10'
            }`}
          >
            <Zap size={16} />
            Try instant demo
          </button>
        </div>

        {/* ── Scroll hint — in-flow, centred below CTAs ── */}
        <div className="mt-10 flex flex-col items-center gap-2 pointer-events-none select-none animate-scroll-fade">
          <span className={`text-xs font-semibold tracking-[0.22em] uppercase ${
            isLight ? 'text-stone-400' : 'text-slate-500'
          }`}>
            Discover more
          </span>
          <div className="flex flex-col items-center gap-0.5">
            {[0, 0.2, 0.4].map((delay) => (
              <svg
                key={delay}
                width="26" height="15" viewBox="0 0 26 15" fill="none"
                className={`animate-scroll-dot ${isLight ? 'text-stone-400' : 'text-slate-400'}`}
                style={{ animationDelay: `${delay}s` }}
              >
                <polyline
                  points="2,2 13,12 24,2"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ))}
          </div>
        </div>
      </section>

      {/* ── Manifesto ─────────────────────────────────────────────────────────── */}
      <section className={`relative overflow-hidden px-6 sm:px-8 py-8 sm:py-12 ${
        isLight ? 'bg-cream-300' : 'bg-stone-950'
      }`}>

        {/* Ambient gold glow */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full opacity-[0.12]"
            style={{ background: 'radial-gradient(circle, #d4a849 0%, transparent 70%)' }}
          />
        </div>

        <div className="relative max-w-4xl mx-auto">

          {/* Eyebrow */}
          <p className={`text-sm sm:text-base font-display font-bold uppercase tracking-[0.2em] mb-4 text-center ${
            isLight ? 'text-gold-600/80' : 'text-gold-400/70'
          }`}>
            What we actually are
          </p>

          {/* Main quote */}
          <h2
            className={`font-display font-black leading-[1.05] tracking-tight mb-4 text-center ${
              isLight ? 'text-stone-900' : 'text-white'
            }`}
            style={{ fontSize: 'clamp(1.6rem, 4vw, 3.2rem)' }}
          >
            Not your bank.<br />
            Not your dad.<br />
            <span className={isLight ? 'text-gold-600' : 'text-gold-400'}>Your financial mirror.</span>
          </h2>

          {/* Emotional paragraph */}
          <p
            className={`leading-relaxed max-w-2xl mx-auto text-center mb-2 ${
              isLight ? 'text-stone-600' : 'text-slate-400'
            }`}
            style={{ fontSize: 'clamp(0.88rem, 1.6vw, 1rem)' }}
          >
            Whether you're a student on a stipend, a first-generation earner
            figuring it out alone, or a professional who just never learned the rules —
            money stress looks the same. We built this for all of you.
          </p>

          {/* International student callout */}
          <p
            className={`font-display font-semibold italic text-center mb-6 ${
              isLight ? 'text-gold-600/80' : 'text-gold-400/70'
            }`}
            style={{ fontSize: 'clamp(0.9rem, 1.6vw, 1.1rem)' }}
          >
            Especially for international students navigating a financial system
            that was never explained to them.
          </p>

          {/* Three pillars */}
          <div className={`grid grid-cols-1 sm:grid-cols-3 gap-px rounded-xl overflow-hidden border ${
            isLight
              ? 'bg-stone-300/60 border-stone-300'
              : 'bg-white/[0.06] border-white/[0.06]'
          }`}>
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
                className={`px-5 py-5 transition-colors ${
                  isLight
                    ? 'bg-cream-200 hover:bg-cream-100'
                    : 'bg-stone-950 hover:bg-white/[0.04]'
                }`}
              >
                <span className={`font-display font-black text-3xl leading-none block mb-2 ${
                  isLight ? 'text-gold-500/50' : 'text-gold-400/40'
                }`}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className={`font-display font-black text-base leading-snug mb-1.5 ${
                  isLight ? 'text-stone-900' : 'text-white'
                }`}>
                  {pillar.title}
                </h3>
                <p className={`text-xs leading-relaxed ${
                  isLight ? 'text-stone-500' : 'text-slate-400'
                }`}>
                  {pillar.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Scroll hint */}
          <div className="mt-5 flex flex-col items-center gap-2 pointer-events-none select-none animate-scroll-fade">
            <span className={`text-xs font-semibold tracking-[0.22em] uppercase ${
              isLight ? 'text-gold-600/60' : 'text-gold-400/50'
            }`}>
              Understand our working
            </span>
            <div className="flex flex-col items-center gap-0.5">
              {[0, 0.2, 0.4].map((delay) => (
                <svg key={delay} width="26" height="15" viewBox="0 0 26 15" fill="none"
                  className={`animate-scroll-dot ${isLight ? 'text-gold-500' : 'text-gold-500/50'}`}
                  style={{ animationDelay: `${delay}s` }}>
                  <polyline points="2,2 13,12 24,2" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── Divider ───────────────────────────────────────────────────────────── */}
      <div className={`mx-8 h-px ${isLight ? 'bg-cream-300' : 'bg-white/5'}`} />

      {/* ── Features / How it works ───────────────────────────────────────────── */}
      <section className={`flex flex-col justify-center px-6 sm:px-12 py-10 sm:py-16 w-full min-h-[calc(100dvh-4rem)] ${
        isLight ? 'bg-cream-100' : 'bg-[#0a0a0a]'
      }`}>
        <div className="max-w-4xl mx-auto w-full">

          {/* Eyebrow */}
          <p className={`text-sm sm:text-base font-display font-bold uppercase tracking-[0.2em] mb-12 ${
            isLight ? 'text-gold-600/80' : 'text-gold-400/60'
          }`}>
            How it works
          </p>

          {/* Steps */}
          <div className="space-y-12">
            {features.map((f) => (
              <div key={f.num} className="flex flex-col group">
                <h3
                  className={`font-display font-black leading-snug mb-3 ${
                    isLight ? 'text-stone-900' : 'text-white'
                  }`}
                  style={{ fontSize: 'clamp(1.35rem, 2.8vw, 2rem)' }}
                >
                  {f.title}
                </h3>
                <p
                  className={`leading-relaxed ${
                    isLight ? 'text-stone-500' : 'text-slate-400'
                  }`}
                  style={{ fontSize: 'clamp(0.95rem, 1.6vw, 1.1rem)' }}
                >
                  {f.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Scroll hint */}
          <div className="mt-14 flex flex-col items-center gap-2 pointer-events-none select-none animate-scroll-fade">
            <span className={`text-xs font-semibold tracking-[0.22em] uppercase ${
              isLight ? 'text-stone-400' : 'text-slate-500'
            }`}>
              Why this problem
            </span>
            <div className="flex flex-col items-center gap-0.5">
              {[0, 0.2, 0.4].map((delay) => (
                <svg key={delay} width="26" height="15" viewBox="0 0 26 15" fill="none"
                  className={`animate-scroll-dot ${isLight ? 'text-stone-400' : 'text-slate-500'}`}
                  style={{ animationDelay: `${delay}s` }}>
                  <polyline points="2,2 13,12 24,2" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── Why we built this ─────────────────────────────────────────────────── */}
      <section className={`relative overflow-hidden px-6 sm:px-8 min-h-[100dvh] flex items-center ${
        isLight ? 'bg-cream-200' : 'bg-stone-950'
      }`}>

        {/* Subtle ambient glow */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div
            className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full opacity-[0.06]"
            style={{ background: 'radial-gradient(circle, #d4a849 0%, transparent 70%)' }}
          />
        </div>

        <div className="relative max-w-3xl mx-auto w-full py-10">

          {/* Eyebrow */}
          <p className={`text-sm sm:text-base font-display font-bold uppercase tracking-[0.2em] mb-6 text-center ${
            isLight ? 'text-gold-600/80' : 'text-gold-400/70'
          }`}>
            Why this problem
          </p>

          {/* Lead */}
          <p
            className={`font-display font-bold leading-snug text-center mb-6 ${isLight ? 'text-stone-800' : 'text-white'}`}
            style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)' }}
          >
            Three researchers. Three advisors.<br />
            One shared problem.
          </p>

          <p
            className={`leading-relaxed text-center mb-4 ${isLight ? 'text-stone-600' : 'text-slate-300'}`}
            style={{ fontSize: 'clamp(1rem, 1.8vw, 1.15rem)' }}
          >
            We were managing stipends, student loans, and international finances —
            yet every financial tool assumed we had salaries and retirement accounts.
          </p>

          <p
            className={`font-display font-bold text-center mb-4 ${isLight ? 'text-stone-800' : 'text-white'}`}
            style={{ fontSize: 'clamp(1.1rem, 2vw, 1.4rem)' }}
          >
            We didn't.
          </p>

          <p
            className={`leading-relaxed text-center mb-4 ${isLight ? 'text-stone-600' : 'text-slate-300'}`}
            style={{ fontSize: 'clamp(1rem, 1.8vw, 1.15rem)' }}
          >
            And when we finally saved money, we didn't know where to invest it.
          </p>

          <p
            className={`font-display font-semibold italic text-center mb-8 ${isLight ? 'text-gold-600' : 'text-gold-400'}`}
            style={{ fontSize: 'clamp(1rem, 1.8vw, 1.15rem)' }}
          >
            So we built FinScope AI — financial guidance designed for students
            and early professionals.
          </p>

          {/* Divider */}
          <div className="flex items-center justify-center mb-6">
            <div className={`h-px w-20 ${isLight ? 'bg-gold-500/40' : 'bg-gold-400/30'}`} />
          </div>

          {/* Scorsese quote */}
          <p
            className={`font-display font-semibold italic text-center mb-3 ${
              isLight ? 'text-gold-600' : 'text-gold-400'
            }`}
            style={{ fontSize: 'clamp(1.3rem, 3vw, 2rem)' }}
          >
            "The most personal is the most creative."
          </p>
          <p className={`text-center text-sm tracking-widest uppercase mb-8 font-display font-bold ${
            isLight ? 'text-stone-500' : 'text-slate-300'
          }`}>
            — <span className={isLight ? 'text-gold-600' : 'text-gold-400'}>Martin Scorsese</span>
          </p>

          {/* Scroll hint */}
          <div className="flex flex-col items-center gap-2 pointer-events-none select-none animate-scroll-fade">
            <span className={`text-xs font-semibold tracking-[0.22em] uppercase ${
              isLight ? 'text-gold-600/60' : 'text-gold-400/50'
            }`}>
              Meet the creators
            </span>
            <div className="flex flex-col items-center gap-0.5">
              {[0, 0.2, 0.4].map((delay) => (
                <svg key={delay} width="26" height="15" viewBox="0 0 26 15" fill="none"
                  className={`animate-scroll-dot ${isLight ? 'text-gold-500' : 'text-gold-500/50'}`}
                  style={{ animationDelay: `${delay}s` }}>
                  <polyline points="2,2 13,12 24,2" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── Divider ───────────────────────────────────────────────────────────── */}
      <div className={`mx-8 h-px ${isLight ? 'bg-cream-300' : 'bg-white/5'}`} />

      {/* ── Team section ─────────────────────────────────────────────────────── */}
      <section className="px-6 sm:px-8 py-12 sm:py-20 max-w-4xl mx-auto w-full">
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
