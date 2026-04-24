"use client";

import { Button } from "@/components/ui/button";
import { Download, ExternalLink } from "lucide-react";
import { useCallback } from "react";
import { withBasePath } from "@/lib/base-path";

interface GalleryDetailClientProps {
  lutId: string;
  lutName: string;
  paramsJson: string;
}

export default function GalleryDetailClient({
  lutId,
  lutName,
  paramsJson,
}: GalleryDetailClientProps) {
  const handleDownloadCube = useCallback(async () => {
    try {
      // Use the API to get the LUT data, then generate the .cube on client
      const res = await fetch(`/api/luts/${lutId}`);
      if (!res.ok) throw new Error("Failed to fetch LUT");
      const lutData = await res.json();
      const params = typeof lutData.params === "string"
        ? JSON.parse(lutData.params)
        : lutData.params;

      // Use the API route to generate .cube via a simple server-side approach:
      // We'll send params to a generate endpoint or do it client-side.
      // Since LUTEngine is client-only (WebGPU), let's generate via the CPU path.
      const { LUTEngine } = await import("@/lib/lut-engine");
      const engine = new LUTEngine();
      const cubeContent = engine.exportCube(params, lutName);

      const blob = new Blob([cubeContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${lutName.replace(/[^a-zA-Z0-9-_]/g, "_")}.cube`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      console.error("Download error:", err);
      alert("Failed to generate .cube file");
    }
  }, [lutId, lutName]);

  const applyInStudioUrl = withBasePath(`/?lut=${encodeURIComponent(paramsJson)}`);

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button
        type="button"
        className="flex-1"
        onClick={() => void handleDownloadCube()}
      >
        <Download className="size-3.5" />
        Download .cube
      </Button>
      <Button
        type="button"
        variant="outline"
        className="flex-1"
        asChild
      >
        <a href={applyInStudioUrl}>
          <ExternalLink className="size-3.5" />
          Apply in Studio
        </a>
      </Button>
    </div>
  );
}
