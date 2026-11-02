const PATHS: Record<string, string> = {
  swap: 'M7 7h11m0 0-3-3m3 3-3 3M17 17H6m0 0 3-3m-3 3 3 3',
  dots: 'M6 6h.01M18 6h.01M12 18h.01M6 6l6 12 6-12',
  basis: 'M5 19V5m0 14h14M5 19l8-8',
  arrow: 'M5 19 19 5m0 0h-7m7 0v7',
  target: 'M12 3v3m0 12v3M3 12h3m12 0h3M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
  curve: 'M3 18C8 18 8 6 13 6s5 12 8 12',
  surface: 'M3 9c3-3 6 3 9 0s6-3 9 0v8c-3-3-6-3-9 0s-6 3-9 0V9Z',
  steps: 'M4 18h5v-4h5v-4h6',
  cube: 'M12 3 4 7.5v9L12 21l8-4.5v-9L12 3Zm0 9 8-4.5M12 12 4 7.5M12 12v9',
  book: 'M5 4h10a4 4 0 0 1 4 4v12H9a4 4 0 0 1-4-4V4Z',
  sun: 'M12 4V2m0 20v-2M4 12H2m20 0h-2M6 6 4.6 4.6m14.8 14.8L18 18M6 18l-1.4 1.4M19.4 4.6 18 6M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z',
  menu: 'M4 6h16M4 12h16M4 18h16',
};

export default function Icon({ name, className = 'h-6 w-6' }: { name: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
         strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={PATHS[name] ?? PATHS.cube} />
    </svg>
  );
}
