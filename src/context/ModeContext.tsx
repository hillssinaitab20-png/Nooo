import React, { createContext, useContext, useState, useEffect } from 'react';

interface ModeContextType {
  isDemo: boolean;
  setMode: (demo: boolean) => void;
  toggleMode: () => void;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const [isDemo, setIsDemo] = useState<boolean>(() => {
    const saved = localStorage.getItem('acc_demo_mode');
    return saved !== null ? saved === 'true' : true; // default to demo mode initially so user can explore immediately
  });

  useEffect(() => {
    localStorage.setItem('acc_demo_mode', String(isDemo));
  }, [isDemo]);

  const toggleMode = () => setIsDemo(prev => !prev);
  const setMode = (demo: boolean) => setIsDemo(demo);

  return (
    <ModeContext.Provider value={{ isDemo, setMode, toggleMode }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error('useMode must be used within ModeProvider');
  return ctx;
}
