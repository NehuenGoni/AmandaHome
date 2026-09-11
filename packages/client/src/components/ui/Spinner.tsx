import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className, label = "Cargando…" }: { className?: string; label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-10 text-text-muted">
      <Loader2 className={cn("size-5 animate-spin", className)} />
      <span className="text-sm">{label}</span>
    </div>
  );
}
