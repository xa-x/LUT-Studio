import { db } from "@/lib/db";
import { luts } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCategoryStyle, formatDate } from "@/lib/gallery-helpers";
import SiteHeader from "@/components/SiteHeader";
import GalleryClient from "@/components/GalleryClient";
import Link from "next/link";
import { withBasePath } from "@/lib/base-path";

export const metadata = {
  title: "LUT Gallery — Browse Color Grades",
  description: "Browse and download community-published 3D LUT color grades.",
};

export default async function GalleryPage() {
  // Fetch all published LUTs directly from DB (server component)
  const publishedLuts = await db
    .select()
    .from(luts)
    .where(eq(luts.isPublished, true))
    .orderBy(desc(luts.createdAt));

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader active="gallery" />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {/* Page title */}
          <div className="mb-6">
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              LUT Gallery
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Browse {publishedLuts.length} published {publishedLuts.length === 1 ? "filter" : "filters"}. Click any card to see details and download.
            </p>
          </div>

          {publishedLuts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="size-16 rounded-2xl border-2 border-dashed border-border flex items-center justify-center mb-4">
                <span className="text-2xl">🎨</span>
              </div>
              <p className="text-sm font-medium text-foreground">No published LUTs yet</p>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                Create a filter in the Studio and publish it to share with the community.
              </p>
              <Link
                href={withBasePath("/")}
                className="mt-4 text-xs font-medium text-primary hover:underline"
              >
                Open Studio →
              </Link>
            </div>
          ) : (
            <GalleryClient luts={publishedLuts} />
          )}
        </div>
      </main>
    </div>
  );
}
