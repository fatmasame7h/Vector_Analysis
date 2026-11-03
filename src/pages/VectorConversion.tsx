import CalcShell, { type CalcResult } from '../components/calc/CalcShell';
import { SYSTEMS, SYSTEM_NAME, SelectField, VectorForm, defaultVector, parseVectorState, vectorLabels, type VectorState } from '../components/calc/forms';
import { solution } from '../components/calc/steps';
import { toCartesian, type System } from '../engines/coordinates';
import { basisAt, convertVector, vectorToCartesian } from '../engines/vectors/basis';
import type { Vec3 } from '../engines/vectors/vec3';
import { useFmt, useSettings } from '../context/SettingsContext';
import { usePageForm } from '../hooks/usePageForm';
import type { SceneShape } from '../visualization/types';
import { C, extentOf, fmtPoint } from './helpers';

interface Form { v: VectorState; to: System }
const ALL: System[] = ['cartesian', 'cylindrical', 'spherical'];

export default function VectorConversion() {
  const { form, set, setForm, restored } = usePageForm<Form>(() => ({ v: defaultVector(), to: 'cylindrical' }));
  const f = useFmt();
  const { angleUnit } = useSettings();

  const calc = (): CalcResult => {
    const needPoint = form.v.system !== 'cartesian' || form.to !== 'cartesian';
    const { value, at } = parseVectorState(form.v, angleUnit, needPoint);
    const cart = vectorToCartesian(value, at);
    const out = convertVector({ system: 'cartesian', components: cart }, form.to, at);
    const origin: Vec3 = at ? (() => { const c = toCartesian(at); return [c.x, c.y, c.z]; })() : [0, 0, 0];
    const L = vectorLabels(form.to);
    const basisLines = (s: System) => {
      if (s === 'cartesian') return [];
      const b = basisAt(s, at), nm = b.names;
      return [`${SYSTEM_NAME[s]} basis at P:`, `a_${nm[0]} = ${f.v(b.e1)}`, `a_${nm[1]} = ${f.v(b.e2)}`, `a_${nm[2]} = ${f.v(b.e3)}`];
    };
    const compare = ALL.map((s) => {
      try { return { label: `${SYSTEM_NAME[s]} (${vectorLabels(s).join(', ')})`, value: f.v(convertVector({ system: 'cartesian', components: cart }, s, at).components) }; }
      catch { return { label: `${SYSTEM_NAME[s]}`, value: 'undefined at this point (singular direction)' }; }
    });
    const given = [`A = ${f.v(value.components)}  in ${SYSTEM_NAME[value.system]} components`, ...(at ? [`Point of application P = ${fmtPoint(at, f)}`, `P in Cartesian = ${fmtPoint(toCartesian(at), f)}`] : [])];
    const inLines = value.system === 'cartesian' ? [] : [...basisLines(value.system), `A (Cartesian) = ${vectorLabels(value.system)[0]}·a_${basisAt(value.system, at).names[0]} + ${vectorLabels(value.system)[1]}·a_${basisAt(value.system, at).names[1]} + ${vectorLabels(value.system)[2]}·a_${basisAt(value.system, at).names[2]} = ${f.v(cart)}`];
    const outLines = form.to === 'cartesian' ? [] : [...basisLines(form.to), `${L[0]} = A·a_${basisAt(form.to, at).names[0]},  ${L[1]} = A·a_${basisAt(form.to, at).names[1]},  ${L[2]} = A·a_${basisAt(form.to, at).names[2]}`];
    const basisShapes: SceneShape[] = [];
    const addBasis = (s: System, col: string) => {
      if (s === 'cartesian') return;
      const b = basisAt(s, at);
      [b.e1, b.e2, b.e3].forEach((e, i) => basisShapes.push({ kind: 'vector', from: origin, vec: e, color: col, label: `a_${b.names[i]}` }));
    };
    addBasis(form.to, C[2]);
    if (value.system !== form.to) addBasis(value.system, C[3]);
    return {
      meta: { operation: `Vector ${SYSTEM_NAME[value.system]} → ${SYSTEM_NAME[form.to]}`, system: SYSTEM_NAME[form.to] },
      answer: [{ label: 'Cartesian equivalent', value: f.v(cart) }, { label: `Result (${L.join(', ')})`, value: f.v(out.components) },
        ...(at ? [{ label: 'Application point', value: fmtPoint(at, f) }] : []), ...compare.map((c) => ({ label: `Compare: ${c.label}`, value: c.value }))],
      steps: solution({
        given, required: `Components of A in ${SYSTEM_NAME[form.to]} at the same point.`,
        formula: ['Cylindrical: a_ρ = cosφ a_x + sinφ a_y;  a_φ = −sinφ a_x + cosφ a_y;  a_z = a_z',
          'Spherical: a_r = sinθcosφ a_x + sinθsinφ a_y + cosθ a_z;  a_θ = cosθcosφ a_x + cosθsinφ a_y − sinθ a_z;  a_φ = −sinφ a_x + cosφ a_y',
          'Orthonormal basis ⇒ component along a_i is A · a_i'],
        substitution: inLines.length ? inLines : ['A is already Cartesian.'], intermediate: outLines.length ? outLines : undefined,
        final: [`A = ${f.v(out.components)} in ${SYSTEM_NAME[form.to]} components at P`],
        why: { formula: 'Local basis vectors depend on position, so a point of application is required.', substitution: 'Convert the input vector to Cartesian first (a common basis).' },
      }),
      shapes: [{ kind: 'vector', from: origin, vec: cart, color: C[0], label: 'A' }, { kind: 'point', p: origin, color: C[1], label: 'P' }, ...basisShapes],
      extent: extentOf(origin, cart),
    };
  };

  return (
    <CalcShell title="Vector Conversion" subtitle="Convert vector components between coordinate systems at a specific point." form={form} restored={restored} onCalculate={calc}
      onExample={() => setForm({ v: { system: 'cartesian', a: '1', b: '0', c: '0', pt: { system: 'cartesian', a: '1', b: '1', c: '0' } }, to: 'cylindrical' })}
      onClear={() => setForm({ ...form, v: { ...form.v, a: '', b: '', c: '' } })}
      inputs={<>
        <VectorForm title="Vector" value={form.v} onChange={(v) => set({ v })} showPoint={form.v.system !== 'cartesian' || form.to !== 'cartesian'} />
        <SelectField label="Convert to" value={form.to} onChange={(to) => set({ to })} options={SYSTEMS} />
        <p className="text-xs text-muted">Components from different local bases are never compared directly; everything goes through Cartesian at the same point.</p>
      </>} />
  );
}
