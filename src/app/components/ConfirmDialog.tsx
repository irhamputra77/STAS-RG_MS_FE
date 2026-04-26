import React from "react";
import { AlertTriangle, Check, X } from "lucide-react";

type ConfirmVariant = "danger" | "primary" | "warning";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  hideCancel?: boolean;
};

const VARIANT_STYLES: Record<ConfirmVariant, { icon: string; button: string }> = {
  danger: {
    icon: "bg-red-100 text-red-600",
    button: "bg-red-600 text-white hover:bg-red-700"
  },
  primary: {
    icon: "bg-emerald-100 text-emerald-700",
    button: "bg-[#0AB600] text-white hover:bg-[#089c00]"
  },
  warning: {
    icon: "bg-amber-100 text-amber-700",
    button: "bg-amber-500 text-white hover:bg-amber-600"
  }
};

export function useConfirmDialog() {
  const [options, setOptions] = React.useState<ConfirmOptions | null>(null);
  const resolverRef = React.useRef<((value: boolean) => void) | null>(null);

  const confirm = React.useCallback((nextOptions: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setOptions({
        cancelLabel: "Batal",
        confirmLabel: "OK",
        variant: "primary",
        ...nextOptions
      });
    });
  }, []);

  const close = React.useCallback((result: boolean) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setOptions(null);
  }, []);

  const dialog = options ? (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-950/45 p-4">
      <div className="w-full max-w-md rounded-[18px] border border-border bg-white p-5 shadow-2xl">
        <div className="flex gap-4">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
              VARIANT_STYLES[options.variant || "primary"].icon
            }`}
          >
            {options.variant === "danger" ? <AlertTriangle size={20} /> : <Check size={20} />}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-black text-foreground">{options.title}</h3>
            {options.description && (
              <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">{options.description}</p>
            )}
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {!options.hideCancel && (
            <button
              type="button"
              onClick={() => close(false)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition-colors hover:bg-slate-50"
            >
              <X size={15} />
              {options.cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={() => close(true)}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition-colors ${
              VARIANT_STYLES[options.variant || "primary"].button
            }`}
          >
            {options.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, confirmDialog: dialog };
}
