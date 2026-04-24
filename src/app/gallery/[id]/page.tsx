import { db } from "@/lib/db";
import { luts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getCategoryStyle, formatDate, PARAM_LABELS, NUMERIC_PARAM_KEYS, isNonDefault } from "@/lib/gallery-helpers";
import SiteHeader from "@/components/SiteHeader";
import GalleryDetailClient from "@/components/GalleryDetailClient";
import type { Metadata } from "next";

export const revalidate = 60;

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const rows = await db.select().from(luts).where(eq(luts.id, id));
  const lut = rows[0];
  if (!lut) return { title: "LUT Not Found" };
  return {
    title: `${lut.name} — LUT Gallery`,
    description: lut.description ?? undefined,
  };
}

export default async function GalleryDetailPage({ params }: PageProps) {
  const { id } = await params;
  const rows = await db.select().from(luts).where(eq(luts.id, id));
  const lut = rows[0];

  if (!lut || !lut.isPublished) {
    notFound();
  }

  const catStyle = getCategoryStyle(lut.category);
  const lutParams = lut.params as Record<string, unknown>;

  // Build list of non-default params for display
  const nonDefaultParams: { label: string; value: number | string }[] = [];
  for (const key of NUMERIC_PARAM_KEYS) {
    const value = lutParams[key];
    if (typeof value === "number" && isNonDefault(key, value)) {
      nonDefaultParams.push({
        label: PARAM_LABELS[key] ?? key,
        value: typeof value === "number"
          ? Number.isInteger(value) ? value : value.toFixed(3)
          : String(value),
      });
    }
  }

  // Serialize params for client component (URL encoding)
  const paramsJson = JSON.stringify(lutParams);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader active="gallery" />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
          {/* Back link */}
          <a
            href={withBasePath("/gallery")}
            className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Gallery
          </a>

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-lg font-semibold tracking-tight text-foreground">
                {lut.name}
              </h1>
              <span
                className={`inline-flex rounded-none px-2 py-0.5 text-[10px] font-medium ${catStyle.bg} ${catStyle.text}`}
              >
                {catStyle.label}
              </span>
            </div>
            {lut.description && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {lut.description}
              </p>
            )}
            <p className="mt-2 text-[10px] text-muted-foreground">
              Published {formatDate(lut.createdAt)}
            </p>
          </div>

          {/* Params breakdown */}
          <div className="mb-6 rounded-none border border-border bg-card p-4">
            <h2 className="mb-3 text-xs font-semibold text-foreground">Filter Settings</h2>
            {nonDefaultParams.length === 0 ? (
              <p className="text-xs text-muted-foreground">All settings are at their default values.</p>
            ) : (
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
                {nonDefaultParams.map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground">{label}</span>
                    <span className="text-[11px] font-medium text-foreground font-mono">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions (client component for interactivity) */}
          <GalleryDetailClient
            lutId={lut.id}
            lutName={lut.name}
            paramsJson={paramsJson}
          />
        </div>
      </main>
    </div>
  );
}

function withBasePath(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${normalized}` : normalized;
}
