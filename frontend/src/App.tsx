import { Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { ThemeToggle } from './components/common/ThemeToggle';
import { Layout } from './components/layout/Layout';
import { LandingPage } from './pages/LandingPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { UploadPage } from './pages/UploadPage';
import { ExpenseSummaryPage } from './pages/ExpenseSummaryPage';
import { GapRevealPage } from './pages/GapRevealPage';
import { DashboardPage } from './pages/DashboardPage';
import { ChatPage } from './pages/ChatPage';

// Pages that have their own nav with a ThemeToggle — don't float on top of them
const NAV_HAS_TOGGLE = ['/', '/dashboard', '/dashboard/chat', '/summary', '/gap'];

function FloatingToggle() {
  const { pathname } = useLocation();
  const hasNavToggle = NAV_HAS_TOGGLE.some(p => pathname === p || pathname.startsWith('/dashboard'));
  if (hasNavToggle) return null;
  return (
    <div className="fixed top-4 right-4 z-50 drop-shadow-md">
      <ThemeToggle />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <FloatingToggle />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/onboard" element={<OnboardingPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/summary" element={<ExpenseSummaryPage />} />
        <Route path="/gap" element={<GapRevealPage />} />
        <Route path="/dashboard" element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="chat" element={<ChatPage />} />
        </Route>
      </Routes>
    </ThemeProvider>
  );
}
