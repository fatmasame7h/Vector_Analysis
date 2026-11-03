import CalcShell, { type CalcResult } from '../components/calc/CalcShell';
import { PointForm, SYSTEMS, SYSTEM_NAME, SelectField, Field, VectorForm, defaultPoint, defaultVector, parsePointState, parseVectorState, type PointState, type VectorState } from '../components/calc/forms';
import { solution } from '../components/calc/steps';
import { angleArc } from '../engines/geometry';
import { basisAt, convertVector, vectorToCartesian } from '../engines/vectors/basis';
import { angleBoth, angleCosine, angleSine, crossProduct, directionCosines, dotByAngle, dotProduct, magnitude, scalarProjection, unitVector, vectorProjection } from '../engines/vectors/ops';
import { add, sub, type Vec3 } from '../engines/vectors/vec3';
import type { System } from '../engines/coordinates';
import { useFmt, useSettings } from '../context/SettingsContext';
import { usePageForm } from '../hooks/usePageForm';
import { num, angleIn } from '../utils/parse';
import type { SceneShape } from '../visualization/types';
import { C, extentOf, fmtPoint } from './helpers';

export type Op = 'add' | 'sub' | 'dot' | 'cross' | 'mag' | 'unit' | 'angle' | 'sproj' | 'vproj' | 'dircos';
export interface Form {
  op: Op; dotMethod: 'comps' | 'mag'; angleMethod: 'both' | 'cosine' | 'sine';
  A: VectorState; B: VectorState; magA: string; magB: string; theta: string; outSys: System; outPt: PointState;
}
const OPS: { value: Op; label: string }[] = [
  { value: 'add', label: 'Vector addition' }, { value: 'sub', label: 'Vector subtraction' }, { value: 'dot', label: 'Dot product' },
  { value: 'cross', label: 'Cross product' }, { value: 'mag', label: 'Magnitude' }, { value: 'unit', label: 'Unit vector' },
  { value: 'angle', label: 'Angle between two vectors' }, { value: 'sproj', label: 'Scalar projection of A onto B' },
  { value: 'vproj', label: 'Vector projection of A onto B' }, { value: 'dircos', label: 'Direction cosines' },
];
const VECTOR_RESULT: Op[] = ['add', 'sub', 'cross', 'unit', 'vproj'];
export const initialForm = (): Form => ({ op: 'dot', dotMethod: 'comps', angleMethod: 'both', A: defaultVector(), B: { ...defaultVector(), a: '4', b: '-5', c: '6' },
  magA: '5', magB: '4', theta: '60', outSys: 'cartesian', outPt: defaultPoint() });

export default function VectorOperations({ preset }: { preset?: Partial<Form> } = {}) {
  const { form, set, setForm, restored } = usePageForm<Form>(() => ({ ...initialForm(), ...preset }));
  const f = useFmt();
  const { angleUnit } = useSettings();
  const needB = ['add', 'sub', 'cross', 'angle', 'sproj', 'vproj'].includes(form.op) || (form.op === 'dot' && form.dotMethod === 'comps');
  const magMode = form.op === 'dot' && form.dotMethod === 'mag';

  const calc = (): CalcResult => {
    const n = f.n, v = f.v;
    const getVec = (s: VectorState, name: string) => {
      const { value, at } = parseVectorState(s, angleUnit, s.system !== 'cartesian', name);
      const c = vectorToCartesian(value, at);
      const lines: string[] = [];
      if (value.system !== 'cartesian') {
        const b = basisAt(value.system, at), nm = b.names;
        lines.push(`${name} = ${v(value.components)} in ${SYSTEM_NAME[value.system]} at P = ${fmtPoint(at!, f)}`,
          `a_${nm[0]} = ${v(b.e1)}, a_${nm[1]} = ${v(b.e2)}, a_${nm[2]} = ${v(b.e3)}`, `${name} (Cartesian) = ${v(c)}`);
      }
      return { c, lines, text: `${name} = ${v(c)}${value.system !== 'cartesian' ? ` (from ${SYSTEM_NAME[value.system]})` : ''}` };
    };
    const method = form.op === 'dot' ? (magMode ? 'Magnitudes and angle' : 'Components') : form.op === 'angle' ? { both: 'Sine and cosine (both)', cosine: 'Cosine', sine: 'Sine' }[form.angleMethod] : undefined;

    /* --- Dot product by magnitudes and angle: no vector components needed --- */
    if (magMode) {
      const ma = num(form.magA, '|A|'), mb = num(form.magB, '|B|'), th = angleIn(form.theta, angleUnit, 'θ', false) as number;
      const d = dotByAngle(ma, mb, th);
      const a: Vec3 = [ma, 0, 0], b: Vec3 = [mb * Math.cos(th), mb * Math.sin(th), 0];
      const shapes: SceneShape[] = [{ kind: 'vector', from: [0, 0, 0], vec: a, color: C[0], label: 'A' }, { kind: 'vector', from: [0, 0, 0], vec: b, color: C[1], label: 'B' }];
      if (ma > 0 && mb > 0) shapes.push({ kind: 'polyline', pts: angleArc(a, b, Math.max(0.5, 0.35 * Math.min(ma, mb))), color: C[3], label: f.ang(th) });
      return { meta: { operation: 'Dot product', method }, answer: [{ label: 'A · B', value: n(d) }],
        steps: solution({ given: [`|A| = ${n(ma)}`, `|B| = ${n(mb)}`, `θ = ${f.ang(th)}`], required: 'A · B', formula: ['A · B = |A| |B| cos θ'],
          substitution: [`A · B = ${n(ma)} × ${n(mb)} × cos(${f.ang(th)})`], intermediate: [`cos(${f.ang(th)}) = ${n(Math.cos(th))}`], final: [`A · B = ${n(d)}`],
          why: { formula: 'This form needs only the lengths and the included angle, not the components.' } }),
        shapes: shapes, extent: extentOf(a, b) };
    }

    const A = getVec(form.A, 'A'), B = needB ? getVec(form.B, 'B') : null;
    const a = A.c, b = B?.c ?? ([0, 0, 0] as Vec3);
    const conv = [...A.lines, ...(B?.lines ?? [])];
    const given = [A.text, ...(B ? [B.text] : [])];
    const ma = magnitude(a), mb = magnitude(b);
    const base: SceneShape[] = [{ kind: 'vector', from: [0, 0, 0], vec: a, color: C[0], label: 'A' }, ...(B ? [{ kind: 'vector', from: [0, 0, 0], vec: b, color: C[1], label: 'B' } as SceneShape] : [])];
    const arc = (): SceneShape[] => ma > 0 && mb > 0 ? [{ kind: 'polyline', pts: angleArc(a, b, Math.min(2, Math.max(0.5, 0.35 * Math.min(ma, mb)))), color: C[3] }] : [];
    const sum = (x: Vec3, y: Vec3) => `(${n(x[0])}·${n(y[0])}) + (${n(x[1])}·${n(y[1])}) + (${n(x[2])}·${n(y[2])})`;
    let res: Vec3 | null = null, r: CalcResult;

    switch (form.op) {
      case 'add': case 'sub': {
        const s = form.op === 'add' ? '+' : '−';
        res = form.op === 'add' ? add(a, b) : sub(a, b);
        r = { meta: { operation: form.op === 'add' ? 'Vector addition' : 'Vector subtraction' }, answer: [{ label: `A ${s} B`, value: v(res) }],
          steps: solution({ given, required: `A ${s} B`, formula: [`A ${s} B = (Ax ${s} Bx, Ay ${s} By, Az ${s} Bz)`], substitution: [`(${n(a[0])} ${s} ${n(b[0])}, ${n(a[1])} ${s} ${n(b[1])}, ${n(a[2])} ${s} ${n(b[2])})`],
            intermediate: conv, final: [`A ${s} B = ${v(res)}`], why: { intermediate: 'Components are only added in one common (Cartesian) basis.' } }),
          shapes: form.op === 'add' ? [...base.slice(0, 1), { kind: 'vector', from: a, vec: b, color: C[1], label: 'B' }, { kind: 'vector', from: [0, 0, 0], vec: res, color: C[2], label: 'A+B' }]
            : [...base, { kind: 'vector', from: b, vec: res, color: C[2], label: 'A−B' }], extent: extentOf(a, b, res) };
        break;
      }
      case 'cross': {
        res = crossProduct(a, b);
        r = { meta: { operation: 'Cross product' }, answer: [{ label: 'A × B', value: v(res) }, { label: '|A × B|', value: n(magnitude(res)) }],
          steps: solution({ given, required: 'A × B', formula: ['A × B = (AyBz − AzBy) i + (AzBx − AxBz) j + (AxBy − AyBx) k'],
            substitution: [`i: (${n(a[1])})(${n(b[2])}) − (${n(a[2])})(${n(b[1])}) = ${n(res[0])}`, `j: (${n(a[2])})(${n(b[0])}) − (${n(a[0])})(${n(b[2])}) = ${n(res[1])}`, `k: (${n(a[0])})(${n(b[1])}) − (${n(a[1])})(${n(b[0])}) = ${n(res[2])}`],
            intermediate: conv, final: [`A × B = ${v(res)}`] }),
          shapes: [...base, { kind: 'vector', from: [0, 0, 0], vec: res, color: C[2], label: 'A×B' }], extent: extentOf(a, b, res) };
        break;
      }
      case 'dot': {
        const d = dotProduct(a, b);
        const check: string[] = [];
        try { const th = angleCosine(a, b).theta; check.push(`Check: |A||B|cosθ = ${n(ma)} × ${n(mb)} × cos(${f.ang(th)}) = ${n(dotByAngle(ma, mb, th))}  (agrees with the component method)`); } catch { /* zero vector: skip */ }
        r = { meta: { operation: 'Dot product', method }, answer: [{ label: 'A · B', value: n(d) }],
          steps: solution({ given, required: 'A · B', formula: ['A · B = AxBx + AyBy + AzBz'], substitution: [`A · B = ${sum(a, b)}`], intermediate: [...conv, ...check], final: [`A · B = ${n(d)}`] }),
          shapes: [...base, ...arc()], extent: extentOf(a, b) };
        break;
      }
      case 'mag':
        r = { meta: { operation: 'Magnitude' }, answer: [{ label: '|A|', value: n(ma) }],
          steps: solution({ given, required: '|A|', formula: ['|A| = √(Ax² + Ay² + Az²)'], substitution: [`|A| = √(${n(a[0])}² + ${n(a[1])}² + ${n(a[2])}²) = √${n(ma * ma)}`], intermediate: conv, final: [`|A| = ${n(ma)}`] }), shapes: base, extent: extentOf(a) };
        break;
      case 'unit': {
        res = unitVector(a);
        r = { meta: { operation: 'Unit vector' }, answer: [{ label: 'a_A', value: v(res) }, { label: '|A|', value: n(ma) }],
          steps: solution({ given, required: 'The unit vector in the direction of A.', formula: ['a_A = A / |A|'], substitution: [`a_A = ${v(a)} / ${n(ma)}`], intermediate: conv, final: [`a_A = ${v(res)}`], why: { formula: 'Dividing by the magnitude keeps the direction and sets the length to 1.' } }),
          shapes: [...base, { kind: 'vector', from: [0, 0, 0], vec: res, color: C[2], label: 'a_A' }], extent: extentOf(a) };
        break;
      }
      case 'dircos': {
        const dc = directionCosines(a);
        r = { meta: { operation: 'Direction cosines' }, answer: [{ label: 'cos α, cos β, cos γ', value: v(dc) }, { label: 'α, β, γ', value: dc.map((x) => f.ang(Math.acos(Math.max(-1, Math.min(1, x))))).join(', ') }],
          steps: solution({ given, required: 'Direction cosines of A.', formula: ['cos α = Ax/|A|, cos β = Ay/|A|, cos γ = Az/|A|'], substitution: [`|A| = ${n(ma)}`, `cos α = ${n(a[0])}/${n(ma)} = ${n(dc[0])}`, `cos β = ${n(a[1])}/${n(ma)} = ${n(dc[1])}`, `cos γ = ${n(a[2])}/${n(ma)} = ${n(dc[2])}`],
            intermediate: [...conv, `Check: cos²α + cos²β + cos²γ = ${n(dc[0] ** 2 + dc[1] ** 2 + dc[2] ** 2)}`], final: [`(${dc.map(n).join(', ')})`] }), shapes: base, extent: extentOf(a) };
        break;
      }
      case 'sproj': {
        const s = scalarProjection(a, b);
        r = { meta: { operation: 'Scalar projection' }, answer: [{ label: 'Scalar projection of A onto B', value: n(s) }],
          steps: solution({ given, required: 'Scalar projection of A onto B.', formula: ['(A · B) / |B|'], substitution: [`${n(dotProduct(a, b))} / ${n(mb)}`], intermediate: conv, final: [`= ${n(s)}`] }), shapes: base, extent: extentOf(a, b) };
        break;
      }
      case 'vproj': {
        res = vectorProjection(a, b);
        r = { meta: { operation: 'Vector projection' }, answer: [{ label: 'Projection of A onto B', value: v(res) }],
          steps: solution({ given, required: 'Vector projection of A onto B.', formula: ['((A · B) / |B|²) B'], substitution: [`(${n(dotProduct(a, b))} / ${n(mb * mb)}) × ${v(b)}`], intermediate: conv, final: [`= ${v(res)}`] }),
          shapes: [...base, { kind: 'vector', from: [0, 0, 0], vec: res, color: C[2], label: 'proj' }, { kind: 'polyline', pts: [a, res], color: C[2], dashed: true }], extent: extentOf(a, b) };
        break;
      }
      case 'angle': {
        const d = dotProduct(a, b);
        const cosL = (): string[] => { const c = angleCosine(a, b);
          return [`A · B = ${n(d)},  |A| = ${n(ma)},  |B| = ${n(mb)}`, `cos θ = ${n(d)} / (${n(ma)} × ${n(mb)}) = ${n(Math.max(-1, Math.min(1, d / (ma * mb))))}  (clamped to [−1, 1])`, `θ = acos(cos θ) = ${f.ang(c.theta)}   (range 0°–180°; may be acute, right or obtuse)`]; };
        const sinL = (): string[] => { const s = angleSine(a, b), cr = crossProduct(a, b);
          return [`A × B = ${v(cr)},  |A × B| = ${n(magnitude(cr))}`, `sin θ = ${n(magnitude(cr))} / (${n(ma)} × ${n(mb)}) = ${n(Math.sin(s.alpha ?? 0))}`, `Reference angle α = asin(sin θ) = ${f.ang(s.alpha ?? 0)}   (asin only returns −90°…90°)`,
            `A · B = ${n(d)} → ` + (s.corrected ? `negative, so θ = ${f.ang(Math.PI)} − α = ${f.ang(s.theta)}` : d > 0 && !s.corrected && Math.abs(s.theta - (s.alpha ?? 0)) < 1e-12 ? `positive, so θ = α = ${f.ang(s.theta)}` : `zero, so θ = ${f.ang(Math.PI / 2)}`)]; };
        let theta: number, lines: string[], formula: string[];
        if (form.angleMethod === 'cosine') { theta = angleCosine(a, b).theta; lines = cosL(); formula = ['cos θ = (A · B) / (|A||B|)', 'θ = acos((A · B) / (|A||B|))']; }
        else if (form.angleMethod === 'sine') { theta = angleSine(a, b).theta; lines = sinL(); formula = ['sin θ = |A × B| / (|A||B|)', 'α = asin(|A × B| / (|A||B|))', 'A · B > 0 → θ = α;  A · B = 0 → θ = 90°;  A · B < 0 → θ = 180° − α']; }
        else { const bo = angleBoth(a, b); theta = bo.theta; formula = ['Cosine method: θ = acos((A · B) / (|A||B|))', 'Sine method: α = asin(|A × B| / (|A||B|)) with the dot-product sign correction'];
          lines = ['— Cosine method —', ...cosL(), '— Sine method —', ...sinL(), '— Comparison —', `Cosine: ${f.ang(bo.cosine.theta)},  Sine: ${f.ang(bo.sine.theta)},  difference = ${bo.difference.toExponential(2)}  →  ${bo.agree ? 'the methods agree' : 'the methods DISAGREE (check the input)'}`, `Final verified angle: ${f.ang(theta)}`]; }
        const rowsExtra = form.angleMethod === 'both' ? (() => { const bo = angleBoth(a, b); return [{ label: 'Cosine method', value: f.ang(bo.cosine.theta) }, { label: 'Sine method', value: f.ang(bo.sine.theta) }, { label: 'Agree?', value: bo.agree ? 'yes' : 'no' }]; })() : [];
        const note = Math.abs(theta) < 1e-9 ? 'Parallel, same direction' : Math.abs(theta - Math.PI) < 1e-9 ? 'Opposite directions' : Math.abs(theta - Math.PI / 2) < 1e-9 ? 'Perpendicular' : theta < Math.PI / 2 ? 'Acute' : 'Obtuse';
        r = { meta: { operation: 'Angle between two vectors', method }, answer: [{ label: 'Angle θ', value: f.ang(theta) }, { label: 'Type', value: note }, ...rowsExtra],
          steps: solution({ given, required: 'The smaller angle θ between A and B (0° ≤ θ ≤ 180°).', formula, substitution: lines.slice(0, 1).length ? lines : [], intermediate: conv, final: [`θ = ${f.ang(theta)}`],
            why: { substitution: 'The selected method is applied to your vectors.' } }),
          shapes: [...base, ...arc().map((s) => ({ ...s, label: f.ang(theta) }) as SceneShape)], extent: extentOf(a, b) };
        break;
      }
    }

    /* --- optional output conversion for vector-valued results --- */
    if (res && VECTOR_RESULT.includes(form.op) && form.outSys !== 'cartesian') {
      const at = parsePointState(form.outPt, angleUnit, 'Output point');
      const o = convertVector({ system: 'cartesian', components: res }, form.outSys, at);
      r.answer.push({ label: `Result in ${SYSTEM_NAME[form.outSys]} at ${fmtPoint(at, f)}`, value: v(o.components) });
      r.steps.push({ title: 'Output conversion', why: 'Converted with the local basis at the output point.', lines: [`${v(res)} (Cartesian) → ${v(o.components)} (${SYSTEM_NAME[form.outSys]})`] });
    }
    if (!(r.meta.system)) r.meta.system = 'Cartesian (all inputs converted)';
    return r;
  };

  return (
    <CalcShell title="Vector Operations" subtitle="Dot and cross products, angles, projections and more. Vectors may be entered in any coordinate system." form={form} restored={restored} onCalculate={calc}
      onExample={() => setForm({ ...initialForm(), op: form.op, dotMethod: form.dotMethod, angleMethod: form.angleMethod, A: { ...defaultVector(), a: '2', b: '1', c: '2' }, B: { ...defaultVector(), a: '1', b: '2', c: '2' } })}
      onClear={() => setForm({ ...form, A: { ...form.A, a: '', b: '', c: '' }, B: { ...form.B, a: '', b: '', c: '' } })}
      inputs={<>
        <SelectField label="Operation" value={form.op} onChange={(op) => set({ op })} options={OPS} />
        {form.op === 'dot' && <SelectField label="Calculation method" value={form.dotMethod} onChange={(dotMethod) => set({ dotMethod })} options={[{ value: 'comps', label: 'Using components' }, { value: 'mag', label: 'Using magnitudes and angle' }]} />}
        {form.op === 'angle' && <SelectField label="Calculation method" value={form.angleMethod} onChange={(angleMethod) => set({ angleMethod })} options={[{ value: 'both', label: 'Using both (recommended)' }, { value: 'cosine', label: 'Using cosine' }, { value: 'sine', label: 'Using sine' }]} />}
        {magMode ? (
          <div className="grid grid-cols-3 gap-2">
            <Field label="|A|" value={form.magA} onChange={(magA) => set({ magA })} /><Field label="|B|" value={form.magB} onChange={(magB) => set({ magB })} />
            <Field label={`θ (${angleUnit})`} value={form.theta} onChange={(theta) => set({ theta })} />
          </div>
        ) : <>
          <VectorForm title={needB ? 'Vector A' : 'Vector'} value={form.A} onChange={(A) => set({ A })} showPoint={form.A.system !== 'cartesian'} pointTitle="Point of application of A" />
          {needB && <VectorForm title="Vector B" value={form.B} onChange={(B) => set({ B })} showPoint={form.B.system !== 'cartesian'} pointTitle="Point of application of B" />}
        </>}
        {VECTOR_RESULT.includes(form.op) && !magMode && <>
          <SelectField label="Express the result in" value={form.outSys} onChange={(outSys) => set({ outSys })} options={SYSTEMS} />
          {form.outSys !== 'cartesian' && <PointForm title="Output point" value={form.outPt} onChange={(outPt) => set({ outPt })} />}
        </>}
      </>} />
  );
}
