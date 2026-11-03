import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import { btnGhost } from '../components/calc/CalcShell';
import { useHistory } from '../context/HistoryContext';

export default function History() {
  const { entries, clear } = useHistory();
  const nav = useNavigate();
  return (
    <>
      <PageHeader title="History" subtitle="Calculations from this session. Reopen one to restore its inputs and recalculate.">
        {entries.length > 0 && <button className={btnGhost} onClick={clear}>Clear history</button>}
      </PageHeader>
      {entries.length === 0 && <Card><p className="text-muted">Nothing here yet. Your calculations will appear after you press Calculate.</p></Card>}
      <div className="space-y-3">
        {entries.map((e) => (
          <Card key={e.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div><h2 className="font-semibold">{e.title} — {e.operation}</h2><p className="text-xs text-muted">{new Date(e.time).toLocaleTimeString()}</p></div>
              <div className="flex gap-2">
                <button className={btnGhost} onClick={() => nav(e.path, { state: { restore: e.form } })}>Reopen</button>
                <button className={btnGhost} onClick={() => navigator.clipboard?.writeText(e.copyText).catch(() => {})}>Copy</button>
              </div>
            </div>
            <ul className="mt-2 font-mono text-sm">{e.summary.map((s, i) => <li key={i} className="break-words">{s}</li>)}</ul>
          </Card>))}
      </div>
    </>
  );
}
