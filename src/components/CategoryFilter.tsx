"use client";

import { CATEGORIES, CATEGORY_STYLES, type Category } from "@/lib/gallery-helpers";

interface CategoryFilterProps {
  selected: Category | "all";
  onChange: (cat: Category | "all") => void;
}

export default function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange("all")}
        className={`rounded-none px-3 py-1 text-xs font-medium transition-colors ${
          selected === "all"
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:text-foreground"
        }`}
      >
        All
      </button>
      {CATEGORIES.map((cat) => {
        const style = CATEGORY_STYLES[cat];
        return (
          <button
            key={cat}
            type="button"
            onClick={() => onChange(cat)}
            className={`rounded-none px-3 py-1 text-xs font-medium transition-colors ${
              selected === cat
                ? `${style.bg} ${style.text}`
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {style.label}
          </button>
        );
      })}
    </div>
  );
}
