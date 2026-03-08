import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

interface NavSlotContextValue {
  slot: ReactNode;
  setSlot: (node: ReactNode) => void;
  clearSlot: () => void;
}

const NavSlotContext = createContext<NavSlotContextValue>({
  slot: null,
  setSlot: () => {},
  clearSlot: () => {},
});

export function NavSlotProvider({ children }: { children: ReactNode }) {
  const [slot, setSlotState] = useState<ReactNode>(null);
  const setSlot   = useCallback((node: ReactNode) => setSlotState(node), []);
  const clearSlot = useCallback(() => setSlotState(null), []);
  return (
    <NavSlotContext.Provider value={{ slot, setSlot, clearSlot }}>
      {children}
    </NavSlotContext.Provider>
  );
}

export function useNavSlot() {
  return useContext(NavSlotContext);
}
