import type { Point, System } from '../../engines/coordinates';
import type { VectorValue } from '../../engines/vectors/basis';
import type { Vec3 } from '../../engines/vectors/vec3';
import type { AngleUnit } from '../../utils/math';
import { angleIn, num } from '../../utils/parse';
import { useSettings } from '../../context/SettingsContext';

export const inputCls = 'w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink placeholder:text-muted/60';

export function Field({ label, value, onChange, placeholder, area }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; area?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-muted">{label}</span>
      {area
        ? <textarea className={inputCls + ' font-mono'} rows={4} value={value} onChange={(e) => onChange(e.target.value)} />
        : <input className={inputCls} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} inputMode="text" autoComplete="off" />}
    </label>
  );
}
export function SelectField<T extends string>({ label, value, onChange, options }: {
  label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[];
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-muted">{label}</span>
      <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export const SYSTEMS: { value: System; label: string }[] = [
  { value: 'cartesian', label: 'Cartesian (x, y, z)' },
  { value: 'cylindrical', label: 'Cylindrical (ρ, φ, z)' },
  { value: 'spherical', label: 'Spherical (r, θ, φ)' },
];
export const SYSTEM_NAME: Record<System, string> = { cartesian: 'Cartesian', cylindrical: 'Cylindrical', spherical: 'Spherical' };

export interface PointState { system: System; a: string; b: string; c: string }
export interface VectorState { system: System; a: string; b: string; c: string; pt: PointState }
export const defaultPoint = (): PointState => ({ system: 'cartesian', a: '1', b: '2', c: '3' });
export const defaultVector = (): VectorState => ({ system: 'cartesian', a: '1', b: '2', c: '3', pt: { system: 'cartesian', a: '1', b: '1', c: '1' } });

const PLABEL: Record<System, [string, string, string]> = { cartesian: ['x', 'y', 'z'], cylindrical: ['ρ', 'φ', 'z'], spherical: ['r', 'θ', 'φ'] };
const VLABEL: Record<System, [string, string, string]> = { cartesian: ['Ax', 'Ay', 'Az'], cylindrical: ['Aρ', 'Aφ', 'Az'], spherical: ['Ar', 'Aθ', 'Aφ'] };
const ANGLE: Record<System, number[]> = { cartesian: [], cylindrical: [1], spherical: [1, 2] };
export const pointLabels = (s: System) => PLABEL[s];
export const vectorLabels = (s: System) => VLABEL[s];

export function PointForm({ value, onChange, title, lockCartesian }: {
  value: PointState; onChange: (v: PointState) => void; title?: string; lockCartesian?: boolean;
}) {
  const { angleUnit } = useSettings();
  const keys = ['a', 'b', 'c'] as const;
  return (
    <div className="space-y-3">
      {title && <h3 className="font-semibold">{title}</h3>}
      {lockCartesian
        ? <p className="text-sm text-muted">Cartesian input only. To use another system, convert the point first in Point Conversion.</p>
        : <SelectField label="Coordinate system" value={value.system} onChange={(system) => onChange({ ...value, system })} options={SYSTEMS} />}
      <div className="grid grid-cols-3 gap-2">
        {keys.map((k, i) => (
          <Field key={k} label={PLABEL[value.system][i] + (ANGLE[value.system].includes(i) ? ` (${angleUnit})` : '')}
            value={value[k]} onChange={(v) => onChange({ ...value, [k]: v })}
            placeholder={ANGLE[value.system].includes(i) ? 'blank = undefined' : undefined} />
        ))}
      </div>
    </div>
  );
}

export function VectorForm({ value, onChange, title, showPoint, pointTitle = 'Point of application' }: {
  value: VectorState; onChange: (v: VectorState) => void; title: string; showPoint: boolean; pointTitle?: string;
}) {
  const keys = ['a', 'b', 'c'] as const;
  return (
    <div className="space-y-3">
      <h3 className="font-semibold">{title}</h3>
      <SelectField label="Components in" value={value.system} onChange={(system) => onChange({ ...value, system })}
        options={SYSTEMS.map((s) => ({ value: s.value, label: s.label.replace(/\(.*\)/, `(${VLABEL[s.value].join(', ')})`) }))} />
      <div className="grid grid-cols-3 gap-2">
        {keys.map((k, i) => <Field key={k} label={VLABEL[value.system][i]} value={value[k]} onChange={(v) => onChange({ ...value, [k]: v })} />)}
      </div>
      {showPoint && (
        <div className="rounded-xl border border-line p-3">
          <PointForm title={pointTitle} value={value.pt} onChange={(pt) => onChange({ ...value, pt })} />
          <p className="mt-2 text-xs text-muted">Cylindrical and spherical components depend on position, so this point is required.</p>
        </div>
      )}
    </div>
  );
}

export function parsePointState(s: PointState, unit: AngleUnit, name = 'Point'): Point {
  const L = PLABEL[s.system];
  const n = (v: string, i: number) => num(v, `${name} ${L[i]}`);
  const a = (v: string, i: number) => angleIn(v, unit, `${name} ${L[i]}`);
  if (s.system === 'cartesian') return { system: 'cartesian', x: n(s.a, 0), y: n(s.b, 1), z: n(s.c, 2) };
  if (s.system === 'cylindrical') return { system: 'cylindrical', rho: n(s.a, 0), phi: a(s.b, 1), z: n(s.c, 2) };
  return { system: 'spherical', r: n(s.a, 0), theta: a(s.b, 1), phi: a(s.c, 2) };
}
export function parseVectorState(s: VectorState, unit: AngleUnit, needPoint: boolean, name = 'Vector'): { value: VectorValue; at?: Point } {
  const L = VLABEL[s.system];
  const comps: Vec3 = [num(s.a, `${name} ${L[0]}`), num(s.b, `${name} ${L[1]}`), num(s.c, `${name} ${L[2]}`)];
  return { value: { system: s.system, components: comps }, at: needPoint ? parsePointState(s.pt, unit, `${name} application point`) : undefined };
}
