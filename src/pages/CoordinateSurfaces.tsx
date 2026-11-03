import { useMemo, useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Segmented from '../components/ui/Segmented';
import StepsView from '../components/calc/StepsView';
import { Field, SelectField } from '../components/calc/forms';
import { btnPrimary } from '../components/calc/CalcShell';
import { solution } from '../components/calc/steps';
import { basisAt } from '../engines/vectors/basis';
import { COORD_SYMBOL, SURFACE_COORDS, analyzeSurface, surfaceNormal, type SurfaceSystem } from '../engines/surfaces/coordinateSurfaces';
import { UndefinedResultError, toDeg } from '../utils/math';
import { angleIn, num } from '../utils/parse';
import { scale } from '../engines/vectors/vec3';
import { useFmt, useSettings } from '../context/SettingsContext';
import { useWorkspace } from '../context/WorkspaceContext';
import Scene3D from '../visualization/Scene3D';
import type { SceneShape } from '../visualization/types';
import { C } from './helpers';

const isAngle = (coord: string) => coord === 'phi' || coord === 'theta';
const SYS: { value: SurfaceSystem; label: string }[] = [{ value: 'cartesian', label: 'Cartesian' }, { value: 'cylindrical', label: 'Cylindrical' }, { value: 'spherical', label: 'Spherical' }];

export default function CoordinateSurfaces() {
  const { angleUnit, setAngleUnit, mode, setMode } = useSettings();
  const f = useFmt();
  const ws = useWorkspace();
  const [st, setSt] = useState({ system: 'cylindrical' as SurfaceSystem, coord: 'rho', c: '2', u: '45', v: '1' });
  const [show, setShow] = useState({ normal: true, plane: true, axes: true, grid: true, basis: false });
  const shown = (x: number, angle: boolean) => String(parseFloat((angle ? (angleUnit === 'deg' ? toDeg(x) : x) : x).toFixed(4)));

  const pick = (system: SurfaceSystem, coord: string) => {
    const c = isAngle(coord) ? (angleUnit === 'deg' ? '60' : '1.0472') : '2';
    const cv = isAngle(coord) ? (angleUnit === 'deg' ? Math.PI / 3 : 1.0472) : 2;
    const info = analyzeSurface(system, coord, cv);
    setSt({ system, coord, c, u: shown(info.freeDefaults[0], info.freeIsAngle[0]), v: shown(info.freeDefaults[1], info.freeIsAngle[1]) });
  };

  const out = useMemo(() => {
    try {
      const cVal = isAngle(st.coord) ? (angleIn(st.c, angleUnit, 'c', false) as number) : num(st.c, 'c');
      const info = analyzeSurface(st.system, st.coord, cVal);
      const pu = info.freeIsAngle[0] ? (angleIn(st.u, angleUnit, info.freeLabels[0], false) as number) : num(st.u, info.freeLabels[0]);
      const pv = info.freeIsAngle[1] ? (angleIn(st.v, angleUnit, info.freeLabels[1], false) as number) : num(st.v, info.freeLabels[1]);
      const bad = info.validate(pu, pv);
      if (bad) throw new Error(bad);
      const P = info.point(pu, pv);
      let nrm: ReturnType<typeof surfaceNormal> | null = null, nerr: string | null = null;
      try { nrm = surfaceNormal(info, P); } catch (e) { nerr = e instanceof UndefinedResultError ? e.message : e instanceof Error ? e.message : String(e); }
      return { ok: true as const, info, P, nrm, nerr };
    } catch (e) { return { ok: false as const, error: e instanceof Error ? e.message : String(e) }; }
  }, [st, angleUnit]);

  let shapes: SceneShape[] = [], steps = null as ReturnType<typeof solution> | null;
  if (out.ok) {
    const { info, P, nrm, nerr } = out;
    shapes = info.grid.length ? [{ kind: 'surface', grid: info.grid, color: C[0] }] : info.polyline ? [{ kind: 'polyline', pts: info.polyline, color: C[0], label: info.shape }] : [];
    shapes.push({ kind: 'point', p: P, color: C[1], label: 'P₀' });
    if (nrm && show.normal) shapes.push({ kind: 'vector', from: P, vec: scale(nrm.unit, 2), color: C[2], label: 'N' });
    if (nrm && show.plane) shapes.push({ kind: 'plane', p: P, n: nrm.unit, size: 3, color: C[3], opacity: 0.35 });
    if (show.basis) { try { const b = basisAt(st.system, { system: 'cartesian', x: P[0], y: P[1], z: P[2] }); [b.e1, b.e2, b.e3].forEach((e, i) => shapes.push({ kind: 'vector', from: P, vec: e, color: C[4 + (i % 3)], label: `a_${b.names[i]}` })); } catch { /* undefined at singular points */ } }
    const given = [`Surface: ${info.coordEq}  (${info.shape})`, `Selected point from ${info.freeLabels[0]} = ${st.u}, ${info.freeLabels[1]} = ${st.v}:  P₀ = ${f.v(P)} (Cartesian)`];
    steps = solution({ given, required: 'The normal vector and the tangent plane at P₀.',
      formula: ['Write the surface as F(x, y, z) = 0', 'N = ∇F = (∂F/∂x, ∂F/∂y, ∂F/∂z)', 'Tangent plane: ∇F(P₀) · (r − P₀) = 0'],
      substitution: [`F(x, y, z) = ${info.implicit}`, info.gradient, `F(P₀) = ${f.n(info.F(P))}  (≈ 0 ⇒ P₀ lies on the surface)`, ...(nrm ? [`∇F(P₀) = ${f.v(nrm.grad)}`] : [])],
      intermediate: [...(nrm ? [`|∇F(P₀)| = ${f.n(Math.hypot(...nrm.grad))} ≠ 0, so P₀ is a regular point.`] : []), ...info.notes, ...(info.degenerate ? [info.degenerate] : [])],
      final: nrm ? [`Unit normal: ${f.v(nrm.unit)}`, `Tangent plane: ${f.n(nrm.grad[0])}(x − ${f.n(P[0])}) + ${f.n(nrm.grad[1])}(y − ${f.n(P[1])}) + ${f.n(nrm.grad[2])}(z − ${f.n(P[2])}) = 0`, `⇒ ${f.n(nrm.grad[0])}x + ${f.n(nrm.grad[1])}y + ${f.n(nrm.grad[2])}z = ${f.n(nrm.d)}`] : [`No unique normal or tangent plane here: ${nerr}`] });
  }
  const upd = (p: Partial<typeof st>) => setSt((s) => ({ ...s, ...p }));
  const tog = (k: keyof typeof show, label: string) => <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={show[k]} onChange={(e) => setShow({ ...show, [k]: e.target.checked })} />{label}</label>;

  return (
    <>
      <PageHeader title="Coordinate Surfaces Explorer" subtitle="Hold one coordinate constant and explore the surface, its normal and its tangent plane." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card className="space-y-3">
            <SelectField label="Coordinate system" value={st.system} onChange={(s) => pick(s, SURFACE_COORDS[s][0])} options={SYS} />
            <SelectField label="Constant coordinate" value={st.coord} onChange={(c) => pick(st.system, c)} options={SURFACE_COORDS[st.system].map((c) => ({ value: c, label: `${COORD_SYMBOL[c]} = c` }))} />
            <Field label={`Constant c${isAngle(st.coord) ? ` (${angleUnit})` : ''}`} value={st.c} onChange={(c) => upd({ c })} />
            <Segmented label="Angle unit" value={angleUnit} onChange={setAngleUnit} options={[{ value: 'deg', label: 'Degrees' }, { value: 'rad', label: 'Radians' }]} />
          </Card>
          <Card className="space-y-3">
            <h3 className="font-semibold">Point on the surface</h3>
            {out.ok ? <div className="grid grid-cols-2 gap-2">
              <Field label={`${out.info.freeLabels[0]}${out.info.freeIsAngle[0] ? ` (${angleUnit})` : ''}`} value={st.u} onChange={(u) => upd({ u })} />
              <Field label={`${out.info.freeLabels[1]}${out.info.freeIsAngle[1] ? ` (${angleUnit})` : ''}`} value={st.v} onChange={(v) => upd({ v })} />
            </div> : <p className="text-sm text-muted">Fix the constant first.</p>}
          </Card>
          <Card className="grid grid-cols-2 gap-2">{tog('normal', 'Normal')}{tog('plane', 'Tangent plane')}{tog('axes', 'Axes')}{tog('grid', 'Grid')}{tog('basis', 'Local directions')}</Card>
        </div>
        <div className="min-w-0 space-y-4">
          {!out.ok && <div role="alert" className="rounded-card border border-red-400/60 bg-red-500/10 p-4 text-sm">{out.error}</div>}
          {out.ok && (
            <>
              <Card>
                <p className="text-lg font-semibold">{out.info.coordEq}</p>
                <p className="text-sm text-muted">{out.info.shape}</p>
                <p className="mt-2 font-mono text-sm">F(x, y, z) = {out.info.implicit}</p>
                {out.info.degenerate && <p role="alert" className="mt-2 rounded-lg bg-amber-500/15 p-2 text-sm">{out.info.degenerate}</p>}
                {!out.info.degenerate && out.nerr && <p role="alert" className="mt-2 rounded-lg bg-amber-500/15 p-2 text-sm">{out.nerr}</p>}
                {out.nrm && <p className="mt-2 font-mono text-sm">N = {f.v(out.nrm.grad)},  unit normal = {f.v(out.nrm.unit)}</p>}
              </Card>
              <Scene3D shapes={shapes} options={{ axes: show.axes, grid: show.grid }} height={440} extent={5} />
              <button className={btnPrimary} onClick={() => ws.openInVisualizer(shapes, `${out.info.coordEq}`)}>Open in the larger 3D Visualizer</button>
              <Segmented label="Display" value={mode} onChange={setMode} options={[{ value: 'answer', label: 'Final answer' }, { value: 'steps', label: 'Step-by-step' }]} />
              {mode === 'steps' && steps && <StepsView steps={steps} />}
              {mode === 'answer' && steps && <Card><p className="font-mono text-sm">{steps[steps.length - 1].lines.join('\n')}</p></Card>}
            </>
          )}
        </div>
      </div>
    </>
  );
}
