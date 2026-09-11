import { formatMoney } from "@amanda/shared";
import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

/** Interpola el valor cuando cambia (cantidad, promo) en vez de saltar instantáneamente. */
export function PriceTag({ cents, className }: { cents: number; className?: string }) {
  const spring = useSpring(cents, { stiffness: 160, damping: 24 });

  useEffect(() => {
    spring.set(cents);
  }, [cents, spring]);

  const display = useTransform(spring, (value) => formatMoney(Math.round(value)));

  return (
    <motion.span className={cn("tabular-nums", className)} aria-label={formatMoney(cents)}>
      {display}
    </motion.span>
  );
}
