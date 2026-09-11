import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "success" | "error";

const toneClasses: Record<Tone, string> = {
  success: "bg-support/10 text-support border-support/30",
  error: "bg-accent2/10 text-accent2-deep border-accent2/30",
};

const ToneIcon: Record<Tone, typeof AlertCircle> = {
  success: CheckCircle2,
  error: AlertCircle,
};

/** Feedback inline y animado, no un toast: los resultados importantes se muestran en contexto. */
export function InlineMessage({ tone, children }: { tone: Tone; children: ReactNode }) {
  const Icon = ToneIcon[tone];
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -6, height: 0 }}
        animate={{ opacity: 1, y: 0, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className={cn("flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-sm", toneClasses[tone])}
      >
        <Icon className="mt-0.5 size-4 shrink-0" />
        <span>{children}</span>
      </motion.div>
    </AnimatePresence>
  );
}
