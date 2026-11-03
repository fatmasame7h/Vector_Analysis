import { EPS, UndefinedResultError, clean, normalizeAngle } from '../../utils/math';
import { Vec3, dot, norm, scale } from '../vectors/vec3';

export type SurfaceSystem = 'cartesian' | 'cylindrical' | 'spherical';
export const SURFACE_COORDS: Record<SurfaceSystem, string[]> = {
  cartesian: ['x', 'y', 'z'], cylindrical: ['rho', 'phi', 'z'], spherical: ['r', 'theta', 'phi'],
};
export const COORD_SYMBOL: Record<string, string> = { x: 'x', y: 'y', z: 'z', rho: 'ρ', phi: 'φ', r: 'r', theta: 'θ' };

const R = 4, TAU = 2 * Math.PI;
const nf = (x: number) => String(parseFloat(x.toPrecision(6)));
const minus = (c: number) => (c >= 0 ? `− ${nf(c)}` : `+ ${nf(-c)}`);

function grid(f: (u: number, v: number) => Vec3, u0: number, u1: number, v0: number, v1: number, n = 36, m = 36): Vec3[][] {
  const rows: Vec3[][] = [];
  for (let i = 0; i <= n; i++) {
    const row: Vec3[] = [];
    for (let j = 0; j <= m; j++) row.push(f(u0 + ((u1 - u0) * i) / n, v0 + ((v1 - v0) * j) / m).map((x) => clean(x)) as Vec3);
    rows.push(row);
  }
  return rows;
}

export interface SurfaceInfo {
  shape: string;
  coordEq: string;            // e.g. "ρ = 2"
  implicit: string;           // Cartesian implicit form  F(x,y,z) = 0
  gradient: string;           // symbolic ∇F
  freeLabels: [string, string];
  freeIsAngle: [boolean, boolean];
  freeDefaults: [number, number];
  F: (p: Vec3) => number;
  grad: (p: Vec3) => Vec3;
  point: (u: number, v: number) => Vec3;
  validate: (u: number, v: number) => string | null;
  grid: Vec3[][];
  polyline?: Vec3[];          // degenerate surfaces (axis, point)
  degenerate?: string;
  notes: string[];
}

const noCheck = () => null;
const planeInfo = (over: Partial<SurfaceInfo> & Pick<SurfaceInfo, 'shape' | 'coordEq' | 'implicit' | 'gradient' | 'F' | 'grad' | 'point' | 'grid' | 'freeLabels' | 'freeIsAngle' | 'freeDefaults'>): SurfaceInfo =>
  ({ validate: noCheck, notes: [], ...over });

export function analyzeSurface(system: SurfaceSystem, coord: string, c: number): SurfaceInfo {
  if (!Number.isFinite(c)) throw new Error('The constant must be a finite number.');
  const key = `${system}:${coord}`;
  switch (key) {
    case 'cartesian:x': return planeInfo({
      shape: 'Plane perpendicular to the x-axis', coordEq: `x = ${nf(c)}`, implicit: `x ${minus(c)} = 0`, gradient: '∇F = (1, 0, 0)',
      F: (p) => p[0] - c, grad: () => [1, 0, 0], point: (u, v) => [c, u, v], freeLabels: ['y', 'z'], freeIsAngle: [false, false], freeDefaults: [1, 1],
      grid: grid((u, v) => [c, u, v], -R, R, -R, R, 12, 12) });
    case 'cartesian:y': return planeInfo({
      shape: 'Plane perpendicular to the y-axis', coordEq: `y = ${nf(c)}`, implicit: `y ${minus(c)} = 0`, gradient: '∇F = (0, 1, 0)',
      F: (p) => p[1] - c, grad: () => [0, 1, 0], point: (u, v) => [u, c, v], freeLabels: ['x', 'z'], freeIsAngle: [false, false], freeDefaults: [1, 1],
      grid: grid((u, v) => [u, c, v], -R, R, -R, R, 12, 12) });
    case 'cartesian:z': return planeInfo({
      shape: 'Horizontal plane', coordEq: `z = ${nf(c)}`, implicit: `z ${minus(c)} = 0`, gradient: '∇F = (0, 0, 1)',
      F: (p) => p[2] - c, grad: () => [0, 0, 1], point: (u, v) => [u, v, c], freeLabels: ['x', 'y'], freeIsAngle: [false, false], freeDefaults: [1, 1],
      grid: grid((u, v) => [u, v, c], -R, R, -R, R, 12, 12) });

    case 'cylindrical:rho': {
      if (c < 0) throw new UndefinedResultError('ρ = c requires c ≥ 0 (ρ is a nonnegative distance).');
      const common = { freeLabels: ['φ', 'z'] as [string, string], freeIsAngle: [true, false] as [boolean, boolean], freeDefaults: [Math.PI / 4, 1] as [number, number] };
      if (c < EPS) return planeInfo({ ...common, shape: 'The z-axis (degenerate)', coordEq: 'ρ = 0', implicit: 'x² + y² = 0', gradient: '∇F = (2x, 2y, 0)',
        F: (p) => p[0] ** 2 + p[1] ** 2, grad: (p) => [2 * p[0], 2 * p[1], 0], point: (_u, v) => [0, 0, v], grid: [],
        polyline: [[0, 0, -R], [0, 0, R]], degenerate: 'ρ = 0 is the z-axis, not a regular cylindrical surface. ∇F = 0 on it, so there is no unique normal, and φ is undefined.' });
      return planeInfo({ ...common, shape: 'Circular cylinder around the z-axis', coordEq: `ρ = ${nf(c)}`, implicit: `x² + y² ${minus(c * c)} = 0`, gradient: '∇F = (2x, 2y, 0)',
        F: (p) => p[0] ** 2 + p[1] ** 2 - c * c, grad: (p) => [2 * p[0], 2 * p[1], 0], point: (u, v) => [c * Math.cos(u), c * Math.sin(u), v],
        grid: grid((u, v) => [c * Math.cos(u), c * Math.sin(u), v], 0, TAU, -R, R, 48, 12),
        notes: ['The normal is radial: it equals ±a_ρ.'] });
    }
    case 'cylindrical:phi':
    case 'spherical:phi': {
      const ph = normalizeAngle(c), s = Math.sin(ph), co = Math.cos(ph);
      const sph = system === 'spherical';
      return planeInfo({
        shape: 'Half-plane through the z-axis', coordEq: `φ = ${nf(ph)} rad`,
        implicit: `${nf(-s)}·x + ${nf(co)}·y = 0   (with x cos φ₀ + y sin φ₀ ≥ 0)`, gradient: '∇F = (−sin φ₀, cos φ₀, 0) = a_φ',
        F: (p) => -s * p[0] + co * p[1], grad: () => [clean(-s), clean(co), 0],
        freeLabels: sph ? ['r', 'θ'] : ['ρ', 'z'], freeIsAngle: sph ? [false, true] : [false, false], freeDefaults: sph ? [2, Math.PI / 3] : [2, 1],
        point: sph ? (u, v) => [u * Math.sin(v) * co, u * Math.sin(v) * s, u * Math.cos(v)] : (u, v) => [u * co, u * s, v],
        validate: sph ? (u, v) => (u < 0 ? 'r must be ≥ 0.' : v < 0 || v > Math.PI ? 'θ must be in [0, π].' : null) : (u) => (u < 0 ? 'ρ must be ≥ 0 on the half-plane φ = c.' : null),
        grid: sph ? grid((u, v) => [u * Math.sin(v) * co, u * Math.sin(v) * s, u * Math.cos(v)], 0, R, 0, Math.PI, 12, 24) : grid((u, v) => [u * co, u * s, v], 0, R, -R, R, 12, 12),
        notes: ['Only the half with ρ ≥ 0 belongs to φ = c; the full plane also contains φ = c + π.', 'The edge of the half-plane is the z-axis, where φ itself is undefined.', 'Angle domain: φ is normalized to [0, 2π).'] });
    }
    case 'cylindrical:z': return planeInfo({
      shape: 'Horizontal plane', coordEq: `z = ${nf(c)}`, implicit: `z ${minus(c)} = 0`, gradient: '∇F = (0, 0, 1)',
      F: (p) => p[2] - c, grad: () => [0, 0, 1], point: (u, v) => [u * Math.cos(v), u * Math.sin(v), c],
      validate: (u) => (u < 0 ? 'ρ must be ≥ 0.' : null), freeLabels: ['ρ', 'φ'], freeIsAngle: [false, true], freeDefaults: [2, Math.PI / 4],
      grid: grid((u, v) => [u * Math.cos(v), u * Math.sin(v), c], 0, R, 0, TAU, 8, 48) });

    case 'spherical:r': {
      if (c < 0) throw new UndefinedResultError('r = c requires c ≥ 0 (r is a nonnegative distance).');
      const common = { freeLabels: ['θ', 'φ'] as [string, string], freeIsAngle: [true, true] as [boolean, boolean], freeDefaults: [Math.PI / 3, Math.PI / 4] as [number, number] };
      const pt = (u: number, v: number): Vec3 => [c * Math.sin(u) * Math.cos(v), c * Math.sin(u) * Math.sin(v), c * Math.cos(u)];
      if (c < EPS) return planeInfo({ ...common, shape: 'The origin (degenerate)', coordEq: 'r = 0', implicit: 'x² + y² + z² = 0', gradient: '∇F = (2x, 2y, 2z)',
        F: (p) => p[0] ** 2 + p[1] ** 2 + p[2] ** 2, grad: (p) => scale(p, 2), point: () => [0, 0, 0], grid: [], polyline: [[0, 0, 0], [0, 0, 0]],
        degenerate: 'r = 0 is just the origin, not a regular spherical surface. ∇F = 0 there, and θ and φ are undefined.' });
      return planeInfo({ ...common, shape: 'Sphere centered at the origin', coordEq: `r = ${nf(c)}`, implicit: `x² + y² + z² ${minus(c * c)} = 0`, gradient: '∇F = (2x, 2y, 2z) = 2r',
        F: (p) => p[0] ** 2 + p[1] ** 2 + p[2] ** 2 - c * c, grad: (p) => scale(p, 2), point: pt,
        validate: (u) => (u < 0 || u > Math.PI ? 'θ must be in [0, π].' : null), grid: grid(pt, 0, Math.PI, 0, TAU, 24, 48),
        notes: ['The normal is radial: it equals ±a_r.', 'At the poles (θ = 0, π) φ is undefined, but the surface and its normal are still regular.'] });
    }
    case 'spherical:theta': {
      if (c < -EPS || c > Math.PI + EPS) throw new UndefinedResultError('θ = c requires 0 ≤ c ≤ π.');
      const common = { freeLabels: ['r', 'φ'] as [string, string], freeIsAngle: [false, true] as [boolean, boolean], freeDefaults: [2, Math.PI / 4] as [number, number] };
      if (c < EPS || Math.abs(c - Math.PI) < EPS) {
        const up = c < EPS;
        return planeInfo({ ...common, shape: `The ${up ? 'positive' : 'negative'} z-axis (degenerate cone)`, coordEq: `θ = ${up ? '0' : 'π'}`,
          implicit: 'x² + y² = 0  (with z ' + (up ? '≥' : '≤') + ' 0)', gradient: '∇F = (2x, 2y, 0)',
          F: (p) => p[0] ** 2 + p[1] ** 2, grad: (p) => [2 * p[0], 2 * p[1], 0], point: (u) => [0, 0, up ? u : -u], grid: [],
          polyline: [[0, 0, 0], [0, 0, up ? R : -R]], degenerate: `θ = ${up ? '0' : 'π'} degenerates to the ${up ? 'positive' : 'negative'} z-axis. ∇F = 0 on it, so there is no unique normal, and φ is undefined.` });
      }
      const ok = (u: number) => (u < 0 ? 'r must be ≥ 0.' : null);
      if (Math.abs(c - Math.PI / 2) < 1e-12) return planeInfo({ ...common, shape: 'The xy-plane (θ = π/2 is a flat "cone")', coordEq: 'θ = π/2', implicit: 'z = 0', gradient: '∇F = (0, 0, 1)',
        F: (p) => p[2], grad: () => [0, 0, 1], point: (u, v) => [u * Math.cos(v), u * Math.sin(v), 0], validate: ok,
        grid: grid((u, v) => [u * Math.cos(v), u * Math.sin(v), 0], 0, R, 0, TAU, 8, 48), notes: ['At the origin θ is undefined, but the plane z = 0 itself is regular there.'] });
      const s = Math.sin(c), co = Math.cos(c);
      const pt = (u: number, v: number): Vec3 => [u * s * Math.cos(v), u * s * Math.sin(v), u * co];
      return planeInfo({ ...common, shape: `Circular cone around the z-axis (${co > 0 ? 'upper' : 'lower'} nappe)`, coordEq: `θ = ${nf(c)} rad`,
        implicit: `${nf(co * co)}·(x² + y²) ${minus(s * s)}·z² = 0`, gradient: '∇F = (2x cos²θ₀, 2y cos²θ₀, −2z sin²θ₀) ∥ a_θ',
        F: (p) => (p[0] ** 2 + p[1] ** 2) * co * co - p[2] ** 2 * s * s, grad: (p) => [2 * p[0] * co * co, 2 * p[1] * co * co, -2 * p[2] * s * s],
        point: pt, validate: ok, grid: grid(pt, 0, R, 0, TAU, 10, 48),
        notes: ['F = 0 describes both nappes of the cone; θ = c selects the one with sign(z) = sign(cos θ₀).', 'The apex (r = 0) is singular: ∇F = 0 there.'] });
    }
    default: throw new Error('Unknown surface.');
  }
}

export interface SurfaceNormal { grad: Vec3; unit: Vec3; d: number; F0: number }
/** Normal and tangent plane at P. Throws if P is not on the surface or the gradient vanishes. */
export function surfaceNormal(info: SurfaceInfo, P: Vec3): SurfaceNormal {
  const F0 = info.F(P);
  if (Math.abs(F0) > 1e-6 * (1 + dot(P, P))) throw new Error(`The point is not on the surface (F = ${F0}).`);
  const grad = info.grad(P).map((x) => clean(x)) as Vec3;
  const gm = norm(grad);
  if (gm < 1e-9) throw new UndefinedResultError(info.degenerate ?? '∇F(P₀) = 0: this point is singular, so a unique normal and tangent plane do not exist.');
  return { grad, unit: scale(grad, 1 / gm), d: dot(grad, P), F0 };
}
