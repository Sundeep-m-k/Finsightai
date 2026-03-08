import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { NavSlotProvider } from './context/NavSlotContext';
import { GlobalNav } from './components/layout/GlobalNav';
import { Layout } from './components/layout/Layout';
import { LandingPage } from './pages/LandingPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { UploadPage } from './pages/UploadPage';
import { ExpenseSummaryPage } from './pages/ExpenseSummaryPage';
import { GapRevealPage } from './pages/GapRevealPage';
import { DashboardPage } from './pages/DashboardPage';
import { ChatPage } from './pages/ChatPage';

export default function App() {
  return (
    <ThemeProvider>
      <NavSlotProvider>
        {/* Single persistent nav — always on top, every page */}
        <div className="min-h-screen flex flex-col">
          <GlobalNav />
          <div className="flex-1 flex flex-col min-h-0">
            <Routes>
              <Route path="/"        element={<LandingPage />} />
              <Route path="/onboard" element={<OnboardingPage />} />
              <Route path="/upload"  element={<UploadPage />} />
              <Route path="/summary" element={<ExpenseSummaryPage />} />
              <Route path="/gap"     element={<GapRevealPage />} />
              <Route path="/dashboard" element={<Layout />}>
                <Route index       element={<DashboardPage />} />
                <Route path="chat" element={<ChatPage />} />
              </Route>
            </Routes>
          </div>
        </div>
      </NavSlotProvider>
    </ThemeProvider>
  );
}
