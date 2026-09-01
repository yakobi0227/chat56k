import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type Item = { id: string; title: string; restore: () => void };

type DockApi = {
  items: Item[];
  register: (id: string, title: string, restore: () => void) => void;
  unregister: (id: string) => void;
};

const Ctx = createContext<DockApi | null>(null);

export function DockProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const register = useCallback((id: string, title: string, restore: () => void) => {
    setItems((prev) => {
      const next = prev.filter((p) => p.id !== id);
      next.push({ id, title, restore });
      return next;
    });
  }, []);
  const unregister = useCallback((id: string) => {
    setItems((prev) => prev.filter((p) => p.id !== id));
  }, []);
  const value = useMemo(() => ({ items, register, unregister }), [items, register, unregister]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDock() {
  return useContext(Ctx);
}

export function DockButtons() {
  const dock = useDock();
  if (!dock?.items.length) return null;
  return (
    <div className="task-tray">
      {dock.items.map((i) => (
        <button key={i.id} type="button" className="task-win" title={i.title} onClick={i.restore}>
          {i.title}
        </button>
      ))}
    </div>
  );
}
