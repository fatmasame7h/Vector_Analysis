import { isoSurface, parseImplicit, sampleCurve } from '../engines/geometry';
import { Vec3, norm } from '../engines/vectors/vec3';
import { num } from '../utils/parse';
import type { Shape } from './types';

export type ObjType = 'point' | 'vector' | 'vectors' | 'line' | 'plane' | 'curve' | 'surface';
export const OBJ_LABEL: Record<ObjType, string> = {
  point: 'Point', vector: 'Vector', vectors: 'Multiple vectors', line: 'Line', plane: 'Plane', curve: 'Curve', surface: 'Surface',
};
export interface FieldDef { key: string; label: string; def: string; area?: boolean; wide?: boolean }
export const FIELDS: Record<ObjType, FieldDef[]> = {
  point: [{ key: 'x', label: 'x', def: '2' }, { key: 'y', label: 'y', def: '3' }, { key: 'z', label: 'z', def: '1' }],
  vector: [
    { key: 'x', label: 'Vx', def: '1' }, { key: 'y', label: 'Vy', def: '2' }, { key: 'z', label: 'Vz', def: '3' },
    { key: 'ox', label: 'Start x', def: '0' }, { key: 'oy', label: 'Start y', def: '0' }, { key: 'oz', label: 'Start z', def: '0' }],
  vectors: [{ key: 'text', label: 'One vector per line: x y z', def: '1 0 0\n0 2 0\n0 0 3', area: true, wide: true }],
  line: [
    { key: 'px', label: 'Point x', def: '0' }, { key: 'py', label: 'Point y', def: '0' }, { key: 'pz', label: 'Point z', def: '0' },
    { key: 'dx', label: 'Direction a', def: '1' }, { key: 'dy', label: 'Direction b', def: '1' }, { key: 'dz', label: 'Direction c', def: '1' }],
  plane: [
    { key: 'px', label: 'Point x', def: '0' }, { key: 'py', label: 'Point y', def: '0' }, { key: 'pz', label: 'Point z', def: '1' },
    { key: 'nx', label: 'Normal a', def: '0' }, { key: 'ny', label: 'Normal b', def: '0' }, { key: 'nz', label: 'Normal c', def: '1' }],
  curve: [
    { key: 'x', label: 'x(t)', def: 'cos(t)' }, { key: 'y', label: 'y(t)', def: 'sin(t)' }, { key: 'z', label: 'z(t)', def: 't/3' },
    { key: 'tmin', label: 't min', def: '0' }, { key: 'tmax', label: 't max', def: '4*pi' }],
  surface: [{ key: 'expr', label: 'Equation, e.g. x^2+y^2+z^2=9 or z = x^2 - y^2', def: 'x^2 + y^2 + z^2 = 9', wide: true }],
};
export const defaultParams = (t: ObjType): Record<string, string> => Object.fromEntries(FIELDS[t].map((f) => [f.key, f.def]));

const v3 = (p: Record<string, string>, a: string, b: string, c: string, label: string): Vec3 =>
  [num(p[a], `${label} ${a}`), num(p[b], `${label} ${b}`), num(p[c], `${label} ${c}`)];

/** Convert user-entered parameters to drawable shapes (all from real calculations). */
export function buildShapes(type: ObjType, p: Record<string, string>, name: string): Shape[] {
  switch (type) {
    case 'point': return [{ kind: 'point', p: v3(p, 'x', 'y', 'z', 'Point'), label: name }];
    case 'vector': return [{ kind: 'vector', from: v3(p, 'ox', 'oy', 'oz', 'Start'), vec: v3(p, 'x', 'y', 'z', 'Vector'), label: name }];
    case 'vectors': {
      const rows = p.text.split('\n').map((r) => r.trim()).filter(Boolean);
      if (!rows.length) throw new Error('Enter at least one vector.');
      return rows.map((r, i) => {
        const c = r.split(/[\s,;]+/);
        if (c.length !== 3) throw new Error(`Line ${i + 1}: enter exactly three numbers.`);
        return { kind: 'vector', from: [0, 0, 0], vec: c.map((x) => num(x, `Line ${i + 1}`)) as Vec3, label: `${name}${i + 1}` } as Shape;
      });
    }
    case 'line': {
      const P = v3(p, 'px', 'py', 'pz', 'Point'), d = v3(p, 'dx', 'dy', 'dz', 'Direction');
      const m = norm(d); if (m < 1e-12) throw new Error('The direction vector is zero: the line is degenerate.');
      const u = d.map((x) => (x / m) * 9) as Vec3;
      return [{ kind: 'polyline', pts: [P.map((x, i) => x - u[i]) as Vec3, P.map((x, i) => x + u[i]) as Vec3], label: name }, { kind: 'point', p: P }];
    }
    case 'plane': {
      const P = v3(p, 'px', 'py', 'pz', 'Point'), n = v3(p, 'nx', 'ny', 'nz', 'Normal');
      if (norm(n) < 1e-12) throw new Error('The normal vector is zero: the plane is degenerate.');
      return [{ kind: 'plane', p: P, n, size: 8, label: name }, { kind: 'point', p: P }];
    }
    case 'curve': {
      const pts = sampleCurve({ x: p.x, y: p.y, z: p.z }, num(p.tmin, 't min'), num(p.tmax, 't max'));
      return [{ kind: 'polyline', pts, label: name }];
    }
    case 'surface': {
      const { F } = parseImplicit(p.expr);
      const positions = isoSurface(F, 5, 30);
      if (!positions.length) throw new Error('No part of this surface lies inside the box [−5, 5]³.');
      return [{ kind: 'mesh', positions }];
    }
  }
}
