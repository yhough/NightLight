import { createContext, useContext, useState } from 'react';

export interface Contact {
  id: string;
  name: string;
  phone: string;
  imageUri?: string;
}

export interface HomeCoords {
  latitude: number;
  longitude: number;
}

interface AppState {
  active: boolean;
  setActive: (v: boolean) => void;
  homeAddress: string;
  setHomeAddress: (v: string) => void;
  homeCoords: HomeCoords | null;
  setHomeCoords: (v: HomeCoords | null) => void;
  homeByTime: Date | null;
  setHomeByTime: (v: Date | null) => void;
  contacts: Contact[];
  setContacts: (c: Contact[]) => void;
  logout: () => void;
  setLogout: (fn: () => void) => void;
}

const AppContext = createContext<AppState>({
  active: false,
  setActive: () => {},
  homeAddress: '',
  setHomeAddress: () => {},
  homeCoords: null,
  setHomeCoords: () => {},
  homeByTime: null,
  setHomeByTime: () => {},
  contacts: [],
  setContacts: () => {},
  logout: () => {},
  setLogout: () => {},
});

export function NightModeProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(false);
  const [homeAddress, setHomeAddress] = useState('');
  const [homeCoords, setHomeCoords] = useState<HomeCoords | null>(null);
  const [homeByTime, setHomeByTime] = useState<Date | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [logout, setLogoutFn] = useState<() => void>(() => () => {});

  const setLogout = (fn: () => void) => setLogoutFn(() => fn);

  return (
    <AppContext.Provider value={{
      active, setActive,
      homeAddress, setHomeAddress,
      homeCoords, setHomeCoords,
      homeByTime, setHomeByTime,
      contacts, setContacts,
      logout,
      setLogout,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useNightMode() {
  return useContext(AppContext);
}
