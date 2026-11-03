import { useMemo, useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Tex from '../components/ui/Tex';
import { inputCls } from '../components/calc/forms';
import { CATEGORIES, FORMULAS } from '../formulas/data';

const KEY = 'vectorlab-favs';
const loadFavs = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; } };

export default function FormulaLibrary() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [onlyFav, setOnlyFav] = useState(false);
  const [favs, setFavs] = useState<string[]>(loadFavs);
  const [copied, setCopied] = useState<string | null>(null);

  const toggle = (id: string) => setFavs((l) => {
    const n = l.includes(id) ? l.filter((x) => x !== id) : [...l, id];
    try { localStorage.setItem(KEY, JSON.stringify(n)); } catch { /* ignore */ }
    return n;
  });
  const copy = async (id: string, tex: string) => { try { await navigator.clipboard.writeText(tex); setCopied(id); setTimeout(() => setCopied(null), 1200); } catch { /* ignore */ } };
  const list = useMemo(() => FORMULAS.filter((f) =>
    (cat === 'All' || f.cat === cat) && (!onlyFav || favs.includes(f.id)) &&
    (`${f.name} ${f.explain} ${f.vars} ${f.cat}`.toLowerCase().includes(q.toLowerCase()))), [q, cat, onlyFav, favs]);

  return (
    <>
      <PageHeader title="Formula Library" subtitle="Search every formula used in VectorLab, with variables and a worked example." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input className={inputCls + ' max-w-xs'} placeholder="Search formulas…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search formulas" />
        <select className={inputCls + ' max-w-xs'} value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
          <option>All</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyFav} onChange={(e) => setOnlyFav(e.target.checked)} />Favorites only</label>
        <span className="text-sm text-muted">{list.length} formulas</span>
      </div>
      {list.length === 0 && <Card><p className="text-muted">No formulas match your search.</p></Card>}
      <div className="grid gap-4 md:grid-cols-2">
        {list.map((f) => (
          <Card key={f.id} className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div><p className="text-xs text-muted">{f.cat}</p><h2 className="font-semibold">{f.name}</h2></div>
              <div className="flex gap-1 text-sm">
                <button onClick={() => toggle(f.id)} aria-pressed={favs.includes(f.id)} className="rounded-lg border border-line px-2 py-1">{favs.includes(f.id) ? '★' : '☆'}</button>
                <button onClick={() => copy(f.id, f.tex)} className="rounded-lg border border-line px-2 py-1">{copied === f.id ? 'Copied' : 'Copy'}</button>
              </div>
            </div>
            <div className="overflow-x-auto py-1"><Tex tex={f.tex} display /></div>
            <p className="text-sm">{f.explain}</p>
            <p className="text-sm text-muted"><b>Variables:</b> {f.vars}</p>
            <p className="text-sm"><b>Example:</b> <span className="font-mono">{f.example}</span></p>
          </Card>))}
      </div>
    </>
  );
}
