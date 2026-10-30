import type { ShippingTrackingEvent } from "@amanda/shared";
import { Loader2, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { ApiError } from "@/lib/apiClient";
import { cn } from "@/lib/utils";

/** MiCorreo manda los eventos en mayúsculas ("EN TRANSITO"): se muestran como oración. */
function humanize(value: string): string {
  const lower = value.toLowerCase().replace(/_/g, " ");
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

interface TrackingTimelineProps {
  trackingNumber: string;
  fetchEvents: () => Promise<{ events: ShippingTrackingEvent[] }>;
}

export function TrackingTimeline({ trackingNumber, fetchEvents }: TrackingTimelineProps) {
  const [events, setEvents] = useState<ShippingTrackingEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchEvents()
      .then(({ events: fetched }) => {
        if (!cancelled) setEvents(fetched);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "No pudimos consultar el seguimiento");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // `fetchEvents` suele ser una arrow nueva en cada render: el número de seguimiento es lo que importa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackingNumber]);

  return (
    <Card>
      <div className="flex items-center gap-2">
        <Truck className="size-4 text-text-muted" />
        <h2 className="font-display text-lg text-text">Seguimiento</h2>
      </div>
      <p className="mt-1 text-xs text-text-muted">Número de seguimiento: {trackingNumber}</p>

      {isLoading ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-text-muted">
          <Loader2 className="size-4 animate-spin" /> Consultando a Correo Argentino…
        </p>
      ) : error ? (
        <p className="mt-3 text-sm text-text-muted">{error}</p>
      ) : events.length === 0 ? (
        <p className="mt-3 text-sm text-text-muted">
          Todavía no hay movimientos. Pueden tardar un día hábil en aparecer después del despacho.
        </p>
      ) : (
        <ol className="mt-4 flex flex-col">
          {events.map((event, index) => (
            <li key={`${event.date}-${event.event}`} className="relative flex gap-3 pb-4 last:pb-0">
              {index < events.length - 1 && (
                <span className="absolute left-[5px] top-3 h-full w-px bg-border" aria-hidden />
              )}
              <span
                className={cn(
                  "relative mt-1.5 size-[11px] shrink-0 rounded-full border-2",
                  index === 0 ? "border-accent bg-accent" : "border-border bg-surface",
                )}
                aria-hidden
              />
              <div className="text-sm">
                <p className={cn("font-medium", index === 0 ? "text-text" : "text-text-muted")}>
                  {humanize(event.event)}
                </p>
                <p className="text-xs text-text-muted">
                  {event.date}
                  {event.branch && ` · ${humanize(event.branch)}`}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
