import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Segmented from '../ui/Segmented';
import StepsView from './StepsView';
import type { Step } from './steps';
import Scene3D from '../../visualization/Scene3D';
import type { SceneOptions, SceneShape } from '../../visualization/types';
import { useSettings } from '../../context/SettingsContext';
import { useHistory } from '../../context/HistoryContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { exportPdf } from '../../utils/pdf';

export interface CalcResult {
  answer: { label: string; value: string }[];
  steps: Step[];
  shapes: SceneShape[];
  meta: { operation: string; system?: string; method?: string };
  sceneOptions?: Partial<SceneOptions>;
  extent?: number;
}
export const btn = 'rounded-lg px-4 py-2 text-sm font-medium transition-colors';
export const btnPrimary = `${btn} bg-accent text-accent-ink hover:opacity-90`;
export const btnGhost = `${btn} border border-line bg-surface text-ink hover:border-accent`;

export default function CalcShell({ title, subtitle, form, restored, inputs, onCalculate, onExample, onClear }: {
  title: string; subtitle: string; form: unknown; restored?: boolean; inputs: ReactNode;
  onCalculate: () => CalcResult; onExample?: () => void; onClear?: () => void;
}) {
  const s = useSettings();
  const history = useHistory();
  const ws = useWorkspace();
  const loc = useLocation();
  const [result, setResult] = useState<CalcResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const first = useRef(restored);

  const text = (r: CalcResult) => `${title} — ${r.meta.operation}\n` + r.answer.map((a) => `${a.label}: ${a.value}`).join('\n');
  const run = (record = true) => {
    try {
      const r = onCalculate();
      setResult(r); setError(null);
      if (record) history.add({ path: loc.pathname, title, operation: r.meta.operation, summary: r.answer.map((a) => `${a.label}: ${a.value}`), form, copyText: text(r) });
    } catch (e) { setResult(null); setError(e instanceof Error ? e.message : String(e)); }
  };
  useEffect(() => { if (first.current) { first.current = false; run(false); } /* eslint-disable-next-line */ }, []);

  const copy = async () => {
    if (!result) return;
    try { await navigator.clipboard.writeText(text(result)); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { setError('Copy is not available in this browser.'); }
  };

  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card className="space-y-4">{inputs}</Card>
          <Card className="flex flex-wrap items-center gap-3">
            <Segmented label="Angle unit" value={s.angleUnit} onChange={s.setAngleUnit} options={[{ value: 'deg', label: 'Degrees' }, { value: 'rad', label: 'Radians' }]} />
            <label className="flex items-center gap-2 text-sm text-muted">Decimals
              <select className="rounded-lg border border-line bg-surface px-2 py-1 text-ink" value={s.precision} onChange={(e) => s.setPrecision(Number(e.target.value))}>
                {[2, 3, 4, 6, 8, 10].map((p) => <option key={p}>{p}</option>)}
              </select>
            </label>
          </Card>
          <div className="flex flex-wrap gap-2">
            <button className={btnPrimary} onClick={() => run()}>Calculate</button>
            {onExample && <button className={btnGhost} onClick={() => { onExample(); setResult(null); setError(null); }}>Example input</button>}
            {onClear && <button className={btnGhost} onClick={() => { onClear(); setResult(null); setError(null); }}>Clear</button>}
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          {error && <div role="alert" className="rounded-card border border-red-400/60 bg-red-500/10 p-4 text-sm">{error}</div>}
          {!result && !error && <Card><p className="text-muted">Enter your values and press <b>Calculate</b>. The result, the steps and a 3D view appear here.</p></Card>}
          {result && (
            <>
              <Card>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold">{result.meta.operation}</h2>
                  <div className="flex flex-wrap gap-2">
                    <button className={btnGhost} onClick={copy}>{copied ? 'Copied' : 'Copy result'}</button>
                    <button className={btnGhost} onClick={() => exportPdf({ title, meta: result.meta, answer: result.answer, steps: result.steps }).catch(() => setError('PDF export failed.'))}>Export PDF</button>
                    <button className={btnPrimary} onClick={() => ws.openInVisualizer(result.shapes, title)}>Visualize in 3D</button>
                  </div>
                </div>
                <dl className="space-y-2">
                  {result.answer.map((a, i) => (
                    <div key={i} className="grid gap-1 sm:grid-cols-[180px_1fr]">
                      <dt className="text-sm text-muted">{a.label}</dt>
                      <dd className="break-words font-mono text-sm">{a.value}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
              <Segmented label="Display" value={s.mode} onChange={s.setMode} options={[{ value: 'answer', label: 'Final answer' }, { value: 'steps', label: 'Step-by-step' }]} />
              {s.mode === 'steps' && <StepsView steps={result.steps} />}
              <Scene3D shapes={result.shapes} options={result.sceneOptions} extent={result.extent} />
            </>
          )}
        </div>
      </div>
    </>
  );
}
