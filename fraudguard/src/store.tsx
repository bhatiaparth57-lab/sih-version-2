import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface AppState {
  demoMode: boolean;
  setDemoMode: (v: boolean) => void;
  chatOpen: boolean;
  setChatOpen: (v: boolean) => void;
  alertsOpen: boolean;
  setAlertsOpen: (v: boolean) => void;
}

const Ctx = createContext<AppState>(null as unknown as AppState);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }: { children: ReactNode }) {
  const [demoMode, setDemoMode] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);

  return (
    <Ctx.Provider value={{ demoMode, setDemoMode, chatOpen, setChatOpen, alertsOpen, setAlertsOpen }}>
      {children}
    </Ctx.Provider>
  );
}

export { useEffect };
