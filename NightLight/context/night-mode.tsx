import { createContext, useContext, useState } from 'react';

const NightModeContext = createContext<{
  active: boolean;
  setActive: (v: boolean) => void;
}>({ active: false, setActive: () => {} });

export function NightModeProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(false);
  return (
    <NightModeContext.Provider value={{ active, setActive }}>
      {children}
    </NightModeContext.Provider>
  );
}

export function useNightMode() {
  return useContext(NightModeContext);
}
