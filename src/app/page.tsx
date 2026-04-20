"use client";

import LUTStudio from "@/components/LUTStudio";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function Home() {
  return (
    <ErrorBoundary>
      <LUTStudio />
    </ErrorBoundary>
  );
}
