import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-4xl py-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="grid overflow-hidden rounded-3xl border border-border bg-surface md:grid-cols-2"
      >
        <div className="relative hidden md:block after:absolute after:inset-0 after:bg-gradient-to-t after:from-photo-ink/70 after:to-transparent">
          <img
            src="/local-mostrador.jpeg"
            alt="Local de Amanda Home & Deco"
            className="absolute inset-0 size-full object-cover object-[20%_center]"
          />
          <p className="absolute bottom-8 left-8 right-8 z-10 font-display text-3xl text-on-photo">
            Te esperamos también en el local.
          </p>
        </div>
        <div className="p-8 sm:p-12">
          <div className="mb-6 flex flex-col gap-1">
            <h1 className="font-display text-3xl text-text">{title}</h1>
            {subtitle && <p className="text-lg text-text-muted">{subtitle}</p>}
          </div>
          {children}
        </div>
      </motion.div>
    </div>
  );
}
