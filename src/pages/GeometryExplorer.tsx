import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import CalcShell, { type CalcResult } from '../components/calc/CalcShell';
import { Field, SelectField } from '../components/calc/forms';
import { solution } from '../components/calc/steps';
import Segmented from '../components/ui/Segmented';
import { analyzeCurve, analyzeImplicit, distancePointPlane, footOnPlane, isoSurface, lineForms, makeLine, parseImplicit, planeFromGeneral, planeFromPointNormal, pointOnPlane, sampleCurve, type Plane } from '../engines/geometry';
import { dot, norm, scale, type Vec3 } from '../engines/vectors/vec3';
import { useFmt, type Fmt } from '../context/SettingsContext';
import { usePageForm } from '../hooks/usePageForm';
import { num } from '../utils/parse';
import { C, extentOf } from './helpers';

type Tool = 'line' | 'curve' | 'plane' | 'surface';
const nums = (a: string[], names: string[]) => a.map((s, i) => num(s, names[i])) as number[];
const planeEq = (p: Plane, f: Fmt) => `${f.n(p.n[0])}x ${p.n[1] < 0 ? '−' : '+'} ${f.n(Math.abs(p.n[1]))}y ${p.n[2] < 0 ? '−' : '+'} ${f.n(Math.abs(p.n[2]))}z ${p.d < 0 ? '−' : '+'} ${f.n(Math.abs(p.d))} = 0`;
const tangentEq = (g: Vec3, P: Vec3, f: Fmt) => [`${f.n(g[0])}(x − ${f.n(P[0])}) + ${f.n(g[1])}(y − ${f.n(P[1])}) + ${f.n(g[2])}(z − ${f.n(P[2])}) = 0`, `${f.n(g[0])}x + ${f.n(g[1])}y + ${f.n(g[2])}z = ${f.n(dot(g, P))}`];

/* ---------------- Lines ---------------- */
function LineTool() {
  const { form, set, setForm, restored } = usePageForm(() => ({ tool: 'line' as const, mode: 'pd' as 'pd' | 'param' | 'sym', v: ['1', '2', '3', '2', '-1', '1'] }), (r) => r.tool === 'line');
  const f = useFmt();
  const setV = (i: number, s: string) => set({ v: form.v.map((x, k) => (k === i ? s : x)) });
  const calc = (): CalcResult => {
    const q = nums(form.v, ['x₀', 'y₀', 'z₀', 'a', 'b', 'c']);
    const line = makeLine([q[0], q[1], q[2]], [q[3], q[4], q[5]]);
    const fm = lineForms(line, f.n), m = norm(line.d);
    const ext = extentOf(line.p);
    return { meta: { operation: 'Line', method: { pd: 'Point + direction', param: 'Parametric equations', sym: 'Symmetric equations' }[form.mode] },
      answer: [{ label: 'Point', value: f.v(line.p) }, { label: 'Direction vector', value: f.v(line.d) }, ...fm.parametric.map((t, i) => ({ label: i ? '' : 'Parametric form', value: t })), { label: 'Symmetric form', value: fm.symmetric }],
      steps: solution({ given: [`Point P₀ = ${f.v(line.p)}`, `Direction d = ${f.v(line.d)}`], required: 'Parametric and symmetric equations of the line.',
        formula: ['r(t) = P₀ + t d', 'x = x₀ + a t, y = y₀ + b t, z = z₀ + c t', '(x − x₀)/a = (y − y₀)/b = (z − z₀)/c   (only for nonzero a, b, c)'],
        substitution: fm.parametric, intermediate: ['A zero direction component gives a fixed coordinate (written as "x = x₀"), not a division by zero.'], final: [`Symmetric: ${fm.symmetric}`] }),
      shapes: [{ kind: 'polyline', pts: [scale(line.d, -9 / m).map((x, i) => x + line.p[i]) as Vec3, scale(line.d, 9 / m).map((x, i) => x + line.p[i]) as Vec3], color: C[0], label: 'line' },
        { kind: 'point', p: line.p, color: C[1], label: 'P₀' }, { kind: 'vector', from: line.p, vec: scale(line.d, Math.min(1, 3 / m)), color: C[2], label: 'd' }], extent: ext };
  };
  const names = ['x', 'y', 'z'];
  return (
    <CalcShell title="Lines" subtitle="Enter a line as a point and direction, as parametric equations, or as symmetric equations." form={form} restored={restored} onCalculate={calc}
      onExample={() => setForm({ ...form, v: ['1', '2', '3', '2', '-1', '1'] })} onClear={() => setForm({ ...form, v: ['', '', '', '', '', ''] })}
      inputs={<>
        <SelectField label="Input method" value={form.mode} onChange={(mode) => set({ mode })} options={[{ value: 'pd', label: 'Point + direction vector' }, { value: 'param', label: 'Parametric equations' }, { value: 'sym', label: 'Symmetric equations' }]} />
        {form.mode === 'pd' ? (
          <div className="grid grid-cols-3 gap-2">{[0, 1, 2].map((i) => <Field key={i} label={`${names[i]}₀`} value={form.v[i]} onChange={(s) => setV(i, s)} />)}{[3, 4, 5].map((i) => <Field key={i} label={['a', 'b', 'c'][i - 3]} value={form.v[i]} onChange={(s) => setV(i, s)} />)}</div>
        ) : [0, 1, 2].map((i) => (
          <div key={i} className="grid grid-cols-2 gap-2">
            <Field label={form.mode === 'param' ? `${names[i]} = ${names[i]}₀ + … t:  ${names[i]}₀` : `(${names[i]} − ${names[i]}₀)/…:  ${names[i]}₀`} value={form.v[i]} onChange={(s) => setV(i, s)} />
            <Field label={form.mode === 'param' ? 'coefficient of t' : 'denominator'} value={form.v[i + 3]} onChange={(s) => setV(i + 3, s)} />
          </div>))}
      </>} />
  );
}

/* ---------------- Curves ---------------- */
function CurveTool() {
  const { form, set, setForm, restored } = usePageForm(() => ({ tool: 'curve' as const, x: 'cos(t)', y: 'sin(t)', z: 't', tmin: '0', tmax: '4*pi', t0: 'pi/4' }), (r) => r.tool === 'curve');
  const f = useFmt();
  const calc = (): CalcResult => {
    const t0 = num(form.t0, 't₀');
    const a = analyzeCurve({ x: form.x, y: form.y, z: form.z }, t0);
    const pts = sampleCurve({ x: form.x, y: form.y, z: form.z }, num(form.tmin, 't min'), num(form.tmax, 't max'));
    const ext = extentOf(...pts, a.r);
    const tl = [scale(a.T, -2), scale(a.T, 2)].map((d) => d.map((x, i) => x + a.r[i]) as Vec3);
    return { meta: { operation: 'Curve analysis' },
      answer: [{ label: 'r(t₀)', value: f.v(a.r) }, { label: "r′(t)", value: `(${a.d1.join(', ')})` }, { label: "r″(t)", value: `(${a.d2.join(', ')})` }, { label: "r′(t₀)", value: f.v(a.r1) }, { label: "r″(t₀)", value: f.v(a.r2) },
        { label: 'Unit tangent T', value: f.v(a.T) }, { label: 'Normal N', value: a.N ? f.v(a.N) : 'undefined (curvature is 0 here)' }, { label: 'Binormal B', value: a.B ? f.v(a.B) : 'undefined (curvature is 0 here)' },
        { label: 'Curvature κ', value: f.n(a.kappa) }, { label: 'Tangent line', value: `r = ${f.v(a.r)} + s·${f.v(a.r1)}` }],
      steps: solution({ given: [`x(t) = ${form.x}`, `y(t) = ${form.y}`, `z(t) = ${form.z}`, `t₀ = ${f.n(t0)}`], required: 'Derivatives, Frenet frame, curvature and tangent line at t₀.',
        formula: ['T = r′/|r′|', 'B = (r′ × r″)/|r′ × r″|', 'N = B × T', 'κ = |r′ × r″| / |r′|³'],
        substitution: [`r′(t) = (${a.d1.join(', ')})`, `r″(t) = (${a.d2.join(', ')})`, `r′(t₀) = ${f.v(a.r1)},  r″(t₀) = ${f.v(a.r2)}`],
        intermediate: [`|r′(t₀)| = ${f.n(a.speed)}`, `r′ × r″ = ${f.v([a.r1[1] * a.r2[2] - a.r1[2] * a.r2[1], a.r1[2] * a.r2[0] - a.r1[0] * a.r2[2], a.r1[0] * a.r2[1] - a.r1[1] * a.r2[0]])}`,
          ...(a.straight ? ['r′ × r″ = 0 ⇒ κ = 0; N and B are undefined for a locally straight curve.'] : [])],
        final: [`T = ${f.v(a.T)}`, `N = ${a.N ? f.v(a.N) : 'undefined'}`, `B = ${a.B ? f.v(a.B) : 'undefined'}`, `κ = ${f.n(a.kappa)}`], why: { formula: 'Standard differential-geometry formulas for a space curve.' } }),
      shapes: [{ kind: 'polyline', pts, color: C[0], label: 'r(t)' }, { kind: 'point', p: a.r, color: C[1], label: 't₀' }, { kind: 'polyline', pts: tl, color: C[3], dashed: true, label: 'tangent line' },
        { kind: 'vector', from: a.r, vec: a.T, color: C[2], label: 'T' }, ...(a.N ? [{ kind: 'vector', from: a.r, vec: a.N, color: C[4], label: 'N' } as const] : []), ...(a.B ? [{ kind: 'vector', from: a.r, vec: a.B, color: C[5], label: 'B' } as const] : [])].map((s) => s as never), extent: ext };
  };
  return (
    <CalcShell title="Curves" subtitle="Enter x(t), y(t), z(t). Use t as the variable, e.g. cos(t), t^2, exp(t)." form={form} restored={restored} onCalculate={calc}
      onExample={() => setForm({ tool: 'curve', x: 'cos(t)', y: 'sin(t)', z: 't', tmin: '0', tmax: '4*pi', t0: 'pi/4' })} onClear={() => setForm({ ...form, x: '', y: '', z: '' })}
      inputs={<>
        <Field label="x(t)" value={form.x} onChange={(x) => set({ x })} /><Field label="y(t)" value={form.y} onChange={(y) => set({ y })} /><Field label="z(t)" value={form.z} onChange={(z) => set({ z })} />
        <div className="grid grid-cols-3 gap-2"><Field label="t min" value={form.tmin} onChange={(tmin) => set({ tmin })} /><Field label="t max" value={form.tmax} onChange={(tmax) => set({ tmax })} /><Field label="t₀ (selected)" value={form.t0} onChange={(t0) => set({ t0 })} /></div>
      </>} />
  );
}

/* ---------------- Planes ---------------- */
function PlaneTool() {
  const { form, set, setForm, restored } = usePageForm(() => ({ tool: 'plane' as const, mode: 'pn' as 'pn' | 'general', p: ['1', '0', '0'], n: ['1', '2', '2'], g: ['1', '2', '2', '-1'], q: ['3', '4', '5'] }), (r) => r.tool === 'plane');
  const f = useFmt();
  const upd = (k: 'p' | 'n' | 'g' | 'q', i: number, s: string) => set({ [k]: form[k].map((x, j) => (j === i ? s : x)) } as never);
  const calc = (): CalcResult => {
    const q = nums(form.q, ['Q x', 'Q y', 'Q z']) as Vec3;
    let pl: Plane, given: string[];
    if (form.mode === 'pn') { const p = nums(form.p, ['P x', 'P y', 'P z']) as Vec3, n = nums(form.n, ['n a', 'n b', 'n c']) as Vec3; pl = planeFromPointNormal(p, n); given = [`Point P₀ = ${f.v(p)}`, `Normal n = ${f.v(n)}`]; }
    else { const g = nums(form.g, ['A', 'B', 'C', 'D']); pl = planeFromGeneral(g[0], g[1], g[2], g[3]); given = [`A = ${f.n(g[0])}, B = ${f.n(g[1])}, C = ${f.n(g[2])}, D = ${f.n(g[3])}`]; }
    const d = distancePointPlane(pl, q), on = pointOnPlane(pl), foot = footOnPlane(pl, q);
    return { meta: { operation: 'Plane', method: form.mode === 'pn' ? 'Point + normal' : 'General equation' },
      answer: [{ label: 'Normal vector', value: f.v(pl.n) }, { label: 'Plane equation', value: planeEq(pl, f) }, { label: `Distance from Q = ${f.v(q)}`, value: f.n(d) }, { label: 'Tangent plane', value: 'A plane is its own tangent plane at every point.' }],
      steps: solution({ given: [...given, `Q = ${f.v(q)}`], required: 'The plane equation, its normal, and the distance from Q to the plane.', formula: ['n·(r − P₀) = 0  ⇒  A x + B y + C z + D = 0', 'distance = |A·x₁ + B·y₁ + C·z₁ + D| / √(A² + B² + C²)'],
        substitution: [`Plane: ${planeEq(pl, f)}`, `distance = |${f.n(pl.n[0])}(${f.n(q[0])}) + ${f.n(pl.n[1])}(${f.n(q[1])}) + ${f.n(pl.n[2])}(${f.n(q[2])}) + ${f.n(pl.d)}| / ${f.n(norm(pl.n))}`], final: [`distance = ${f.n(d)}`] }),
      shapes: [{ kind: 'plane', p: on, n: pl.n, size: 8, color: C[0] }, { kind: 'vector', from: on, vec: scale(pl.n, 2 / norm(pl.n)), color: C[2], label: 'n' }, { kind: 'point', p: q, color: C[1], label: 'Q' },
        { kind: 'point', p: foot, color: C[3], label: 'foot' }, { kind: 'polyline', pts: [q, foot], dashed: true, color: C[3], label: `d = ${f.n(d)}` }], extent: extentOf(q, on) };
  };
  const row = (k: 'p' | 'n' | 'q', labels: string[]) => <div className="grid grid-cols-3 gap-2">{labels.map((l, i) => <Field key={l} label={l} value={form[k][i]} onChange={(s) => upd(k, i, s)} />)}</div>;
  return (
    <CalcShell title="Planes" subtitle="A point and a normal, or the general equation Ax + By + Cz + D = 0." form={form} restored={restored} onCalculate={calc}
      onExample={() => setForm({ ...form, p: ['1', '0', '0'], n: ['1', '2', '2'], g: ['1', '2', '2', '-1'], q: ['3', '4', '5'] })} onClear={() => setForm({ ...form, p: ['', '', ''], n: ['', '', ''], g: ['', '', '', ''] })}
      inputs={<>
        <SelectField label="Input method" value={form.mode} onChange={(mode) => set({ mode })} options={[{ value: 'pn', label: 'Point + normal vector' }, { value: 'general', label: 'General equation' }]} />
        {form.mode === 'pn' ? <>{row('p', ['P₀ x', 'P₀ y', 'P₀ z'])}{row('n', ['n a', 'n b', 'n c'])}</>
          : <div className="grid grid-cols-4 gap-2">{['A', 'B', 'C', 'D'].map((l, i) => <Field key={l} label={l} value={form.g[i]} onChange={(s) => upd('g', i, s)} />)}</div>}
        <h3 className="font-semibold">Point Q (for the distance)</h3>{row('q', ['x', 'y', 'z'])}
      </>} />
  );
}

/* ---------------- Implicit surfaces ---------------- */
function SurfaceTool() {
  const { form, set, setForm, restored } = usePageForm(() => ({ tool: 'surface' as const, expr: 'x^2 + y^2 + z^2 = 9', p: ['1', '2', '2'] }), (r) => r.tool === 'surface');
  const f = useFmt();
  const calc = (): CalcResult => {
    const P = nums(form.p, ['x₀', 'y₀', 'z₀']) as Vec3;
    const a = analyzeImplicit(form.expr, P);
    const { F } = parseImplicit(form.expr);
    const mesh = isoSurface(F, 5, 30);
    const te = tangentEq(a.grad, P, f);
    return { meta: { operation: 'Implicit surface F(x, y, z) = 0' },
      answer: [{ label: 'Surface', value: form.expr }, { label: 'Check F(P₀)', value: `${f.n(a.F0)} ≈ 0 (point is on the surface)` }, { label: 'Gradient ∇F', value: `(${a.gradText.join(', ')})` }, { label: '∇F(P₀)', value: f.v(a.grad) },
        { label: 'Unit normal', value: f.v(a.unit) }, { label: 'Tangent plane', value: te[1] }],
      steps: solution({ given: [`Surface: ${form.expr}`, `P₀ = ${f.v(P)}`], required: 'Normal vector and tangent plane at P₀.', formula: ['N = ∇F = (∂F/∂x, ∂F/∂y, ∂F/∂z)', '∇F(P₀) · (r − P₀) = 0'],
        substitution: [`F(P₀) = ${f.n(a.F0)}  (must be 0 within tolerance)`, `∇F = (${a.gradText.join(', ')})`, `∇F(P₀) = ${f.v(a.grad)}`], intermediate: [`|∇F(P₀)| = ${f.n(norm(a.grad))} ≠ 0, so the point is regular.`], final: [`Normal: ${f.v(a.grad)}`, `Tangent plane: ${te[0]}`, `⇒ ${te[1]}`] }),
      shapes: [{ kind: 'mesh', positions: mesh, color: C[0] }, { kind: 'point', p: P, color: C[1], label: 'P₀' }, { kind: 'vector', from: P, vec: scale(a.unit, 2), color: C[2], label: 'N' }, { kind: 'plane', p: P, n: a.grad, size: 4, color: C[3] }].map((s) => s as never), extent: 5 };
  };
  return (
    <CalcShell title="Surfaces" subtitle="Implicit surface F(x, y, z) = 0 (or z = f(x, y)), with the normal and tangent plane at a point." form={form} restored={restored} onCalculate={calc}
      onExample={() => setForm({ tool: 'surface', expr: 'x^2 + y^2 + z^2 = 9', p: ['1', '2', '2'] })} onClear={() => setForm({ ...form, expr: '', p: ['', '', ''] })}
      inputs={<>
        <Field label="Equation" value={form.expr} onChange={(expr) => set({ expr })} placeholder="x^2 + y^2 + z^2 = 9" />
        <div className="grid grid-cols-3 gap-2">{['x₀', 'y₀', 'z₀'].map((l, i) => <Field key={l} label={l} value={form.p[i]} onChange={(s) => set({ p: form.p.map((x, j) => (j === i ? s : x)) })} />)}</div>
      </>} />
  );
}

export default function GeometryExplorer() {
  const loc = useLocation();
  const [tool, setTool] = useState<Tool>(((loc.state as { restore?: { tool?: Tool } } | null)?.restore?.tool) ?? 'line');
  return (
    <div className="space-y-4">
      <Segmented label="Tool" value={tool} onChange={setTool} options={[{ value: 'line', label: 'Lines' }, { value: 'curve', label: 'Curves' }, { value: 'plane', label: 'Planes' }, { value: 'surface', label: 'Surfaces' }]} />
      <div key={tool}>{tool === 'line' ? <LineTool /> : tool === 'curve' ? <CurveTool /> : tool === 'plane' ? <PlaneTool /> : <SurfaceTool />}</div>
    </div>
  );
}
