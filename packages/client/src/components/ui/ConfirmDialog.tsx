import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  tone?: "primary" | "danger";
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Tray de confirmación para acciones destructivas: nunca borramos sin un paso intermedio. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  tone = "primary",
  isLoading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <motion.button
            type="button"
            aria-label="Cerrar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
            onClick={onCancel}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-sm rounded-t-3xl border border-border bg-surface p-6 shadow-lg sm:rounded-3xl"
          >
            <button
              type="button"
              onClick={onCancel}
              aria-label="Cerrar"
              className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full text-text-muted hover:bg-surface-alt"
            >
              <X className="size-4" />
            </button>
            <h2 id="confirm-dialog-title" className="font-display text-lg text-text">
              {title}
            </h2>
            {description && <p className="mt-2 text-sm text-text-muted">{description}</p>}
            <div className="mt-6 flex gap-3">
              <Button
                type="button"
                variant={tone === "danger" ? "danger" : "primary"}
                isLoading={isLoading}
                onClick={onConfirm}
              >
                {confirmLabel}
              </Button>
              <Button type="button" variant="ghost" onClick={onCancel}>
                Cancelar
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
