import { createContext, useContext, useState, type ReactNode } from 'react';

export interface HistoryEntry {
  id: string; time: number; path: string; title: string; operation: string;
  summary: string[]; form: unknown; copyText: string;
}
interface H { entries: HistoryEntry[]; add: (e: Omit<HistoryEntry, 'id' | 'time'>) => void; clear: () => void }
const Ctx = createContext<H>({ entries: [], add: () => {}, clear: () => {} });

/** Session history (kept in memory for the current visit). */
export function HistoryProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const add: H['add'] = (e) => setEntries((l) => [{ ...e, id: crypto.randomUUID?.() ?? String(Date.now() + Math.random()), time: Date.now() }, ...l].slice(0, 100));
  return <Ctx.Provider value={{ entries, add, clear: () => setEntries([]) }}>{children}</Ctx.Provider>;
}
export const useHistory = () => useContext(Ctx);
