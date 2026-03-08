import { Link } from 'react-router-dom';

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-indigo-50 to-white px-4">
      <div className="max-w-xl text-center">
        <h1 className="text-4xl font-bold text-slate-900 sm:text-5xl">
          FinSight AI
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Understand where your money goes, get a personalized plan, and know when you’re ready to invest.
        </p>
        <p className="mt-2 text-slate-500">
          Your financial mentor for college life.
        </p>
        <Link
          to="/onboard"
          className="mt-8 inline-block rounded-lg bg-indigo-600 px-8 py-3 font-medium text-white shadow-md hover:bg-indigo-700"
        >
          Get started
        </Link>
      </div>
    </div>
  );
}
