import { Link } from 'react-router-dom';
import Icon from './Icon';
import type { ToolInfo } from '../../types/tools';

export default function ToolCard({ tool, compact = false }: { tool: ToolInfo; compact?: boolean }) {
  return (
    <Link to={tool.path}
      className="group flex flex-col gap-3 rounded-card border border-line bg-surface p-5 shadow-card transition-colors hover:border-accent">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent">
        <Icon name={tool.icon} />
      </span>
      <div>
        <h3 className="font-semibold">{tool.title}</h3>
        <p className="mt-1 text-sm text-muted">{tool.description}</p>
      </div>
      {!compact && <span className="mt-auto text-sm font-medium text-accent">Open tool</span>}
    </Link>
  );
}
