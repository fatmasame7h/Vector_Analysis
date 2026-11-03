import type { Point } from '../engines/coordinates';
import type { Vec3 } from '../engines/vectors/vec3';
import type { Fmt } from '../context/SettingsContext';
import { PALETTE } from '../visualization/types';

export const C = PALETTE;
export function fmtPoint(p: Point, f: Fmt): string {
  if (p.system === 'cartesian') return `(${f.n(p.x)}, ${f.n(p.y)}, ${f.n(p.z)})`;
  if (p.system === 'cylindrical') return `(ρ = ${f.n(p.rho)}, φ = ${f.ang(p.phi)}, z = ${f.n(p.z)})`;
  return `(r = ${f.n(p.r)}, θ = ${f.ang(p.theta)}, φ = ${f.ang(p.phi)})`;
}
/** Axis extent that comfortably contains the given vectors/points. */
export function extentOf(...vs: Vec3[]): number {
  const m = Math.max(0, ...vs.flatMap((v) => v.map(Math.abs)));
  return Math.min(50, Math.max(5, Math.ceil(m * 1.2)));
}
export const isAngleSingular = (a: number | null) => a == null;
