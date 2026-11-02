import { Point, cartToCyl, cartToSph, convertPoint, cylToCart, cylToSph, sphToCart, sphToCyl, toCartesian } from '../coordinates';
import { toRad } from '../../utils/math';

const samples: [number, number, number][] = [[1, 2, 3], [-1, -2, -3], [0, 0, 5], [0, 0, -5], [3, 0, 0], [-2, 1, 0], [0, -4, 2]];
const cart = (x: number, y: number, z: number): Point => ({ system: 'cartesian', x, y, z });
const same = (a: Point, b: Point) => {
  const p = toCartesian(a), q = toCartesian(b);
  expect(p.x).toBeCloseTo(q.x, 9); expect(p.y).toBeCloseTo(q.y, 9); expect(p.z).toBeCloseTo(q.z, 9);
};

describe('Point conversion – six directions', () => {
  test('Cartesian → Cylindrical', () => {
    const c = cartToCyl({ system: 'cartesian', x: 1, y: 1, z: 2 });
    expect(c.rho).toBeCloseTo(Math.SQRT2); expect(c.phi).toBeCloseTo(Math.PI / 4); expect(c.z).toBe(2);
  });
  test('Cylindrical → Cartesian', () => {
    const c = cylToCart({ system: 'cylindrical', rho: 2, phi: Math.PI / 2, z: 1 });
    expect(c.x).toBeCloseTo(0); expect(c.y).toBeCloseTo(2); expect(c.z).toBe(1);
  });
  test('Cartesian → Spherical', () => {
    const s = cartToSph({ system: 'cartesian', x: 0, y: 0, z: 3 });
    expect(s.r).toBe(3); expect(s.theta).toBeCloseTo(0);
  });
  test('Spherical → Cartesian', () => {
    const c = sphToCart({ system: 'spherical', r: 2, theta: Math.PI / 2, phi: Math.PI / 2 });
    expect(c.x).toBeCloseTo(0); expect(c.y).toBeCloseTo(2); expect(c.z).toBeCloseTo(0);
  });
  test('Cylindrical → Spherical (direct)', () => {
    const s = cylToSph({ system: 'cylindrical', rho: 3, phi: toRad(30), z: 4 });
    expect(s.r).toBeCloseTo(5); expect(s.theta).toBeCloseTo(Math.atan2(3, 4)); expect(s.phi).toBeCloseTo(toRad(30));
  });
  test('Spherical → Cylindrical (direct)', () => {
    const c = sphToCyl({ system: 'spherical', r: 5, theta: Math.atan2(3, 4), phi: toRad(30) });
    expect(c.rho).toBeCloseTo(3); expect(c.z).toBeCloseTo(4); expect(c.phi).toBeCloseTo(toRad(30));
  });
});

describe('Round trips', () => {
  test.each(samples)('(%p, %p, %p)', (x, y, z) => {
    const p = cart(x, y, z);
    same(convertPoint(convertPoint(p, 'cylindrical'), 'cartesian'), p);
    same(convertPoint(convertPoint(p, 'spherical'), 'cartesian'), p);
    const cyl = convertPoint(p, 'cylindrical');
    same(convertPoint(convertPoint(cyl, 'spherical'), 'cylindrical'), p);
  });
});

describe('Singularities', () => {
  test('origin has undefined angles (null, not 0)', () => {
    expect(cartToCyl({ system: 'cartesian', x: 0, y: 0, z: 0 }).phi).toBeNull();
    const s = cartToSph({ system: 'cartesian', x: 0, y: 0, z: 0 });
    expect(s.theta).toBeNull(); expect(s.phi).toBeNull();
  });
  test('z-axis: φ undefined, θ defined', () => {
    const s = cartToSph({ system: 'cartesian', x: 0, y: 0, z: -5 });
    expect(s.theta).toBeCloseTo(Math.PI); expect(s.phi).toBeNull();
  });
  test('invalid inputs throw', () => {
    expect(() => cylToCart({ system: 'cylindrical', rho: -1, phi: 0, z: 0 })).toThrow();
    expect(() => sphToCart({ system: 'spherical', r: 1, theta: null, phi: 0 })).toThrow();
    expect(() => sphToCart({ system: 'spherical', r: 1, theta: 4, phi: 0 })).toThrow();
    expect(() => cartToCyl({ system: 'cartesian', x: NaN, y: 0, z: 0 })).toThrow();
  });
  test('angles are normalised to [0, 2π)', () => {
    const c = cartToCyl({ system: 'cartesian', x: 1, y: -1, z: 0 });
    expect(c.phi).toBeCloseTo((7 * Math.PI) / 4);
    const n = convertPoint({ system: 'cylindrical', rho: 1, phi: -Math.PI / 2, z: 0 }, 'cylindrical');
    expect((n as { phi: number }).phi).toBeCloseTo((3 * Math.PI) / 2);
  });
});
