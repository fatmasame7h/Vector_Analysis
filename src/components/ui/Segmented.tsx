export default function Segmented<T extends string>({ value, onChange, options, label }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label?: string;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-lg border border-line bg-surface p-0.5 text-sm">
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)} aria-pressed={value === o.value}
          className={`rounded-md px-3 py-1.5 font-medium transition-colors ${value === o.value ? 'bg-accent text-accent-ink' : 'text-muted hover:text-ink'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
