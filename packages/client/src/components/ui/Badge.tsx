import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "accent" | "support" | "warning" | "danger";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-surface-alt text-text",
  accent: "bg-accent/15 text-accent-deep",
  support: "bg-support/15 text-support",
  warning: "bg-accent2/15 text-accent2-deep",
  danger: "bg-accent2 text-white",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        toneClasses[tone],
      )}
    >
      {children}
    </span>
  );
}
