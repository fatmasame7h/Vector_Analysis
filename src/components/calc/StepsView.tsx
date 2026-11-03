import type { Step } from './steps';

export default function StepsView({ steps }: { steps: Step[] }) {
  return (
    <div className="space-y-2">
      {steps.map((s, i) => (
        <details key={i} open className="rounded-xl border border-line bg-surface px-4 py-3">
          <summary className="cursor-pointer font-semibold">{s.title}</summary>
          {s.why && <p className="mt-1 text-sm text-muted">{s.why}</p>}
          <div className="mt-2 space-y-1 font-mono text-sm">
            {s.lines.map((l, j) => <p key={j} className="whitespace-pre-wrap break-words">{l}</p>)}
          </div>
        </details>
      ))}
    </div>
  );
}
