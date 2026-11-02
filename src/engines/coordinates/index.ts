import { EPS, assertFinite, clamp, clean, normalizeAngle, UndefinedResultError } from '../../utils/math';

/** All angles are in RADIANS. `null` means "undefined" (origin / z-axis singularity). */
export type Cartesian = { system: 'cartesian'; x: number; y: number; z: number };
export type Cylindrical = { system: 'cylindrical'; rho: number; phi: number | null; z: number };
export type Spherical = { system: 'spherical'; r: number; theta: number | null; phi: number | null };
export type Point = Cartesian | Cylindrical | Spherical;
export type System = Point['system'];

// Spherical convention: theta = polar angle from +z, phi = azimuth from +x.

export function cartToCyl(p: Cartesian): Cylindrical {
  assertFinite(p.x, p.y, p.z);
  const rho = Math.hypot(p.x, p.y);
  const phi = rho < EPS ? null : normalizeAngle(Math.atan2(p.y, p.x));
  return { system: 'cylindrical', rho: clean(rho), phi, z: clean(p.z) };
}

export function cylToCart(p: Cylindrical): Cartesian {
  assertFinite(p.rho, p.z);
  if (p.rho < 0) throw new UndefinedResultError('ρ must be ≥ 0.');
  if (p.rho < EPS) return { system: 'cartesian', x: 0, y: 0, z: clean(p.z) };
  if (p.phi == null) throw new UndefinedResultError('φ is required when ρ > 0.');
  assertFinite(p.phi);
  return { system: 'cartesian', x: clean(p.rho * Math.cos(p.phi)), y: clean(p.rho * Math.sin(p.phi)), z: clean(p.z) };
}

export function cartToSph(p: Cartesian): Spherical {
  assertFinite(p.x, p.y, p.z);
  const r = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
  if (r < EPS) return { system: 'spherical', r: 0, theta: null, phi: null };
  const rhoXY = Math.hypot(p.x, p.y);
  return {
    system: 'spherical',
    r,
    theta: Math.acos(clamp(p.z / r, -1, 1)),
    phi: rhoXY < EPS ? null : normalizeAngle(Math.atan2(p.y, p.x)),
  };
}

export function sphToCart(p: Spherical): Cartesian {
  assertFinite(p.r);
  if (p.r < 0) throw new UndefinedResultError('r must be ≥ 0.');
  if (p.r < EPS) return { system: 'cartesian', x: 0, y: 0, z: 0 };
  if (p.theta == null) throw new UndefinedResultError('θ is required when r > 0.');
  assertFinite(p.theta);
  if (p.theta < -EPS || p.theta > Math.PI + EPS) throw new UndefinedResultError('θ must be in [0, π].');
  const s = Math.sin(p.theta);
  const rhoXY = clean(p.r * s);
  if (rhoXY === 0) return { system: 'cartesian', x: 0, y: 0, z: clean(p.r * Math.cos(p.theta)) };
  if (p.phi == null) throw new UndefinedResultError('φ is required when the point is off the z-axis.');
  assertFinite(p.phi);
  return {
    system: 'cartesian',
    x: clean(rhoXY * Math.cos(p.phi)),
    y: clean(rhoXY * Math.sin(p.phi)),
    z: clean(p.r * Math.cos(p.theta)),
  };
}

/** Direct cylindrical → spherical: r = √(ρ²+z²), θ = atan2(ρ, z), φ = φ. */
export function cylToSph(p: Cylindrical): Spherical {
  assertFinite(p.rho, p.z);
  if (p.rho < 0) throw new UndefinedResultError('ρ must be ≥ 0.');
  const r = Math.hypot(p.rho, p.z);
  if (r < EPS) return { system: 'spherical', r: 0, theta: null, phi: null };
  if (p.rho < EPS) return { system: 'spherical', r, theta: p.z > 0 ? 0 : Math.PI, phi: null };
  if (p.phi == null) throw new UndefinedResultError('φ is required when ρ > 0.');
  return { system: 'spherical', r, theta: Math.atan2(p.rho, p.z), phi: normalizeAngle(p.phi) };
}

/** Direct spherical → cylindrical: ρ = r sinθ, φ = φ, z = r cosθ. */
export function sphToCyl(p: Spherical): Cylindrical {
  const c = sphToCart(p); // validates input, handles singularities
  const rho = Math.hypot(c.x, c.y);
  if (rho < EPS) return { system: 'cylindrical', rho: 0, phi: null, z: c.z };
  return { system: 'cylindrical', rho, phi: normalizeAngle(p.phi as number), z: c.z };
}

export function toCartesian(p: Point): Cartesian {
  if (p.system === 'cartesian') return { ...p, x: clean(p.x), y: clean(p.y), z: clean(p.z) };
  return p.system === 'cylindrical' ? cylToCart(p) : sphToCart(p);
}

export function convertPoint(p: Point, to: System): Point {
  if (p.system === to) {
    // normalise (angles into range, noise removed) via Cartesian
    const c = toCartesian(p);
    return to === 'cartesian' ? c : to === 'cylindrical' ? cartToCyl(c) : cartToSph(c);
  }
  if (p.system === 'cartesian') return to === 'cylindrical' ? cartToCyl(p) : cartToSph(p);
  if (p.system === 'cylindrical') return to === 'cartesian' ? cylToCart(p) : cylToSph(p);
  return to === 'cartesian' ? sphToCart(p) : sphToCyl(p);
}
