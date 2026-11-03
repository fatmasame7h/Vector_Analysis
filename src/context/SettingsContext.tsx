import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AngleUnit } from '../utils/math';
import { toDeg } from '../utils/math';
import type { Vec3 } from '../engines/vectors/vec3';

export type DisplayMode = 'answer' | 'steps';
interface Settings {
  angleUnit: AngleUnit; precision: number; mode: DisplayMode;
  setAngleUnit: (u: AngleUnit) => void; setPrecision: (p: number) => void; setMode: (m: DisplayMode) => void;
}
const Ctx = createContext<Settings>(null as unknown as Settings);
const KEY = 'vectorlab-settings';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Pick<Settings, 'angleUnit' | 'precision' | 'mode'>>; }
  catch { return {}; }
}
export function SettingsProvider({ children }: { children: ReactNode }) {
  const init = load();
  const [angleUnit, setAngleUnit] = useState<AngleUnit>(init.angleUnit ?? 'deg');
  const [precision, setPrecision] = useState<number>(init.precision ?? 4);
  const [mode, setMode] = useState<DisplayMode>(init.mode ?? 'steps');
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify({ angleUnit, precision, mode })); } catch { /* ignore */ } }, [angleUnit, precision, mode]);
  return <Ctx.Provider value={{ angleUnit, precision, mode, setAngleUnit, setPrecision, setMode }}>{children}</Ctx.Provider>;
}
export const useSettings = () => useContext(Ctx);

/** Number / angle / vector formatting that follows the user's settings. */
export function useFmt() {
  const { precision, angleUnit } = useSettings();
  const n = (x: number) => { const v = parseFloat(x.toFixed(precision)); return Object.is(v, -0) ? '0' : String(v); };
  const ang = (r: number | null) => (r == null ? 'undefined' : angleUnit === 'deg' ? `${n(toDeg(r))}°` : `${n(r)} rad`);
  const v = (a: Vec3) => `(${a.map(n).join(', ')})`;
  return { n, ang, v, angleUnit, precision };
}
export type Fmt = ReturnType<typeof useFmt>;
