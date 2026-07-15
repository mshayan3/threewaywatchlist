"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(async () => false);

// Themed replacement for window.confirm(). Returns a promise that resolves
// true (confirmed) or false (cancelled / dismissed).
export function useConfirm(): ConfirmFn {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>(
    (options) =>
      new Promise<boolean>((resolve) => {
        resolver.current = resolve;
        setOpts(options);
      }),
    []
  );

  const close = useCallback((value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOpts(null);
  }, []);

  // Escape cancels while the dialog is open.
  useEffect(() => {
    if (!opts) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [opts, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {opts && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={opts.title}
          className="view-anim fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => close(false)}
          />
          <div
            className="relative z-[1] w-full max-w-[380px] rounded-[var(--radius)] border border-border bg-surface p-5"
            style={{ boxShadow: "var(--card-shadow-hover)" }}
          >
            <h2 className="m-0 mb-2 font-display text-[18px] font-extrabold tracking-[-0.01em]">
              {opts.title}
            </h2>
            {opts.message && (
              <p className="m-0 mb-5 text-[14px] leading-[1.5] text-dim">{opts.message}</p>
            )}
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => close(false)}
                className="rounded-[12px] border border-border bg-chip px-4 py-2.5 text-[13px] font-bold text-text transition-colors hover:border-accent"
              >
                {opts.cancelLabel || "Cancel"}
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => close(true)}
                className={
                  "rounded-[12px] px-4 py-2.5 text-[13px] font-bold transition-transform active:scale-95 " +
                  (opts.danger
                    ? "bg-accent2 text-white"
                    : "bg-accent text-[var(--accent-text)]")
                }
              >
                {opts.confirmLabel || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
