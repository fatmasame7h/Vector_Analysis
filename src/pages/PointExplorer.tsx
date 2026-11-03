import { useMemo, useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import { PointForm, parsePointState, type PointState } from '../components/calc/forms';
import { btnPrimary } from '../components/calc/CalcShell';
import { convertPoint, toCartesian } from '../engines/coordinates';
import { useFmt, useSettings } from '../context/SettingsContext';
import { useWorkspace } from '../context/WorkspaceContext';
import Scene3D from '../visualization/Scene3D';
import type { SceneShape } from '../visualization/types';
import { C, extentOf, fmtPoint } from './helpers';

export default function PointExplorer() {
  const [pt, setPt] = useState<PointState>({ system: 'cartesian', a: '3', b: '4', c: '5' });
  const f = useFmt();
  const { angleUnit } = useSettings();
  const ws = useWorkspace();

  const data = useMemo(() => {
    try {
      const c = toCartesian(parsePointState(pt, angleUnit));
      return { ok: true as const, c, cyl: convertPoint(c, 'cylindrical'), sph: convertPoint(c, 'spherical') };
    } catch (e) { return { ok: false as const, error: e instanceof Error ? e.message : String(e) }; }
  }, [pt, angleUnit]);

  let shapes: SceneShape[] = [], extent = 5;
  if (data.ok) {
    const { x, y, z } = data.c, P: [number, number, number] = [x, y, z];
    extent = extentOf(P);
    const d = Math.hypot(x, y, z);
    const pl = (n: [number, number, number], col: string): SceneShape => ({ kind: 'plane', p: [0, 0, 0], n, size: extent * 2, opacity: 0.06, color: col });
    const dash = (a: [number, number, number], b: [number, number, number], col: string): SceneShape => ({ kind: 'polyline', pts: [a, b], dashed: true, color: col });
    shapes = [pl([0, 0, 1], C[0]), pl([0, 1, 0], C[2]), pl([1, 0, 0], C[1]),
      { kind: 'vector', from: [0, 0, 0], vec: P, color: C[0], label: `OP, d = ${f.n(d)}` },
      { kind: 'point', p: P, color: C[1], label: `P ${fmtPoint(data.c, f)}` }, { kind: 'point', p: [0, 0, 0], color: C[4], label: 'O' },
      dash(P, [x, y, 0], C[3]), dash(P, [x, 0, z], C[3]), dash(P, [0, y, z], C[3]),
      dash(P, [x, 0, 0], C[5]), dash(P, [0, y, 0], C[5]), dash(P, [0, 0, z], C[5]),
      { kind: 'point', p: [x, y, 0], color: C[3], label: 'xy' }, { kind: 'point', p: [x, 0, z], color: C[3], label: 'xz' }, { kind: 'point', p: [0, y, z], color: C[3], label: 'yz' },
      { kind: 'point', p: [x, 0, 0], color: C[5], label: 'x' }, { kind: 'point', p: [0, y, 0], color: C[5], label: 'y' }, { kind: 'point', p: [0, 0, z], color: C[5], label: 'z' }];
  }
  return (
    <>
      <PageHeader title="Point Explorer" subtitle="Change the point and every representation, projection and the 3D view update instantly." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <Card><PointForm title="Point" value={pt} onChange={setPt} /></Card>
        <div className="min-w-0 space-y-4">
          {!data.ok && <div role="alert" className="rounded-card border border-red-400/60 bg-red-500/10 p-4 text-sm">{data.error}</div>}
          {data.ok && (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                {[['Cartesian', data.c], ['Cylindrical', data.cyl], ['Spherical', data.sph]].map(([name, p]) => (
                  <Card key={name as string}><p className="text-sm text-muted">{name as string}</p><p className="mt-1 break-words font-mono text-sm">{fmtPoint(p as typeof data.c, f)}</p></Card>
                ))}
              </div>
              <Card>
                <dl className="grid gap-x-6 gap-y-1 font-mono text-sm sm:grid-cols-2">
                  {[['Distance from origin', f.n(Math.hypot(data.c.x, data.c.y, data.c.z))], ['Position vector', f.v([data.c.x, data.c.y, data.c.z])],
                    ['Projection on x-axis', f.v([data.c.x, 0, 0])], ['Projection on y-axis', f.v([0, data.c.y, 0])], ['Projection on z-axis', f.v([0, 0, data.c.z])],
                    ['Projection on xy-plane', f.v([data.c.x, data.c.y, 0])], ['Projection on xz-plane', f.v([data.c.x, 0, data.c.z])], ['Projection on yz-plane', f.v([0, data.c.y, data.c.z])]]
                    .map(([k, v]) => <div key={k} className="flex justify-between gap-3"><dt className="text-muted">{k}</dt><dd>{v}</dd></div>)}
                </dl>
              </Card>
              <Scene3D shapes={shapes} extent={extent} height={440} />
              <button className={btnPrimary} onClick={() => ws.openInVisualizer(shapes, 'Point Explorer')}>Open in the larger 3D Visualizer</button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
