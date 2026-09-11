import type { Category } from "@amanda/shared";
import { cn } from "@/lib/utils";

interface CategoryFilterProps {
  categories: Category[];
  activeSlug?: string;
  onSelect: (category: Category | null) => void;
}

export function CategoryFilter({ categories, activeSlug, onSelect }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={cn(
          "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
          !activeSlug
            ? "border-primary bg-primary text-on-primary"
            : "border-border bg-surface text-text hover:bg-surface-alt",
        )}
      >
        Todas
      </button>
      {categories.map((category) => (
        <button
          key={category._id}
          type="button"
          onClick={() => onSelect(category)}
          className={cn(
            "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
            activeSlug === category.slug
              ? "border-primary bg-primary text-on-primary"
              : "border-border bg-surface text-text hover:bg-surface-alt",
          )}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
}
