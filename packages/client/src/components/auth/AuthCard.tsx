import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-3xl border border-border bg-surface p-8"
      >
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="font-display text-2xl text-text">{title}</h1>
          {subtitle && <p className="text-sm text-text-muted">{subtitle}</p>}
        </div>
        {children}
      </motion.div>
    </div>
  );
}
