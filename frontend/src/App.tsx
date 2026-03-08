import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { LandingPage } from './pages/LandingPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { UploadPage } from './pages/UploadPage';
import { GapRevealPage } from './pages/GapRevealPage';
import { DashboardPage } from './pages/DashboardPage';
import { ChatPage } from './pages/ChatPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/onboard" element={<OnboardingPage />} />
      <Route path="/upload" element={<UploadPage />} />
      <Route path="/gap" element={<GapRevealPage />} />
      <Route path="/dashboard" element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="chat" element={<ChatPage />} />
      </Route>
    </Routes>
  );
}
