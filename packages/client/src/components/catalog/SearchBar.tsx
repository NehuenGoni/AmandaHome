import { Search } from "lucide-react";
import { useEffect, useState } from "react";

export function SearchBar({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (draft !== value) onChange(draft);
    }, 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
      <input
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Buscar productos…"
        className="h-11 w-full rounded-full border border-border bg-surface pl-10 pr-4 text-sm text-text placeholder:text-text-muted outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30"
      />
    </div>
  );
}
