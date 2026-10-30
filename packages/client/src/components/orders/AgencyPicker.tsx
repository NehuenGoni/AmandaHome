import type { ShippingAgency } from "@amanda/shared";
import { PROVINCES } from "@amanda/shared";
import { Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import { InlineMessage } from "@/components/ui/InlineMessage";
import { Select } from "@/components/ui/Select";
import { ApiError } from "@/lib/apiClient";
import { getAgencies } from "@/lib/shippingApi";
import { cn } from "@/lib/utils";

/** Provincias como Buenos Aires tienen cientos de sucursales: se muestran unas pocas y se invita a buscar. */
const MAX_VISIBLE = 25;

const DAY_LABELS: [string, string][] = [
  ["monday", "Lun"],
  ["tuesday", "Mar"],
  ["wednesday", "Mié"],
  ["thursday", "Jue"],
  ["friday", "Vie"],
  ["saturday", "Sáb"],
  ["sunday", "Dom"],
];

const formatTime = (hhmm: string) => `${hhmm.slice(0, 2)}:${hhmm.slice(2, 4)}`;

/** Resume el horario agrupando días seguidos con el mismo rango: "Lun–Vie 09:30–18:00 · Sáb 09:00–13:00". */
function summarizeHours(hours: ShippingAgency["hours"]): string | undefined {
  if (!hours) return undefined;
  const groups: { from: string; to: string; range: string }[] = [];
  for (const [day, label] of DAY_LABELS) {
    const slot = hours[day];
    if (!slot) continue;
    const range = `${formatTime(slot.start)}–${formatTime(slot.end)}`;
    const last = groups[groups.length - 1];
    const previousDay = DAY_LABELS[DAY_LABELS.findIndex(([d]) => d === day) - 1]?.[1];
    if (last && last.range === range && last.to === previousDay) {
      last.to = label;
    } else {
      groups.push({ from: label, to: label, range });
    }
  }
  if (groups.length === 0) return undefined;
  return groups.map((g) => `${g.from === g.to ? g.from : `${g.from}–${g.to}`} ${g.range}`).join(" · ");
}

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

interface AgencyPickerProps {
  provinceCode: string;
  onProvinceChange: (code: string) => void;
  selectedCode?: string;
  onSelect: (agency: ShippingAgency) => void;
}

export function AgencyPicker({ provinceCode, onProvinceChange, selectedCode, onSelect }: AgencyPickerProps) {
  const [agencies, setAgencies] = useState<ShippingAgency[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!provinceCode) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setSearch("");
    getAgencies(provinceCode)
      .then(({ agencies: fetched }) => {
        if (!cancelled) setAgencies(fetched);
      })
      .catch((err) => {
        if (cancelled) return;
        setAgencies([]);
        setError(err instanceof ApiError ? err.message : "No pudimos cargar las sucursales");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [provinceCode]);

  const filtered = useMemo(() => {
    const query = normalize(search.trim());
    if (!query) return agencies;
    return agencies.filter((a) =>
      normalize([a.name, a.address, a.locality, a.city, a.postalCode].filter(Boolean).join(" ")).includes(query),
    );
  }, [agencies, search]);

  // La sucursal elegida siempre queda visible, aunque no entre en el corte o no coincida con la búsqueda.
  const visible = useMemo(() => {
    const head = filtered.slice(0, MAX_VISIBLE);
    const selected = agencies.find((a) => a.code === selectedCode);
    return selected && !head.includes(selected) ? [selected, ...head] : head;
  }, [agencies, filtered, selectedCode]);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Provincia" value={provinceCode} onChange={(e) => onProvinceChange(e.target.value)}>
          <option value="" disabled>
            Elegí una provincia
          </option>
          {PROVINCES.map((p) => (
            <option key={p.code} value={p.code}>
              {p.name}
            </option>
          ))}
        </Select>
        <div className="relative">
          <Input
            label="Buscar"
            placeholder="Localidad, calle o código postal"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={!provinceCode || agencies.length === 0}
            className="w-full pl-10"
          />
          <Search className="pointer-events-none absolute bottom-3.5 left-3.5 size-4 text-text-muted" />
        </div>
      </div>

      {isLoading ? (
        <p className="flex items-center gap-2 text-sm text-text-muted">
          <Loader2 className="size-4 animate-spin" /> Buscando sucursales…
        </p>
      ) : error ? (
        <InlineMessage tone="error">{error}</InlineMessage>
      ) : !provinceCode ? (
        <p className="text-sm text-text-muted">Elegí la provincia para ver las sucursales de Correo Argentino.</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-text-muted">
          {agencies.length === 0 ? "No hay sucursales con retiro en esta provincia." : "Ninguna sucursal coincide con la búsqueda."}
        </p>
      ) : (
        <div className="flex max-h-96 flex-col gap-2 overflow-y-auto pr-1">
          {visible.map((agency) => {
            const hours = summarizeHours(agency.hours);
            return (
              <label
                key={agency.code}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors",
                  selectedCode === agency.code ? "border-accent bg-accent/5" : "border-border bg-surface",
                )}
              >
                <input
                  type="radio"
                  name="agency"
                  className="mt-1"
                  checked={selectedCode === agency.code}
                  onChange={() => onSelect(agency)}
                />
                <div className="text-sm">
                  <p className="font-medium text-text">{agency.name}</p>
                  <p className="text-text-muted">
                    {[agency.address, agency.locality].filter(Boolean).join(", ")} ({agency.postalCode})
                  </p>
                  {hours && <p className="mt-0.5 text-xs text-text-muted">{hours}</p>}
                </div>
              </label>
            );
          })}
          {filtered.length > MAX_VISIBLE && (
            <p className="px-1 text-xs text-text-muted">
              Mostrando {MAX_VISIBLE} de {filtered.length} sucursales. Buscá por localidad para encontrar la tuya.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
