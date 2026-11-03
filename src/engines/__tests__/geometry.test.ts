import { analyzeCurve, analyzeImplicit, angleArc, distancePointPlane, isoSurface, lineForms, makeLine, planeFromGeneral, planeFromPointNormal, sampleCurve } from '../geometry';
import { UndefinedResultError } from '../../utils/math';
import { norm } from '../vectors/vec3';

const f = (n: number) => String(n);
test('line forms (zero direction component handled)', () => {
  const l = makeLine([1, 2, 3], [2, 0, -1]);
  const r = lineForms(l, f);
  expect(r.parametric).toEqual(['x = 1 + 2t', 'y = 2 + 0t', 'z = 3 − 1t']);
  expect(r.symmetric).toBe('(x − 1)/2 = (z − 3)/-1 ; y = 2');
  expect(() => makeLine([0, 0, 0], [0, 0, 0])).toThrow(UndefinedResultError);
});
test('planes', () => {
  const p = planeFromGeneral(1, 1, 1, -3);
  expect(distancePointPlane(p, [0, 0, 0])).toBeCloseTo(Math.sqrt(3));
  const q = planeFromPointNormal([1, 0, 0], [1, 0, 0]);
  expect(q.d).toBe(-1);
  expect(() => planeFromGeneral(0, 0, 0, 1)).toThrow();
});
test('helix curvature = 1/2, frame is orthonormal', () => {
  const a = analyzeCurve({ x: 'cos(t)', y: 'sin(t)', z: 't' }, 1);
  expect(a.kappa).toBeCloseTo(0.5);
  expect(norm(a.T)).toBeCloseTo(1);
  expect(norm(a.N!)).toBeCloseTo(1);
  expect(norm(a.B!)).toBeCloseTo(1);
  expect(a.T[0] * a.N![0] + a.T[1] * a.N![1] + a.T[2] * a.N![2]).toBeCloseTo(0);
});
test('line as curve: curvature 0 and N,B undefined; singular point throws', () => {
  const a = analyzeCurve({ x: 't', y: '2t', z: '3t' }, 1);
  expect(a.kappa).toBe(0); expect(a.N).toBeNull(); expect(a.B).toBeNull();
  expect(() => analyzeCurve({ x: 't^2', y: 't^3', z: '0' }, 0)).toThrow(UndefinedResultError);
});
test('invalid curve expression gives a readable error', () => {
  expect(() => analyzeCurve({ x: 'cos(', y: 't', z: 't' }, 0)).toThrow(/x\(t\)/);
  expect(sampleCurve({ x: 't', y: 't', z: 't' }, 0, 1).length).toBeGreaterThan(10);
});
test('implicit surface: sphere gradient, validation, singular point', () => {
  const r = analyzeImplicit('x^2+y^2+z^2=9', [1, 2, 2]);
  expect(r.grad).toEqual([2, 4, 4]);
  expect(() => analyzeImplicit('x^2+y^2+z^2=9', [1, 1, 1])).toThrow(/not on the surface/);
  expect(() => analyzeImplicit('x^2+y^2=z^2', [0, 0, 0])).toThrow(UndefinedResultError);
  expect(analyzeImplicit('z = x^2 + y^2', [1, 1, 2]).grad).toEqual([-2, -2, 1]);
});
test('marching tetrahedra produces a sphere of radius 3', () => {
  const pos = isoSurface((x, y, z) => x * x + y * y + z * z - 9, 5, 24);
  expect(pos.length).toBeGreaterThan(300);
  for (let i = 0; i < pos.length; i += 3) expect(Math.hypot(pos[i], pos[i + 1], pos[i + 2])).toBeGreaterThan(2.7);
});
test('angle arc starts at a and ends at b direction', () => {
  const arc = angleArc([1, 0, 0], [0, 1, 0], 1);
  expect(arc[0][0]).toBeCloseTo(1); expect(arc[arc.length - 1][1]).toBeCloseTo(1);
  expect(() => angleArc([1, 0, 0], [-1, 0, 0], 1)).not.toThrow();
});
