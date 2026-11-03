import { useCallback, useState } from 'react';
import { useLocation } from 'react-router-dom';

/** Form state that can be restored from the history page (via router state). */
export function usePageForm<T extends object>(initial: () => T, accept?: (r: T) => boolean) {
  const loc = useLocation();
  const r = (loc.state as { restore?: T } | null)?.restore;
  const restore = r && (!accept || accept(r)) ? r : undefined;
  const [form, setForm] = useState<T>(() => restore ?? initial());
  const set = useCallback((p: Partial<T>) => setForm((f) => ({ ...f, ...p })), []);
  return { form, setForm, set, restored: !!restore };
}
