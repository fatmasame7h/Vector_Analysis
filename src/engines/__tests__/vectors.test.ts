import { Point } from '../coordinates';
import { basisAt, convertVector, vectorToCartesian } from '../vectors/basis';
import {
  addVectors, angleBoth, angleCosine, angleSine, crossProduct, directionCosines, dotByAngle, dotProduct,
  magnitude, scalarProjection, unitVector, vectorProjection,
} from '../vectors/ops';
import { Vec3 } from '../vectors/vec3';
import { UndefinedResultError, toRad, toDeg } from '../../utils/math';

const cartPt = (x: number, y: number, z: number): Point => ({ system: 'cartesian', x, y, z });
const close = (a: Vec3, b: Vec3) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 9));

describe('Local bases & vector conversion', () => {
  test('cylindrical components at (1,1,0)', () => {
    const r = convertVector({ system: 'cartesian', components: [1, 0, 0] }, 'cylindrical', cartPt(1, 1, 0));
    close(r.components, [Math.SQRT1_2, -Math.SQRT1_2, 0]);
  });
  test('spherical components at (1,0,0)', () => {
    const b = basisAt('spherical', cartPt(1, 0, 0));
    close(b.e1, [1, 0, 0]); close(b.e2, [0, 0, -1]); close(b.e3, [0, 1, 0]);
    const r = convertVector({ system: 'cartesian', components: [0, 0, 1] }, 'spherical', cartPt(1, 0, 0));
    close(r.components, [0, -1, 0]);
  });
  test('round trips at several points', () => {
    for (const p of [cartPt(1, 2, 3), cartPt(-2, 1, -1), cartPt(0, 3, 4)]) {
      const A: Vec3 = [1.5, -2, 0.7];
      for (const sys of ['cylindrical', 'spherical'] as const) {
        const v = convertVector({ system: 'cartesian', components: A }, sys, p);
        close(vectorToCartesian(v, p), A);
      }
      const cyl = convertVector({ system: 'cartesian', components: A }, 'cylindrical', p);
      const sph = convertVector(cyl, 'spherical', p);
      close(vectorToCartesian(sph, p), A);
      expect(magnitude(sph.components)).toBeCloseTo(magnitude(A));
    }
  });
  test('basis vectors are orthonormal', () => {
    for (const s of ['cylindrical', 'spherical'] as const) {
      const b = basisAt(s, cartPt(1, 2, 3));
      expect(dotProduct(b.e1, b.e2)).toBeCloseTo(0); expect(dotProduct(b.e1, b.e3)).toBeCloseTo(0);
      expect(dotProduct(b.e2, b.e3)).toBeCloseTo(0); expect(magnitude(b.e1)).toBeCloseTo(1);
    }
  });
  test('different bases are converted to Cartesian before adding', () => {
    const a = vectorToCartesian({ system: 'cylindrical', components: [1, 0, 0] }, cartPt(0, 1, 0)); // a_ρ = +y here
    const b = vectorToCartesian({ system: 'cartesian', components: [1, 0, 0] });
    close(addVectors(a, b), [1, 1, 0]);
  });
  test('singularities throw instead of returning fake numbers', () => {
    expect(() => basisAt('cylindrical', cartPt(0, 0, 2))).toThrow(UndefinedResultError);
    expect(() => basisAt('spherical', cartPt(0, 0, 2))).toThrow(UndefinedResultError);
    expect(() => basisAt('spherical', cartPt(0, 0, 0))).toThrow(UndefinedResultError);
    expect(() => basisAt('cylindrical')).toThrow(/point of application/);
  });
});

describe('Vector operations', () => {
  const A: Vec3 = [1, 2, 3], B: Vec3 = [4, -5, 6];
  test('basic operations', () => {
    expect(dotProduct(A, B)).toBe(12);
    expect(crossProduct(A, B)).toEqual([27, 6, -13]);
    expect(magnitude([3, 4, 0])).toBe(5);
    close(unitVector([0, 3, 4]), [0, 0.6, 0.8]);
    expect(scalarProjection([3, 4, 0], [1, 0, 0])).toBeCloseTo(3);
    close(vectorProjection([3, 4, 0], [2, 0, 0]), [3, 0, 0]);
    close(directionCosines([0, 3, 4]), [0, 0.6, 0.8]);
  });
  test('zero vectors are undefined', () => {
    expect(() => unitVector([0, 0, 0])).toThrow(UndefinedResultError);
    expect(() => directionCosines([0, 0, 0])).toThrow(UndefinedResultError);
    expect(() => vectorProjection(A, [0, 0, 0])).toThrow(UndefinedResultError);
  });
});

describe('Dot product – two methods', () => {
  test('|A|=5, |B|=4, θ=60° → 10', () => {
    expect(dotByAngle(5, 4, toRad(60))).toBeCloseTo(10);
  });
  test('both methods agree for the same vectors', () => {
    const A: Vec3 = [5, 0, 0], B: Vec3 = [4 * Math.cos(toRad(60)), 4 * Math.sin(toRad(60)), 0];
    expect(dotProduct(A, B)).toBeCloseTo(dotByAngle(magnitude(A), magnitude(B), angleCosine(A, B).theta));
    expect(dotProduct(A, B)).toBeCloseTo(10);
  });
});

describe('Angle between vectors', () => {
  const at = (deg: number): Vec3 => [Math.cos(toRad(deg)), Math.sin(toRad(deg)), 0];
  test.each([30, 90, 150])('%i° (cosine, sine and both)', (deg) => {
    expect(toDeg(angleCosine([1, 0, 0], at(deg)).theta)).toBeCloseTo(deg, 6);
    expect(toDeg(angleSine([1, 0, 0], at(deg)).theta)).toBeCloseTo(deg, 6);
    expect(angleBoth([1, 0, 0], at(deg)).agree).toBe(true);
  });
  test('sine method uses 180° − α for obtuse angles', () => {
    const r = angleSine([1, 0, 0], at(150));
    expect(r.corrected).toBe(true);
    expect(toDeg(r.alpha as number)).toBeCloseTo(30, 6);
    expect(toDeg(r.theta)).toBeCloseTo(150, 6);
  });
  test('parallel → 0°, opposite → 180°', () => {
    expect(toDeg(angleBoth([1, 0, 0], [2, 0, 0]).theta)).toBeCloseTo(0, 6);
    expect(toDeg(angleBoth([1, 0, 0], [-3, 0, 0]).theta)).toBeCloseTo(180, 6);
    expect(toDeg(angleSine([1, 0, 0], [-3, 0, 0]).theta)).toBeCloseTo(180, 6);
  });
  test('nearly parallel vectors do not break acos (clamping)', () => {
    expect(() => angleCosine([1, 1e-9, 0], [2, 2e-9, 0])).not.toThrow();
  });
  test('zero vector → undefined', () => {
    expect(() => angleCosine([0, 0, 0], [1, 0, 0])).toThrow(UndefinedResultError);
    expect(() => angleSine([1, 0, 0], [0, 0, 0])).toThrow(UndefinedResultError);
  });
});
