import { useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import { Field, SelectField } from '../components/calc/forms';
import { btnGhost, btnPrimary } from '../components/calc/CalcShell';
import { useWorkspace, type WorkItem } from '../context/WorkspaceContext';
import Scene3D from '../visualization/Scene3D';
import { OBJ_LABEL, FIELDS, buildShapes, defaultParams, type ObjType } from '../visualization/builders';
import { PALETTE, type SceneOptions, type SceneShape } from '../visualization/types';

export default function Visualizer() {
  const { items, setItems } = useWorkspace();
  const [type, setType] = useState<ObjType>('point');
  const [params, setParams] = useState<Record<string, string>>(defaultParams('point'));
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opts, setOpts] = useState<SceneOptions>({ axes: true, grid: true, labels: true, projections: false });
  const [counter, setCounter] = useState(1);

  const changeType = (t: ObjType) => { setType(t); setParams(defaultParams(t)); setEditing(null); setError(null); };
  const draw = () => {
    try {
      if (editing) {
        const it = items.find((i) => i.id === editing)!;
        setItems((l) => l.map((i) => (i.id === editing ? { ...i, params, type, shapes: buildShapes(type, params, it.name) } : i)));
        setEditing(null);
      } else {
        const name = `${OBJ_LABEL[type]} ${counter}`;
        const shapes = buildShapes(type, params, name);
        setItems((l) => [...l, { id: `o${Date.now()}`, name, color: PALETTE[(counter - 1) % PALETTE.length], visible: true, type, params, shapes }]);
        setCounter(counter + 1);
      }
      setError(null);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  };
  const patch = (id: string, p: Partial<WorkItem>) => setItems((l) => l.map((i) => (i.id === id ? { ...i, ...p } : i)));
  const rename = (it: WorkItem, name: string) => {
    let shapes = it.shapes;
    if (it.params && it.type !== 'imported') { try { shapes = buildShapes(it.type, it.params, name); } catch { /* keep old shapes */ } }
    patch(it.id, { name, shapes });
  };
  const recolor = (it: WorkItem, color: string) => patch(it.id, { color, shapes: it.type === 'imported' ? it.shapes.map((s) => ({ ...s, color })) : it.shapes });
  const edit = (it: WorkItem) => { if (it.type === 'imported' || !it.params) return; setType(it.type); setParams(it.params); setEditing(it.id); setError(null); };

  const shapes: SceneShape[] = items.filter((i) => i.visible).flatMap((i) => i.shapes.map((s) => ({ ...s, color: s.color ?? i.color }) as SceneShape));
  const tog = (k: keyof SceneOptions, label: string) => <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={opts[k]} onChange={(e) => setOpts({ ...opts, [k]: e.target.checked })} />{label}</label>;

  return (
    <>
      <PageHeader title="3D Visualizer" subtitle="A free workspace: add points, vectors, lines, planes, curves and surfaces. Nothing is preloaded." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <div className="order-2 space-y-4 lg:order-1">
          <Card className="space-y-3">
            <SelectField label="Object type" value={type} onChange={changeType} options={(Object.keys(OBJ_LABEL) as ObjType[]).map((t) => ({ value: t, label: OBJ_LABEL[t] }))} />
            <div className="grid grid-cols-3 gap-2">
              {FIELDS[type].map((fd) => (
                <div key={fd.key} className={fd.wide || fd.area ? 'col-span-3' : ''}>
                  <Field label={fd.label} area={fd.area} value={params[fd.key] ?? ''} onChange={(v) => setParams({ ...params, [fd.key]: v })} />
                </div>))}
            </div>
            {error && <p role="alert" className="rounded-lg bg-red-500/10 p-2 text-sm">{error}</p>}
            <div className="flex gap-2">
              <button className={btnPrimary} onClick={draw}>{editing ? 'Update' : 'Draw'}</button>
              {editing && <button className={btnGhost} onClick={() => changeType(type)}>Cancel edit</button>}
            </div>
          </Card>
          <Card className="space-y-2">
            <div className="flex items-center justify-between"><h3 className="font-semibold">Objects ({items.length})</h3>
              {items.length > 0 && <button className="text-sm text-accent" onClick={() => { setItems([]); setEditing(null); }}>Clear workspace</button>}</div>
            {items.length === 0 && <p className="text-sm text-muted">The workspace is empty. Choose an object type and press Draw.</p>}
            {items.map((it) => (
              <div key={it.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-line p-2">
                <input type="checkbox" checked={it.visible} onChange={(e) => patch(it.id, { visible: e.target.checked })} aria-label={`Show ${it.name}`} />
                <input type="color" value={it.color} onChange={(e) => recolor(it, e.target.value)} aria-label={`Color of ${it.name}`} className="h-7 w-7 rounded border border-line bg-transparent" />
                <input value={it.name} onChange={(e) => rename(it, e.target.value)} aria-label="Object name" className="min-w-0 flex-1 rounded border border-line bg-surface px-2 py-1 text-sm" />
                <button className="text-sm text-accent disabled:opacity-40" disabled={it.type === 'imported'} onClick={() => edit(it)}>Edit</button>
                <button className="text-sm text-red-500" onClick={() => { setItems((l) => l.filter((i) => i.id !== it.id)); if (editing === it.id) setEditing(null); }}>Delete</button>
              </div>))}
          </Card>
          <Card className="grid grid-cols-2 gap-2">{tog('axes', 'Axes')}{tog('grid', 'Grid')}{tog('labels', 'Labels')}{tog('projections', 'Projections')}</Card>
        </div>
        <div className="order-1 min-w-0 lg:order-2"><Scene3D shapes={shapes} options={opts} height={560} extent={6} /></div>
      </div>
    </>
  );
}
