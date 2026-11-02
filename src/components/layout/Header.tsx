import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import Icon from '../ui/Icon';
import { useTheme } from '../../context/ThemeContext';

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/formulas', label: 'Formula Library', end: false },
  { to: '/about', label: 'About', end: false },
];

export default function Header() {
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const cls = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive ? 'bg-accent/10 text-accent' : 'text-muted hover:text-ink'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-accent-ink">
            <Icon name="cube" className="h-5 w-5" />
          </span>
          VectorLab
        </Link>

        <nav className="hidden items-center gap-1 sm:flex" aria-label="Main">
          {links.map((l) => <NavLink key={l.to} to={l.to} end={l.end} className={cls}>{l.label}</NavLink>)}
          <button onClick={toggle} className="ml-2 rounded-lg p-2 text-muted hover:text-ink"
                  aria-label="Toggle light/dark mode">
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} className="h-5 w-5" />
          </button>
        </nav>

        <div className="flex items-center gap-1 sm:hidden">
          <button onClick={toggle} className="rounded-lg p-2 text-muted" aria-label="Toggle light/dark mode">
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} className="h-5 w-5" />
          </button>
          <button onClick={() => setOpen((o) => !o)} className="rounded-lg p-2 text-muted"
                  aria-label="Open menu" aria-expanded={open}>
            <Icon name="menu" className="h-5 w-5" />
          </button>
        </div>
      </div>
      {open && (
        <nav className="flex flex-col gap-1 border-t border-line px-4 py-2 sm:hidden" aria-label="Mobile">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={cls} onClick={() => setOpen(false)}>{l.label}</NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}
