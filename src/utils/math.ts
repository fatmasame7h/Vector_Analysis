export const EPS = 1e-12;
export const TWO_PI = 2 * Math.PI;
export const toRad = (d: number) => (d * Math.PI) / 180;
export const toDeg = (r: number) => (r * 180) / Math.PI;
export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
/** Snap floating-point noise (e.g. 6e-17) to an exact 0. */
export const clean = (x: number, eps = 1e-12) => (Math.abs(x) < eps ? 0 : x);
/** Normalize an angle to [0, 2π). */
export function normalizeAngle(a: number): number {
  let r = a % TWO_PI;
  if (r < 0) r += TWO_PI;
  if (Math.abs(r - TWO_PI) < 1e-12) r = 0;
  return r;
}
/** Thrown when a quantity is mathematically undefined (never show a fake number). */
export class UndefinedResultError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UndefinedResultError';
  }
}
export function assertFinite(...values: number[]): void {
  for (const v of values) if (!Number.isFinite(v)) throw new Error('All inputs must be finite numbers.');
}
export type AngleUnit = 'deg' | 'rad';
