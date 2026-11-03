import CalcShell, { type CalcResult } from '../components/calc/CalcShell';
import { PointForm, SYSTEM_NAME, SelectField, defaultPoint, parsePointState, type PointState } from '../components/calc/forms';
import { solution } from '../components/calc/steps';
import { toCartesian, type Cartesian, type Point } from '../engines/coordinates';
import { addPoints, distanceBetween, distanceFromOrigin, formatUnitForm, midpoint, positionVector, subtractPoints } from '../engines/points';
import type { Vec3 } from '../engines/vectors/vec3';
import { useFmt, useSettings, type Fmt } from '../context/SettingsContext';
import { usePageForm } from '../hooks/usePageForm';
import type { SceneShape } from '../visualization/types';
import { C, extentOf, fmtPoint } from './helpers';

type Op = 'add' | 'subtract' | 'distance' | 'midpoint' | 'position' | 'origin';
interface Form { op: Op; A: PointState; B: PointState }
const OPS: { value: Op; label: string }[] = [
  { value: 'add', label: 'Point addition' }, { value: 'subtract', label: 'Point subtraction' },
  { value: 'distance', label: 'Distance between two points' }, { value: 'midpoint', label: 'Midpoint' },
  { value: 'position', label: 'Position vector (Cartesian input only)' }, { value: 'origin', label: 'Distance from origin' },
];
const needB = (op: Op) => ['add', 'subtract', 'distance', 'midpoint'].includes(op);
const xyz = (c: Cartesian): Vec3 => [c.x, c.y, c.z];
const conv = (p: Point, c: Cartesian, name: string, f: Fmt) =>
  p.system === 'cartesian' ? [] : [`${name} in ${SYSTEM_NAME[p.system]} = ${fmtPoint(p, f)} → Cartesian ${fmtPoint(c, f)}`];

export default function PointOperations() {
  const { form, set, setForm, restored } = usePageForm<Form>(() => ({ op: 'distance', A: defaultPoint(), B: { system: 'cartesian', a: '4', b: '6', c: '3' } }));
  const f = useFmt();
  const { angleUnit } = useSettings();

  const calc = (): CalcResult => {
    const A = parsePointState(form.A, angleUnit, 'Point A');
    const Ac = toCartesian(A), a = xyz(Ac);
    const B = needB(form.op) ? parsePointState(form.B, angleUnit, 'Point B') : null;
    const Bc = B ? toCartesian(B) : null, b = Bc ? xyz(Bc) : null;
    const n = f.n;
    const given = [`A = ${fmtPoint(A, f)} (${SYSTEM_NAME[A.system]})`, ...(B ? [`B = ${fmtPoint(B, f)} (${SYSTEM_NAME[B.system]})`] : [])];
    const convLines = [...conv(A, Ac, 'A', f), ...(B && Bc ? conv(B, Bc, 'B', f) : [])];
    const marks = (pts: [Vec3, string][]): SceneShape[] => pts.map(([p, label], i) => ({ kind: 'point', p, label, color: C[i % C.length] }));
    let r: CalcResult;
    switch (form.op) {
      case 'add': case 'subtract': {
        const sign = form.op === 'add' ? '+' : '−';
        const res = form.op === 'add' ? addPoints(A, B!) : subtractPoints(A, B!);
        r = { meta: { operation: form.op === 'add' ? 'Point addition' : 'Point subtraction', system: 'Cartesian' },
          answer: [{ label: 'Result', value: fmtPoint(res, f) }, { label: 'Note', value: 'This is coordinate arithmetic. It is not vector addition/subtraction and depends on the chosen origin.' }],
          steps: solution({ given, required: `A ${sign} B (component-wise).`, formula: [`(x₁ ${sign} x₂, y₁ ${sign} y₂, z₁ ${sign} z₂)`],
            substitution: [`(${n(a[0])} ${sign} ${n(b![0])}, ${n(a[1])} ${sign} ${n(b![1])}, ${n(a[2])} ${sign} ${n(b![2])})`], intermediate: convLines, final: [fmtPoint(res, f)],
            why: { intermediate: 'Points in different systems cannot be combined component-wise, so both are converted to Cartesian first.' } }),
          shapes: marks([[a, 'A'], [b!, 'B'], [xyz(res), 'Result']]), extent: extentOf(a, b!, xyz(res)) };
        break;
      }
      case 'distance': {
        const d = distanceBetween(A, B!);
        r = { meta: { operation: 'Distance between two points', system: 'Cartesian' }, answer: [{ label: 'Distance d', value: n(d) }],
          steps: solution({ given, required: 'Distance d between A and B.', formula: ['d = √((x₂−x₁)² + (y₂−y₁)² + (z₂−z₁)²)'],
            substitution: [`d = √((${n(b![0])}−${n(a[0])})² + (${n(b![1])}−${n(a[1])})² + (${n(b![2])}−${n(a[2])})²)`],
            intermediate: [...convLines, `d = √(${n((b![0] - a[0]) ** 2)} + ${n((b![1] - a[1]) ** 2)} + ${n((b![2] - a[2]) ** 2)})`], final: [`d = ${n(d)}`] }),
          shapes: [...marks([[a, 'A'], [b!, 'B']]), { kind: 'polyline', pts: [a, b!], color: C[2], label: `d = ${n(d)}` }], extent: extentOf(a, b!) };
        break;
      }
      case 'midpoint': {
        const m = midpoint(A, B!);
        r = { meta: { operation: 'Midpoint', system: 'Cartesian' }, answer: [{ label: 'Midpoint M', value: fmtPoint(m, f) }],
          steps: solution({ given, required: 'The midpoint M of segment AB.', formula: ['M = ((x₁+x₂)/2, (y₁+y₂)/2, (z₁+z₂)/2)'],
            substitution: [`M = ((${n(a[0])}+${n(b![0])})/2, (${n(a[1])}+${n(b![1])})/2, (${n(a[2])}+${n(b![2])})/2)`], intermediate: convLines, final: [`M = ${fmtPoint(m, f)}`] }),
          shapes: [...marks([[a, 'A'], [b!, 'B'], [xyz(m), 'M']]), { kind: 'polyline', pts: [a, b!], color: C[3] }], extent: extentOf(a, b!) };
        break;
      }
      case 'origin': {
        const d = distanceFromOrigin(A);
        r = { meta: { operation: 'Distance from origin', system: 'Cartesian' }, answer: [{ label: 'Distance from O', value: n(d) }],
          steps: solution({ given, required: 'Distance from the origin to A.', formula: ['d = √(x² + y² + z²)'], substitution: [`d = √(${n(a[0])}² + ${n(a[1])}² + ${n(a[2])}²)`],
            intermediate: convLines, final: [`d = ${n(d)}`] }),
          shapes: [...marks([[[0, 0, 0], 'O'], [a, 'A']]), { kind: 'polyline', pts: [[0, 0, 0], a], color: C[2], label: `d = ${n(d)}` }], extent: extentOf(a) };
        break;
      }
      case 'position': {
        const pv = positionVector(A); // throws unless the input is Cartesian
        r = { meta: { operation: 'Position vector', system: 'Cartesian' },
          answer: [{ label: 'Original point', value: fmtPoint(A, f) }, { label: 'Initial point O', value: '(0, 0, 0)' }, { label: 'Terminal point P', value: fmtPoint(Ac, f) },
            { label: 'Component form', value: `OP = ${f.v(pv.components)}` }, { label: 'Unit-vector form', value: `OP = ${formatUnitForm(pv.components, f.precision)}` }],
          steps: solution({ given, required: 'The position vector OP from O = (0, 0, 0) to P.', formula: ['OP = P − O = (x − 0, y − 0, z − 0)', 'OP = x i + y j + z k'],
            substitution: [`OP = (${n(a[0])} − 0, ${n(a[1])} − 0, ${n(a[2])} − 0)`], final: [`OP = ${f.v(pv.components)} = ${formatUnitForm(pv.components, f.precision)}`],
            why: { formula: 'The position vector starts at the origin and ends at the point.' } }),
          shapes: [{ kind: 'vector', from: [0, 0, 0], vec: a, color: C[0], label: 'OP' }, ...marks([[[0, 0, 0], 'O'], [a, 'P']]),
            { kind: 'polyline', pts: [[0, 0, 0], [a[0], 0, 0], [a[0], a[1], 0], a], color: C[3], dashed: true },
            { kind: 'point', p: [a[0], 0, 0], color: C[3], label: `x = ${n(a[0])}` }, { kind: 'point', p: [a[0], a[1], 0], color: C[3], label: `y = ${n(a[1])}` }], extent: extentOf(a) };
        break;
      }
    }
    return { ...r, sceneOptions: { projections: false } };
  };

  return (
    <CalcShell title="Point Operations" subtitle="Distances, midpoints, coordinate arithmetic and position vectors." form={form} restored={restored} onCalculate={calc}
      onExample={() => setForm({ op: 'distance', A: defaultPoint(), B: { system: 'cartesian', a: '4', b: '6', c: '3' } })}
      onClear={() => setForm({ ...form, A: { ...form.A, a: '', b: '', c: '' }, B: { ...form.B, a: '', b: '', c: '' } })}
      inputs={<>
        <SelectField label="Operation" value={form.op} onChange={(op) => set(op === 'position' ? { op, A: { ...form.A, system: 'cartesian' } } : { op })} options={OPS} />
        {(form.op === 'add' || form.op === 'subtract') && <p className="rounded-lg bg-accent/10 p-2 text-xs">Point addition/subtraction is coordinate arithmetic. It is not the same as vector addition/subtraction.</p>}
        <PointForm title={needB(form.op) ? 'Point A' : 'Point'} value={form.A} onChange={(A) => set({ A })} lockCartesian={form.op === 'position'} />
        {needB(form.op) && <PointForm title="Point B" value={form.B} onChange={(B) => set({ B })} />}
      </>} />
  );
}
