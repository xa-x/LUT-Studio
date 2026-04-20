import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0c0c0f] px-6 text-center">
      <h1 className="mb-2 text-6xl font-bold text-white">404</h1>
      <p className="mb-8 text-sm text-zinc-400">
        This page could not be found.
      </p>
      <Link
        href="/"
        className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500"
      >
        Back to LUT Studio
      </Link>
    </div>
  );
}
