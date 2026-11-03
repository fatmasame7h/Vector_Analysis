import { evaluate } from 'mathjs';
import { AngleUnit, toRad } from './math';

/** Parse a user-typed number. Expressions such as "pi/4" or "sqrt(2)" are allowed. */
export function num(s: string, label = 'value'): number {
  const t = (s ?? '').trim();
  if (!t) throw new Error(`${label} is empty.`);
  let v: unknown;
  try { v = evaluate(t); } catch { throw new Error(`${label}: "${s}" is not a valid number.`); }
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`${label}: "${s}" is not a valid finite number.`);
  return v;
}
/** Angle input → radians. A blank field means "undefined angle" (null). */
export function angleIn(s: string, unit: AngleUnit, label: string, allowBlank = true): number | null {
  if (!s.trim() && allowBlank) return null;
  const v = num(s, label);
  return unit === 'deg' ? toRad(v) : v;
}
