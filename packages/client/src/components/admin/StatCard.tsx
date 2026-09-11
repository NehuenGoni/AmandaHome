import { motion, useSpring, useTransform } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  to?: string;
  tone?: "neutral" | "warning";
}

export function StatCard({ icon: Icon, label, value, to, tone = "neutral" }: StatCardProps) {
  const spring = useSpring(0, { stiffness: 120, damping: 20 });

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  const display = useTransform(spring, (v) => Math.round(v).toLocaleString("es-AR"));

  const content = (
    <Card className={cn("flex items-center gap-4 transition-colors", to && "hover:bg-surface-alt")}>
      <div
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-full",
          tone === "warning" ? "bg-accent2/15 text-accent2-deep" : "bg-accent/15 text-accent-deep",
        )}
      >
        <Icon className="size-5" />
      </div>
      <div className="flex flex-col">
        <motion.span className="font-display text-2xl tabular-nums text-text">{display}</motion.span>
        <span className="text-sm text-text-muted">{label}</span>
      </div>
    </Card>
  );

  return to ? <Link to={to}>{content}</Link> : content;
}
