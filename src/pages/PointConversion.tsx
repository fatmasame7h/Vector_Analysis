import CalcShell, { type CalcResult } from '../components/calc/CalcShell';
import { PointForm, SYSTEMS, SYSTEM_NAME, SelectField, defaultPoint, parsePointState, type PointState } from '../components/calc/forms';
import { solution } from '../components/calc/steps';
import { convertPoint, toCartesian, type Point, type System } from '../engines/coordinates';
import { useFmt, useSettings, type Fmt } from '../context/SettingsContext';
import { usePageForm } from '../hooks/usePageForm';
import { C, extentOf, fmtPoint } from './helpers';

interface Form { from: PointState; to: System }

const FORMULAS: Record<string, string[]> = {
  'cartesian-cylindrical': ['ρ = √(x² + y²)', 'φ = atan2(y, x)', 'z = z'],
  'cylindrical-cartesian': ['x = ρ cos φ', 'y = ρ sin φ', 'z = z'],
  'cartesian-spherical': ['r = √(x² + y² + z²)', 'θ = acos(z / r)', 'φ = atan2(y, x)'],
  'spherical-cartesian': ['x = r sin θ cos φ', 'y = r sin θ sin φ', 'z = r cos θ'],
  'cylindrical-spherical': ['r = √(ρ² + z²)', 'θ = atan2(ρ, z)', 'φ = φ'],
  'spherical-cylindrical': ['ρ = r sin θ', 'φ = φ', 'z = r cos θ'],
};

function substitution(p: Point, r: Point, f: Fmt): string[] {
  const n = f.n, a = f.ang;
  if (p.system === 'cartesian' && r.system === 'cylindrical')
    return [`ρ = √(${n(p.x)}² + ${n(p.y)}²) = ${n(r.rho)}`, `φ = ${r.phi == null ? 'undefined (ρ = 0: the point is on the z-axis)' : `atan2(${n(p.y)}, ${n(p.x)}) = ${a(r.phi)}`}`, `z = ${n(p.z)}`];
  if (p.system === 'cylindrical' && r.system === 'cartesian')
    return [`x = ${n(p.rho)}·cos(${a(p.phi)}) = ${n(r.x)}`, `y = ${n(p.rho)}·sin(${a(p.phi)}) = ${n(r.y)}`, `z = ${n(p.z)}`];
  if (p.system === 'cartesian' && r.system === 'spherical')
    return [`r = √(${n(p.x)}² + ${n(p.y)}² + ${n(p.z)}²) = ${n(r.r)}`,
      `θ = ${r.theta == null ? 'undefined (r = 0: the point is the origin)' : `acos(${n(p.z)} / ${n(r.r)}) = ${a(r.theta)}`}`,
      `φ = ${r.phi == null ? 'undefined (the point is on the z-axis)' : `atan2(${n(p.y)}, ${n(p.x)}) = ${a(r.phi)}`}`];
  if (p.system === 'spherical' && r.system === 'cartesian')
    return [`x = ${n(p.r)}·sin(${a(p.theta)})·cos(${a(p.phi)}) = ${n(r.x)}`, `y = ${n(p.r)}·sin(${a(p.theta)})·sin(${a(p.phi)}) = ${n(r.y)}`, `z = ${n(p.r)}·cos(${a(p.theta)}) = ${n(r.z)}`];
  if (p.system === 'cylindrical' && r.system === 'spherical')
    return [`r = √(${n(p.rho)}² + ${n(p.z)}²) = ${n(r.r)}`,
      `θ = ${r.theta == null ? 'undefined (r = 0: the point is the origin)' : `atan2(${n(p.rho)}, ${n(p.z)}) = ${a(r.theta)}`}`,
      `φ = ${r.phi == null ? 'undefined (ρ = 0: the point is on the z-axis)' : a(r.phi)}`];
  if (p.system === 'spherical' && r.system === 'cylindrical')
    return [`ρ = ${n(p.r)}·sin(${a(p.theta)}) = ${n(r.rho)}`, `φ = ${r.phi == null ? 'undefined (ρ = 0: the point is on the z-axis)' : a(r.phi)}`, `z = ${n(p.r)}·cos(${a(p.theta)}) = ${n(r.z)}`];
  return ['Both systems are the same: the values are only normalized (angles into [0, 360°), rounding noise removed).'];
}

export default function PointConversion() {
  const { form, set, setForm, restored } = usePageForm<Form>(() => ({ from: defaultPoint(), to: 'cylindrical' }));
  const f = useFmt();
  const { angleUnit } = useSettings();

  const calc = (): CalcResult => {
    const p = parsePointState(form.from, angleUnit);
    const out = convertPoint(p, form.to);
    const c = toCartesian(p);
    const key = `${p.system}-${form.to}`;
    const notes: string[] = [];
    if ((out.system === 'cylindrical' && out.phi == null) || (out.system === 'spherical' && (out.phi == null || out.theta == null)))
      notes.push('Some angles are undefined at this point (origin or z-axis). They are shown as "undefined", never as 0.');
    if (out.system !== 'cartesian' || p.system !== 'cartesian') notes.push('Angles are normalized: φ ∈ [0, 2π), θ ∈ [0, π]; ρ and r are never negative.');
    const given = [`P = ${fmtPoint(p, f)}  (${SYSTEM_NAME[p.system]})`];
    return {
      meta: { operation: `${SYSTEM_NAME[p.system]} → ${SYSTEM_NAME[form.to]}`, system: SYSTEM_NAME[form.to] },
      answer: [
        { label: `Original (${SYSTEM_NAME[p.system]})`, value: fmtPoint(p, f) },
        { label: `Result (${SYSTEM_NAME[form.to]})`, value: fmtPoint(out, f) },
        { label: 'Cartesian equivalent', value: fmtPoint(c, f) },
        ...notes.map((t) => ({ label: 'Note', value: t })),
      ],
      steps: solution({
        given, required: `Express the point in ${SYSTEM_NAME[form.to]} coordinates.`,
        formula: FORMULAS[key] ?? ['(no conversion needed)'],
        substitution: substitution(p, out, f), intermediate: notes, final: [fmtPoint(out, f)],
        why: { formula: 'These formulas relate the two coordinate systems.', intermediate: 'Angles are normalized and singular cases are handled explicitly.' },
      }),
      shapes: [
        { kind: 'vector', from: [0, 0, 0], vec: [c.x, c.y, c.z], color: C[0] },
        { kind: 'point', p: [c.x, c.y, c.z], color: C[1], label: 'P' },
        { kind: 'polyline', pts: [[c.x, c.y, c.z], [c.x, c.y, 0]], color: C[2], dashed: true },
        { kind: 'polyline', pts: [[0, 0, 0], [c.x, c.y, 0]], color: C[2], dashed: true },
      ],
      extent: extentOf([c.x, c.y, c.z]),
    };
  };

  return (
    <CalcShell title="Point Conversion" subtitle="Convert a point between Cartesian, cylindrical and spherical coordinates." form={form} restored={restored} onCalculate={calc}
      onExample={() => setForm({ from: { system: 'cartesian', a: '1', b: '1', c: '1' }, to: 'spherical' })}
      onClear={() => setForm({ from: { system: form.from.system, a: '', b: '', c: '' }, to: form.to })}
      inputs={<>
        <PointForm title="Point to convert" value={form.from} onChange={(from) => set({ from })} />
        <SelectField label="Convert to" value={form.to} onChange={(to) => set({ to })} options={SYSTEMS} />
        <p className="text-xs text-muted">Spherical convention: θ is measured from +z, φ is measured from +x in the xy-plane.</p>
      </>} />
  );
}
