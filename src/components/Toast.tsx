"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type ToastKind = "success" | "error";

type ToastItem = {
  id: string;
  kind: ToastKind;
  message: string;
};

type ToastApi = {
  success: (message: string, opts?: { id?: string }) => void;
  error: (message: string, opts?: { id?: string }) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const TTL_MS = 2800;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((kind: ToastKind, message: string, id?: string) => {
    const toastId = id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setItems((prev) => {
      const next = prev.filter((t) => t.id !== toastId);
      return [...next, { id: toastId, kind, message }].slice(-4);
    });
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (message, opts) => push("success", message, opts?.id),
      error: (message, opts) => push("error", message, opts?.id),
    }),
    [push],
  );

  function dismiss(id: string) {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-viewport" aria-live="polite" aria-relevant="additions">
        {items.map((t) => (
          <ToastCard key={t.id} item={t} onDone={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({
  item,
  onDone,
}: {
  item: ToastItem;
  onDone: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, TTL_MS);
    return () => clearTimeout(t);
  }, [item.id, onDone]);

  return (
    <div
      className={`toast toast-${item.kind}`}
      role={item.kind === "error" ? "alert" : "status"}
    >
      <span className="toast-dot" aria-hidden />
      <span className="toast-text">{item.message}</span>
      <button
        type="button"
        className="toast-close"
        aria-label="Закрыть"
        onClick={onDone}
      >
        ×
      </button>
    </div>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      success: () => {},
      error: () => {},
    };
  }
  return ctx;
}
