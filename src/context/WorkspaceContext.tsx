import { createContext, useContext, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ObjType } from '../visualization/builders';
import type { SceneShape, Shape } from '../visualization/types';

export interface WorkItem {
  id: string; name: string; color: string; visible: boolean;
  type: ObjType | 'imported'; params?: Record<string, string>; shapes: Shape[];
}
interface W {
  items: WorkItem[]; setItems: React.Dispatch<React.SetStateAction<WorkItem[]>>;
  openInVisualizer: (shapes: SceneShape[], name: string) => void;
}
const Ctx = createContext<W>(null as unknown as W);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WorkItem[]>([]);
  const navigate = useNavigate();
  const openInVisualizer = (shapes: SceneShape[], name: string) => {
    setItems([{ id: `imp-${Date.now()}`, name, color: shapes[0]?.color ?? '#2563eb', visible: true, type: 'imported', shapes }]);
    navigate('/visualizer');
  };
  return <Ctx.Provider value={{ items, setItems, openInVisualizer }}>{children}</Ctx.Provider>;
}
export const useWorkspace = () => useContext(Ctx);
