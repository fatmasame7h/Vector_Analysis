import { Point, System, toCartesian } from '../coordinates';
import { EPS, clamp, clean, UndefinedResultError } from '../../utils/math';
import { Vec3, add, dot, scale } from './vec3';

export interface VectorValue { system: System; components: Vec3 }
export interface Basis { e1: Vec3; e2: Vec3; e3: Vec3; names: [string, string, string] }

const c3 = (v: Vec3): Vec3 => [clean(v[0]), clean(v[1]), clean(v[2])];

/** Local orthonormal basis (in Cartesian components) of `system` at point `at`. */
export function basisAt(system: System, at?: Point): Basis {
  if (system === 'cartesian')
    return { e1: [1, 0, 0], e2: [0, 1, 0], e3: [0, 0, 1], names: ['x', 'y', 'z'] };
  if (!at) throw new Error('A point of application is required for cylindrical and spherical components.');
  const p = toCartesian(at);
  const rhoXY = Math.hypot(p.x, p.y);
  if (system === 'cylindrical') {
    if (rhoXY < EPS)
      throw new UndefinedResultError('On the z-axis (ρ = 0) the directions a_ρ and a_φ are undefined.');
    const phi = Math.atan2(p.y, p.x);
    return {
      e1: c3([Math.cos(phi), Math.sin(phi), 0]),
      e2: c3([-Math.sin(phi), Math.cos(phi), 0]),
      e3: [0, 0, 1],
      names: ['ρ', 'φ', 'z'],
    };
  }
  const r = Math.hypot(p.x, p.y, p.z);
  if (r < EPS) throw new UndefinedResultError('At the origin (r = 0) the spherical basis is undefined.');
  if (rhoXY < EPS)
    throw new UndefinedResultError('On the z-axis the directions a_θ and a_φ are undefined (φ is undefined).');
  const th = Math.acos(clamp(p.z / r, -1, 1));
  const ph = Math.atan2(p.y, p.x);
  return {
    e1: c3([Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th)]),
    e2: c3([Math.cos(th) * Math.cos(ph), Math.cos(th) * Math.sin(ph), -Math.sin(th)]),
    e3: c3([-Math.sin(ph), Math.cos(ph), 0]),
    names: ['r', 'θ', 'φ'],
  };
}

/** Vector components in `v.system` at point `at` → Cartesian components. */
export function vectorToCartesian(v: VectorValue, at?: Point): Vec3 {
  const b = basisAt(v.system, at);
  const [c1, c2, c3_] = v.components;
  return c3(add(add(scale(b.e1, c1), scale(b.e2, c2)), scale(b.e3, c3_)));
}

/** Cartesian components → components in `system` at point `at` (orthonormal basis: use dot products). */
export function vectorFromCartesian(a: Vec3, system: System, at?: Point): Vec3 {
  const b = basisAt(system, at);
  return c3([dot(a, b.e1), dot(a, b.e2), dot(a, b.e3)]);
}

export function convertVector(v: VectorValue, to: System, at?: Point): VectorValue {
  const cart = vectorToCartesian(v, at);
  return { system: to, components: vectorFromCartesian(cart, to, at) };
}
