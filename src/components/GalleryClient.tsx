"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { withBasePath } from "@/lib/base-path";
import { getCategoryStyle, formatDate, type Category } from "@/lib/gallery-helpers";
import CategoryFilter from "@/components/CategoryFilter";

interface LutRow {
  id: string;
  name: string;
  description: string | null;
  category: string;
  createdAt: string;
}

export default function GalleryClient({ luts }: { luts: LutRow[] }) {
  const [filter, setFilter] = useState<Category | "all">("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let result = luts;
    if (filter !== "all") {
      result = result.filter((l) => l.category === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          (l.description && l.description.toLowerCase().includes(q))
      );
    }
    return result;
  }, [luts, filter, search]);

  return (
    <>
      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CategoryFilter selected={filter} onChange={setFilter} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search filters..."
          className="h-8 w-full rounded-none border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring sm:w-64"
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">No filters match your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((lut) => {
            const catStyle = getCategoryStyle(lut.category);
            return (
              <Link
                key={lut.id}
                href={withBasePath(`/gallery/${lut.id}`)}
                className="group flex flex-col gap-3 rounded-none border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-surface-hover"
              >
                {/* Color strip + category badge */}
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex rounded-none px-2 py-0.5 text-[10px] font-medium ${catStyle.bg} ${catStyle.text}`}
                  >
                    {catStyle.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDate(lut.createdAt)}
                  </span>
                </div>

                {/* Name */}
                <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                  {lut.name}
                </h3>

                {/* Description snippet */}
                {lut.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {lut.description}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
