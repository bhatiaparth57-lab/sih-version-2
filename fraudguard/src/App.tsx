import { useEffect, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Layout & UI Components
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import AIChat from '@/components/AIChat';
import { ToastHost } from '@/components/ui/Toast';
import { AppProvider } from '@/store';

// Pages
import Login from '@/pages/Login';
import CommandCenter from '@/pages/CommandCenter';
import Projects from '@/pages/Projects';
import ProjectDetail from '@/pages/ProjectDetail';
import AIDetection from '@/pages/AIDetection';
import MapIntelligence from '@/pages/MapIntelligence';
import Vendors from '@/pages/Vendors';
import Documents from '@/pages/Documents';
import Investigations from '@/pages/Investigations';
import Reports from '@/pages/Reports';

// Public Page
import PublicFeedback from '@/pages/feedback/PublicFeedback';

function Shell() {
  const [loggedIn, setLoggedIn] = useState(() => localStorage.getItem('fg_auth') === '1');
  const [booted, setBooted] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setTimeout(() => setBooted(true), 120);
  }, []);

  // THE GATEKEEPER: If not logged in, ONLY show the Login page
  if (!loggedIn) {
    return (
      <AnimatePresence mode="wait">
        <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <Login onLogin={() => setLoggedIn(true)} booted={booted} />
        </motion.div>
      </AnimatePresence>
    );
  }

  // THE COMMAND CENTER: Only renders if loggedIn is true
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-canvas">
      <Sidebar collapsed={false} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title="System Dashboard" subtitle="Active Session" />
        
        <AnimatePresence mode="wait">
          <motion.main
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="relative flex-1 overflow-y-auto"
          >
            <Routes>
              <Route path="/" element={<CommandCenter />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="/ai" element={<AIDetection />} />
              <Route path="/map" element={<MapIntelligence />} />
              <Route path="/vendors" element={<Vendors />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/investigations" element={<Investigations />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="*" element={<CommandCenter />} />
            </Routes>
          </motion.main>
        </AnimatePresence>
      </div>
      
      {/* AlertCenter and AuditorWelcome are completely removed from here */}
      <AIChat />
      <ToastHost />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Routes>
        {/* CITIZEN FEEDBACK: Placed outside the Shell so it bypasses login */}
        <Route path="/feedback/:projectId" element={<PublicFeedback />} />
        
        {/* Everything else gets routed through the secure Shell */}
        <Route path="/*" element={<Shell />} />
      </Routes>
    </AppProvider>
  );
}