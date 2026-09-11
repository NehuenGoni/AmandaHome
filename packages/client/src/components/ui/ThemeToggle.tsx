import { AnimatePresence, motion } from "framer-motion";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

const ICONS = { light: Sun, dark: Moon, system: Monitor } as const;

const LABELS = {
  light: "Cambiar a modo oscuro",
  dark: "Usar el tema del sistema",
  system: "Cambiar a modo claro",
} as const;

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, cycleTheme } = useTheme();
  const Icon = ICONS[theme];
  const label = LABELS[theme];

  return (
    <button
      type="button"
      onClick={cycleTheme}
      aria-label={label}
      title={label}
      className={cn(
        "flex size-10 items-center justify-center overflow-hidden rounded-full text-text transition-colors hover:bg-surface-alt",
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ opacity: 0, rotate: -60, scale: 0.7 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 60, scale: 0.7 }}
          transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center justify-center"
        >
          <Icon className="size-5" />
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
