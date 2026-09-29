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
        <div className="relative hidden md:block">
          <img
            src="/local-mostrador.jpeg"
            alt="Local de Amanda Home & Deco"
            className="absolute inset-0 size-full object-cover object-[20%_center]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#211e1a]/60 to-transparent" />
          <p className="absolute bottom-6 left-6 right-6 font-display text-xl italic text-[#f5f0e4]">
            Te esperamos también en el local.
          </p>
        </div>
        <div className="p-8 sm:p-10">
          <div className="mb-6 flex flex-col gap-1">
            <h1 className="font-display text-2xl text-text">{title}</h1>
            {subtitle && <p className="text-sm text-text-muted">{subtitle}</p>}
          </div>
          {children}
        </div>
      </motion.div>
    </div>
  );
}
