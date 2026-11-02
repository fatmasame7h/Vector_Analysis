import { EPS, clamp, clean, UndefinedResultError, assertFinite } from '../../utils/math';
import { Vec3, add, cross, dot, norm, scale, sub } from './vec3';

export { add as addVectors, sub as subtractVectors, dot as dotProduct, cross as crossProduct, norm as magnitude };

const needNonZero = (v: Vec3, name: string) => {
  if (norm(v) < EPS) throw new UndefinedResultError(`${name} is the zero vector: the result is undefined.`);
};

export function unitVector(a: Vec3): Vec3 {
  needNonZero(a, 'A');
  return scale(a, 1 / norm(a));
}
export function scalarProjection(a: Vec3, b: Vec3): number {
  needNonZero(b, 'B');
  return dot(a, b) / norm(b);
}
export function vectorProjection(a: Vec3, b: Vec3): Vec3 {
  needNonZero(b, 'B');
  return scale(b, dot(a, b) / dot(b, b));
}
export function directionCosines(a: Vec3): Vec3 {
  needNonZero(a, 'A');
  const m = norm(a);
  return [a[0] / m, a[1] / m, a[2] / m];
}

/** Method 1 of the dot product: |A||B|cosθ (θ in radians). */
export function dotByAngle(magA: number, magB: number, theta: number): number {
  assertFinite(magA, magB, theta);
  if (magA < 0 || magB < 0) throw new Error('Magnitudes must be ≥ 0.');
  return clean(magA * magB * Math.cos(theta));
}

export interface AngleResult {
  theta: number; // radians, in [0, π]
  dot: number;
  magA: number;
  magB: number;
  alpha?: number; // sine method: reference angle from asin
  corrected?: boolean; // sine method: true when θ = π − α was used
}

function prep(a: Vec3, b: Vec3) {
  needNonZero(a, 'A');
  needNonZero(b, 'B');
  return { d: dot(a, b), ma: norm(a), mb: norm(b) };
}

export function angleCosine(a: Vec3, b: Vec3): AngleResult {
  const { d, ma, mb } = prep(a, b);
  return { theta: Math.acos(clamp(d / (ma * mb), -1, 1)), dot: d, magA: ma, magB: mb };
}

/** Sine method with the dot-product sign correction. */
export function angleSine(a: Vec3, b: Vec3): AngleResult {
  const { d, ma, mb } = prep(a, b);
  const alpha = Math.asin(clamp(norm(cross(a, b)) / (ma * mb), 0, 1));
  const tol = 1e-12 * ma * mb;
  let theta: number, corrected = false;
  if (d > tol) theta = alpha;
  else if (d < -tol) { theta = Math.PI - alpha; corrected = true; }
  else theta = Math.PI / 2;
  return { theta, dot: d, magA: ma, magB: mb, alpha, corrected };
}

export function angleBoth(a: Vec3, b: Vec3) {
  const cosine = angleCosine(a, b);
  const sine = angleSine(a, b);
  const difference = Math.abs(cosine.theta - sine.theta);
  // acos is ill-conditioned near 0 and π, asin near π/2: trust the better-conditioned one.
  const nearStraight = Math.abs(Math.cos(sine.theta)) > 0.99;
  return { cosine, sine, difference, agree: difference < 1e-6, theta: nearStraight ? sine.theta : cosine.theta };
}
