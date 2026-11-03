import { SurfaceSystem, analyzeSurface, surfaceNormal } from '../surfaces/coordinateSurfaces';
import { UndefinedResultError } from '../../utils/math';
import { Vec3, cross, norm } from '../vectors/vec3';

const par = (a: Vec3, b: Vec3) => expect(norm(cross(a, b))).toBeCloseTo(0, 9);
const reg = (sys: SurfaceSystem, coord: string, c: number, u: number, v: number) => {
  const info = analyzeSurface(sys, coord, c);
  const P = info.point(u, v);
  expect(Math.abs(info.F(P))).toBeLessThan(1e-9); // point really lies on the surface
  return { info, P, n: surfaceNormal(info, P) };
};

describe('Nine constant-coordinate surfaces', () => {
  test('x = c, y = c, z = c', () => {
    par(reg('cartesian', 'x', 2, 1, 1).n.unit, [1, 0, 0]);
    par(reg('cartesian', 'y', -1, 1, 1).n.unit, [0, 1, 0]);
    par(reg('cartesian', 'z', 3, 1, 1).n.unit, [0, 0, 1]);
    expect(reg('cartesian', 'x', 2, 1, 1).info.shape).toMatch(/Plane/);
  });
  test('ρ = c: cylinder, radial normal', () => {
    const { P, n, info } = reg('cylindrical', 'rho', 2, Math.PI / 3, 1);
    par(n.unit, [P[0], P[1], 0]); expect(info.shape).toMatch(/cylinder/);
    expect(n.unit[2]).toBeCloseTo(0);
  });
  test('φ = c: half-plane, normal = a_φ', () => {
    const { n, info } = reg('cylindrical', 'phi', Math.PI / 6, 2, 1);
    expect(n.unit[0]).toBeCloseTo(-Math.sin(Math.PI / 6)); expect(n.unit[1]).toBeCloseTo(Math.cos(Math.PI / 6));
    expect(info.shape).toMatch(/Half-plane/);
    expect(info.validate(-1, 0)).not.toBeNull();
  });
  test('z = c (cylindrical)', () => par(reg('cylindrical', 'z', 2, 1, 1).n.unit, [0, 0, 1]));
  test('r = c: sphere, radial normal', () => {
    const { P, n } = reg('spherical', 'r', 3, 1, 0.5); par(n.unit, P);
  });
  test('θ = c: cone, normal ∥ a_θ', () => {
    const th = Math.PI / 3, ph = 0.7;
    const { n, info } = reg('spherical', 'theta', th, 2, ph);
    par(n.unit, [Math.cos(th) * Math.cos(ph), Math.cos(th) * Math.sin(ph), -Math.sin(th)]);
    expect(info.shape).toMatch(/cone/);
  });
  test('φ = c (spherical): half-plane', () => {
    const { n } = reg('spherical', 'phi', Math.PI / 2, 2, 1);
    par(n.unit, [1, 0, 0]);
  });
});

describe('Singularities', () => {
  test('ρ = 0 is the z-axis', () => {
    const i = analyzeSurface('cylindrical', 'rho', 0);
    expect(i.degenerate).toMatch(/z-axis/);
    expect(() => surfaceNormal(i, [0, 0, 1])).toThrow(UndefinedResultError);
  });
  test('r = 0 is the origin; θ = 0, π are the z-axis', () => {
    expect(analyzeSurface('spherical', 'r', 0).degenerate).toMatch(/origin/);
    expect(analyzeSurface('spherical', 'theta', 0).degenerate).toMatch(/positive z-axis/);
    expect(analyzeSurface('spherical', 'theta', Math.PI).degenerate).toMatch(/negative z-axis/);
  });
  test('cone apex has no unique normal', () => {
    const i = analyzeSurface('spherical', 'theta', Math.PI / 4);
    expect(() => surfaceNormal(i, i.point(0, 0))).toThrow(UndefinedResultError);
  });
  test('θ = π/2 is the xy-plane; invalid constants are rejected', () => {
    par(reg('spherical', 'theta', Math.PI / 2, 2, 1).n.unit, [0, 0, 1]);
    expect(() => analyzeSurface('cylindrical', 'rho', -1)).toThrow();
    expect(() => analyzeSurface('spherical', 'theta', 4)).toThrow();
  });
  test('a point off the surface is rejected', () => {
    expect(() => surfaceNormal(analyzeSurface('spherical', 'r', 3), [1, 1, 1])).toThrow(/not on the surface/);
  });
});
