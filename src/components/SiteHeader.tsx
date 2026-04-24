import Link from "next/link";
import { withBasePath } from "@/lib/base-path";

interface SiteHeaderProps {
  /** Active page for highlighting current nav. */
  active?: "studio" | "gallery";
}

export default function SiteHeader({ active = "studio" }: SiteHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
      <div className="flex items-center gap-4">
        <Link
          href={withBasePath("/")}
          className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground hover:text-primary transition-colors"
        >
          <div className="size-2 rounded-full bg-primary animate-pulse" />
          LUT Studio
        </Link>
        <nav className="hidden sm:flex items-center gap-1">
          <Link
            href={withBasePath("/")}
            className={`px-3 py-1 text-xs font-medium transition-colors ${
              active === "studio"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Studio
          </Link>
          <Link
            href={withBasePath("/gallery")}
            className={`px-3 py-1 text-xs font-medium transition-colors ${
              active === "gallery"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Gallery
          </Link>
        </nav>
      </div>

      {/* Mobile nav */}
      <nav className="flex sm:hidden items-center gap-1">
        <Link
          href={withBasePath("/")}
          className={`px-2 py-1 text-[10px] font-medium transition-colors ${
            active === "studio"
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Studio
        </Link>
        <Link
          href={withBasePath("/gallery")}
          className={`px-2 py-1 text-[10px] font-medium transition-colors ${
            active === "gallery"
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Gallery
        </Link>
      </nav>
    </header>
  );
}
