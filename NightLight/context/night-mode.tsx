import { createContext, useContext, useState } from 'react';

export interface Contact {
  id: string;
  name: string;
  phone: string;
}

interface AppState {
  active: boolean;
  setActive: (v: boolean) => void;
  homeAddress: string;
  setHomeAddress: (v: string) => void;
  contacts: Contact[];
  setContacts: (c: Contact[]) => void;
  impulseEnabled: boolean;
  setImpulseEnabled: (v: boolean) => void;
  logout: () => void;
  setLogout: (fn: () => void) => void;
}

const AppContext = createContext<AppState>({
  active: false,
  setActive: () => {},
  homeAddress: '',
  setHomeAddress: () => {},
  contacts: [],
  setContacts: () => {},
  impulseEnabled: false,
  setImpulseEnabled: () => {},
  logout: () => {},
  setLogout: () => {},
});

export function NightModeProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(false);
  const [homeAddress, setHomeAddress] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [impulseEnabled, setImpulseEnabled] = useState(false);
  const [logout, setLogoutFn] = useState<() => void>(() => () => {});

  const setLogout = (fn: () => void) => setLogoutFn(() => fn);

  return (
    <AppContext.Provider value={{
      active, setActive,
      homeAddress, setHomeAddress,
      contacts, setContacts,
      impulseEnabled, setImpulseEnabled,
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
