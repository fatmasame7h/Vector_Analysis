import { derivative, parse, simplify, type MathNode } from 'mathjs';
import { EPS, UndefinedResultError } from '../../utils/math';
import { Vec3, cross, dot, norm, scale } from '../vectors/vec3';

/* ---------- Lines ---------- */
export interface Line { p: Vec3; d: Vec3 }
export function makeLine(p: Vec3, d: Vec3): Line {
  if (norm(d) < EPS) throw new UndefinedResultError('The direction vector is zero: the line is degenerate.');
  return { p, d };
}
export function lineForms(l: Line, f: (n: number) => string) {
  const names = ['x', 'y', 'z'];
  const sg = (v: number) => (v < 0 ? `− ${f(-v)}` : `+ ${f(v)}`);
  const parametric = names.map((n, i) => `${n} = ${f(l.p[i])} ${sg(l.d[i])}t`);
  const nonzero = names.map((n, i) => ({ n, i })).filter(({ i }) => Math.abs(l.d[i]) > EPS);
  const zero = names.map((n, i) => ({ n, i })).filter(({ i }) => Math.abs(l.d[i]) <= EPS);
  const part = ({ n, i }: { n: string; i: number }) => `(${n} − ${f(l.p[i])})/${f(l.d[i])}`;
  const symmetric = [nonzero.map(part).join(' = '), ...zero.map(({ n, i }) => `${n} = ${f(l.p[i])}`)].join(' ; ');
  return { parametric, symmetric };
}

/* ---------- Planes ---------- */
export interface Plane { n: Vec3; d: number } // n·r + d = 0
export function planeFromPointNormal(p: Vec3, n: Vec3): Plane {
  if (norm(n) < EPS) throw new UndefinedResultError('The normal vector is zero: the plane is degenerate.');
  return { n, d: -dot(n, p) };
}
export function planeFromGeneral(A: number, B: number, C: number, D: number): Plane {
  if (Math.hypot(A, B, C) < EPS) throw new UndefinedResultError('A, B and C are all zero: this is not a plane.');
  return { n: [A, B, C], d: D };
}
export const distancePointPlane = (pl: Plane, P: Vec3) => Math.abs(dot(pl.n, P) + pl.d) / norm(pl.n);
export const pointOnPlane = (pl: Plane): Vec3 => scale(pl.n, -pl.d / dot(pl.n, pl.n));
export const footOnPlane = (pl: Plane, P: Vec3): Vec3 => {
  const k = (dot(pl.n, P) + pl.d) / dot(pl.n, pl.n);
  return [P[0] - k * pl.n[0], P[1] - k * pl.n[1], P[2] - k * pl.n[2]];
};

/* ---------- Curves r(t) = (x(t), y(t), z(t)) ---------- */
export interface CurveExprs { x: string; y: string; z: string }
type Fn = (t: number) => number;

function compileComponent(expr: string, label: string) {
  try {
    const node = parse(expr);
    const code = node.compile();
    const f: Fn = (t) => {
      const v = code.evaluate({ t });
      if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`${label}(t) is not a finite real number at t = ${t}.`);
      return v;
    };
    return { node, f };
  } catch (e) {
    throw new Error(`${label}(t): ${(e as Error).message}`);
  }
}
function derive(node: MathNode, label: string) {
  try {
    const d = simplify(derivative(node, 't'));
    const code = d.compile();
    return { text: d.toString(), f: ((t: number) => Number(code.evaluate({ t }))) as Fn, node: d };
  } catch (e) {
    throw new Error(`Cannot differentiate ${label}(t): ${(e as Error).message}`);
  }
}

export interface CurveAnalysis {
  t0: number; r: Vec3; r1: Vec3; r2: Vec3; d1: string[]; d2: string[];
  speed: number; T: Vec3; N: Vec3 | null; B: Vec3 | null; kappa: number; straight: boolean;
}
export function analyzeCurve(e: CurveExprs, t0: number): CurveAnalysis {
  const labels = ['x', 'y', 'z'] as const;
  const comps = labels.map((l) => compileComponent(e[l], l));
  const d1 = comps.map((c, i) => derive(c.node, labels[i]));
  const d2 = d1.map((d, i) => derive(d.node, `${labels[i]}′`));
  const ev = (fs: Fn[]): Vec3 => [fs[0](t0), fs[1](t0), fs[2](t0)];
  const r = ev(comps.map((c) => c.f)), r1 = ev(d1.map((d) => d.f)), r2 = ev(d2.map((d) => d.f));
  [r, r1, r2].forEach((v) => v.forEach((x) => { if (!Number.isFinite(x)) throw new UndefinedResultError(`The curve or its derivative is not defined at t = ${t0}.`); }));
  const speed = norm(r1);
  if (speed < 1e-9) throw new UndefinedResultError("r′(t₀) = 0: the tangent vector is undefined at this parameter (singular point).");
  const T = scale(r1, 1 / speed);
  const c = cross(r1, r2), cm = norm(c);
  const straight = cm < 1e-9 * speed * Math.max(1, norm(r2));
  const kappa = straight ? 0 : cm / speed ** 3;
  const B = straight ? null : scale(c, 1 / cm);
  const N = B ? cross(B, T) : null;
  return { t0, r, r1, r2, d1: d1.map((d) => d.text), d2: d2.map((d) => d.text), speed, T, N, B, kappa, straight };
}
export function sampleCurve(e: CurveExprs, tmin: number, tmax: number, n = 240): Vec3[] {
  if (!(tmax > tmin)) throw new Error('t max must be greater than t min.');
  const fs = (['x', 'y', 'z'] as const).map((l) => compileComponent(e[l], l).f);
  const pts: Vec3[] = [];
  for (let i = 0; i <= n; i++) {
    const t = tmin + ((tmax - tmin) * i) / n;
    try { pts.push([fs[0](t), fs[1](t), fs[2](t)]); } catch { /* skip undefined samples */ }
  }
  if (pts.length < 2) throw new Error('The curve could not be evaluated on this interval.');
  return pts;
}

/* ---------- Implicit surfaces F(x,y,z) = 0 ---------- */
export function parseImplicit(expr: string) {
  let s = expr.trim();
  if (!s) throw new Error('Enter an equation such as x^2 + y^2 + z^2 = 9.');
  if (s.includes('=')) {
    const parts = s.split('=');
    if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) throw new Error('Use exactly one "=" sign.');
    s = `(${parts[0]}) - (${parts[1]})`;
  }
  let node: MathNode;
  try { node = parse(s); node.compile().evaluate({ x: 0, y: 0, z: 0 }); }
  catch (e) { throw new Error(`Invalid equation: ${(e as Error).message}`); }
  const code = node.compile();
  const F = (x: number, y: number, z: number) => { const v = code.evaluate({ x, y, z }); return typeof v === 'number' ? v : NaN; };
  return { node, F, normalized: s };
}
export interface ImplicitAnalysis { F0: number; gradText: string[]; grad: Vec3; unit: Vec3; d: number }
export function analyzeImplicit(expr: string, P: Vec3, tol = 1e-6): ImplicitAnalysis {
  const { node, F } = parseImplicit(expr);
  const F0 = F(P[0], P[1], P[2]);
  if (!Number.isFinite(F0)) throw new UndefinedResultError('F is not defined at the selected point.');
  if (Math.abs(F0) > tol) throw new Error(`The point is not on the surface: F(P₀) = ${F0} ≠ 0 (tolerance ${tol}).`);
  const ds = (['x', 'y', 'z'] as const).map((v) => simplify(derivative(node, v)));
  const grad = ds.map((d) => Number(d.compile().evaluate({ x: P[0], y: P[1], z: P[2] }))) as Vec3;
  if (grad.some((g) => !Number.isFinite(g))) throw new UndefinedResultError('The gradient is not defined at this point.');
  const gm = norm(grad);
  if (gm < 1e-9) throw new UndefinedResultError('∇F(P₀) = 0: this is a singular point, so a unique normal and tangent plane do not exist.');
  return { F0, gradText: ds.map((d) => d.toString()), grad, unit: scale(grad, 1 / gm), d: dot(grad, P) };
}

/* ---------- Marching tetrahedra (draws F = 0) ---------- */
export function isoSurface(f: (x: number, y: number, z: number) => number, R = 5, N = 30): number[] {
  const h = (2 * R) / N, M = N + 1;
  const vals = new Float64Array(M * M * M);
  const id = (i: number, j: number, k: number) => (k * M + j) * M + i;
  for (let k = 0; k < M; k++) for (let j = 0; j < M; j++) for (let i = 0; i < M; i++) {
    let v = NaN; try { v = f(-R + i * h, -R + j * h, -R + k * h); } catch { /* NaN */ }
    vals[id(i, j, k)] = v;
  }
  const corner = [[0,0,0],[1,0,0],[0,1,0],[1,1,0],[0,0,1],[1,0,1],[0,1,1],[1,1,1]];
  const tets = [[0,1,3,7],[0,3,2,7],[0,2,6,7],[0,6,4,7],[0,4,5,7],[0,5,1,7]];
  const out: number[] = [];
  const tetra = (p: number[][], v: number[]) => {
    const ins: number[] = [], outs: number[] = [];
    v.forEach((x, q) => (x < 0 ? ins : outs).push(q));
    if (!ins.length || ins.length === 4) return;
    const L = (a: number, b: number) => { const t = v[a] / (v[a] - v[b]); return [0, 1, 2].map((c) => p[a][c] + t * (p[b][c] - p[a][c])); };
    const tri = (...pts: number[][]) => pts.forEach((q) => out.push(q[0], q[1], q[2]));
    if (ins.length === 1) tri(L(ins[0], outs[0]), L(ins[0], outs[1]), L(ins[0], outs[2]));
    else if (ins.length === 3) tri(L(outs[0], ins[0]), L(outs[0], ins[1]), L(outs[0], ins[2]));
    else {
      const [a, b] = ins, [c, d] = outs;
      const p0 = L(a, c), p1 = L(a, d), p2 = L(b, d), p3 = L(b, c);
      tri(p0, p1, p2, p0, p2, p3);
    }
  };
  for (let k = 0; k < N; k++) for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const pos = corner.map((c) => [-R + (i + c[0]) * h, -R + (j + c[1]) * h, -R + (k + c[2]) * h]);
    const v = corner.map((c) => vals[id(i + c[0], j + c[1], k + c[2])]);
    if (v.some((x) => !Number.isFinite(x))) continue;
    for (const t of tets) tetra(t.map((q) => pos[q]), t.map((q) => v[q]));
  }
  return out;
}

/* ---------- Angle arc between two vectors (for the 3D view) ---------- */
export function angleArc(a: Vec3, b: Vec3, radius: number, n = 32): Vec3[] {
  const ua = scale(a, 1 / norm(a)), ub = scale(b, 1 / norm(b));
  const c = Math.min(1, Math.max(-1, dot(ua, ub)));
  const th = Math.acos(c);
  let w = cross(ua, ub);
  if (norm(w) < 1e-9) { // parallel / opposite: pick any perpendicular direction
    w = Math.abs(ua[0]) < 0.9 ? cross(ua, [1, 0, 0]) : cross(ua, [0, 1, 0]);
  }
  const perp = cross(w, ua); // in-plane unit direction perpendicular to ua (before normalising)
  const pm = norm(perp);
  const e2 = pm < 1e-12 ? ub : scale(perp, 1 / pm);
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = (th * i) / n;
    return [0, 1, 2].map((k) => radius * (Math.cos(t) * ua[k] + Math.sin(t) * e2[k])) as Vec3;
  });
}
