"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface UIContextType {
  isMuted: boolean;
  toggleMute: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
  // Start unmuted to attempt autoplay, user can mute via Header
  const [isMuted, setIsMuted] = useState(false); 

  useEffect(() => {
    const stored = localStorage.getItem('lumos_isMuted');
    if (stored !== null) {
      setIsMuted(stored === 'true');
    }
  }, []);

  const toggleMute = () => {
    setIsMuted(prev => {
      const newVal = !prev;
      localStorage.setItem('lumos_isMuted', String(newVal));
      return newVal;
    });
  };

  return (
    <UIContext.Provider value={{ isMuted, toggleMute }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUIState() {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUIState must be used within a UIProvider');
  }
  return context;
}
