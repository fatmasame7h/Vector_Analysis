import { Cartesian, Point, toCartesian } from '../coordinates';
import { assertFinite, clean } from '../../utils/math';
import { Vec3 } from '../vectors/vec3';

const xyz = (c: Cartesian): Vec3 => [c.x, c.y, c.z];
const mk = (v: Vec3): Cartesian => ({ system: 'cartesian', x: clean(v[0]), y: clean(v[1]), z: clean(v[2]) });

/** Coordinate arithmetic (NOT vector addition). Both points are converted to Cartesian first. */
export function addPoints(a: Point, b: Point): Cartesian {
  const p = xyz(toCartesian(a)), q = xyz(toCartesian(b));
  return mk([p[0] + q[0], p[1] + q[1], p[2] + q[2]]);
}
export function subtractPoints(a: Point, b: Point): Cartesian {
  const p = xyz(toCartesian(a)), q = xyz(toCartesian(b));
  return mk([p[0] - q[0], p[1] - q[1], p[2] - q[2]]);
}
export function distanceBetween(a: Point, b: Point): number {
  const p = xyz(toCartesian(a)), q = xyz(toCartesian(b));
  return Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
}
export function midpoint(a: Point, b: Point): Cartesian {
  const p = xyz(toCartesian(a)), q = xyz(toCartesian(b));
  return mk([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2]);
}
export function distanceFromOrigin(a: Point): number {
  const p = toCartesian(a);
  return Math.hypot(p.x, p.y, p.z);
}

/** "3i + 4j + 5k" (negative terms are written with a minus sign). */
export function formatUnitForm(v: Vec3, digits = 6): string {
  const labels = ['i', 'j', 'k'];
  return v
    .map((c, idx) => {
      const n = Math.abs(parseFloat(clean(c).toFixed(digits)));
      const sign = c < 0 && n !== 0 ? '-' : '+';
      return { sign, text: `${n}${labels[idx]}`, first: idx === 0 };
    })
    .map((t) => (t.first ? (t.sign === '-' ? `-${t.text}` : t.text) : `${t.sign} ${t.text}`))
    .join(' ');
}

export interface PositionVectorResult {
  origin: Vec3;
  terminal: Vec3;
  components: Vec3;
  unitForm: string;
}
/** Position vector OP. Accepts CARTESIAN input only. */
export function positionVector(p: Point): PositionVectorResult {
  if (p.system !== 'cartesian')
    throw new Error('Position Vector accepts Cartesian input only. Convert the point first using Point Conversion.');
  assertFinite(p.x, p.y, p.z);
  const v: Vec3 = [p.x, p.y, p.z];
  return { origin: [0, 0, 0], terminal: v, components: v, unitForm: formatUnitForm(v) };
}
