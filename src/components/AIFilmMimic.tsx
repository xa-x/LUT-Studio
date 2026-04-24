"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { analyzeFilmLook, type AIFilmAnalysisResult } from "@/app/actions/ai-actions";
import { freshParams, type FilterParams } from "@/lib/lut-engine";
import { Sparkles, Upload, X, ImageIcon, Camera } from "lucide-react";

interface AIFilmMimicProps {
  onApplyParams: (params: FilterParams) => void;
  /** Ref to the preview canvas (WebGPU) so we can grab the current graded image */
  gpuCanvasRef?: React.RefObject<HTMLCanvasElement | null>;
  /** Ref to the original image element */
  imageRef?: React.RefObject<HTMLImageElement | null>;
  /** Whether we're in CPU mode (use previewUrl img instead of canvas) */
  useCPU?: boolean;
  /** Current preview URL blob (for CPU mode capture) */
  previewUrl?: string | null;
}

/** Downscale and convert canvas/image to JPEG base64 for API upload. */
function canvasToBase64(
  source: HTMLCanvasElement | HTMLImageElement,
  maxDim: number = 1024,
): string {
  const canvas = document.createElement("canvas");
  let w = "naturalWidth" in source ? source.naturalWidth : source.width;
  let h = "naturalHeight" in source ? source.naturalHeight : source.height;

  if (Math.max(w, h) > maxDim) {
    const scale = maxDim / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(source, 0, 0, w, h);

  // toDataURL returns data:image/jpeg;base64,...
  return canvas.toDataURL("image/jpeg", 0.85);
}

export default function AIFilmMimic({
  onApplyParams,
  gpuCanvasRef,
  imageRef,
  useCPU = false,
  previewUrl,
}: AIFilmMimicProps) {
  const [refPreviewUrl, setRefPreviewUrl] = useState<string | null>(null);
  const [base64Data, setBase64Data] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AIFilmAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;

      setError(null);
      setResult(null);

      // Read as data URL for preview + base64 extraction
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setRefPreviewUrl(dataUrl);
        setBase64Data(dataUrl);
      };
      reader.onerror = () => {
        setError("Failed to read image file.");
      };
      reader.readAsDataURL(file);
    },
    [],
  );

  /** Capture the current graded image as base64. */
  const captureCurrentImage = useCallback((): string | null => {
    try {
      // If we have a GPU canvas with content, capture from there
      if (!useCPU && gpuCanvasRef?.current) {
        const canvas = gpuCanvasRef.current;
        if (canvas.width > 0 && canvas.height > 0) {
          return canvasToBase64(canvas, 1024);
        }
      }

      // CPU mode: capture from the preview img or the original image
      if (imageRef?.current) {
        return canvasToBase64(imageRef.current, 1024);
      }
    } catch (err) {
      console.warn("Failed to capture current image:", err);
    }
    return null;
  }, [gpuCanvasRef, imageRef, useCPU]);

  const handleAnalyze = useCallback(async () => {
    if (!base64Data) return;

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      // Capture current image to send alongside reference for comparison
      const currentImage = captureCurrentImage();
      const analysisResult = await analyzeFilmLook(base64Data, currentImage ?? undefined);
      setResult(analysisResult);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to analyze image";
      setError(message);
    } finally {
      setIsAnalyzing(false);
    }
  }, [base64Data, captureCurrentImage]);

  const handleApply = useCallback(() => {
    if (!result) return;

    const base = freshParams();

    const merged: FilterParams = {
      ...base,
      ...result.params,
    };

    onApplyParams(merged);
  }, [result, onApplyParams]);

  const handleClear = useCallback(() => {
    setRefPreviewUrl(null);
    setBase64Data(null);
    setResult(null);
    setError(null);
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* Upload / Preview Area */}
      <div className="border-b border-border p-3 md:p-4">
        <div className="mb-2 flex items-center justify-between md:mb-3">
          <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            <Sparkles className="mr-1.5 inline size-3.5" />
            AI Film Mimic
          </h3>
          {refPreviewUrl ? (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={handleClear}
              className="text-muted-foreground"
              aria-label="Clear reference photo"
            >
              Clear
            </Button>
          ) : null}
        </div>

        <p className="mb-3 text-[10px] text-muted-foreground md:text-[11px]">
          Upload a reference photo. AI will analyze its film look and apply matching
          color grading to your current image.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.heic,.heif"
          onChange={handleFileSelect}
          className="pointer-events-none fixed top-[9999px] left-[9999px] h-px w-px opacity-0"
          aria-hidden
          tabIndex={-1}
        />

        {refPreviewUrl ? (
          <div className="relative overflow-hidden rounded-lg border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL preview */}
            <img
              src={refPreviewUrl}
              alt="Reference photo"
              className="max-h-40 w-full object-contain"
            />
            <button
              type="button"
              onClick={handleClear}
              className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white transition-colors hover:bg-black/80"
              aria-label="Remove photo"
            >
              <X className="size-3.5" />
            </button>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
              <span className="text-[9px] font-medium text-white/80">Reference</span>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group flex w-full cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border bg-surface p-4 text-left transition-colors hover:border-primary/50"
            aria-label="Upload reference photo"
          >
            <div className="flex size-10 items-center justify-center rounded-xl bg-surface text-xl">
              <ImageIcon className="size-5 text-muted-foreground group-hover:text-foreground" />
            </div>
            <span className="text-[11px] text-muted-foreground group-hover:text-foreground">
              Upload reference photo
            </span>
          </button>
        )}
      </div>

      {/* Analyze Button */}
      <div className="border-b border-border p-3 md:p-4">
        <Button
          type="button"
          className="w-full gap-2 bg-violet-600 text-white hover:bg-violet-500"
          disabled={!base64Data || isAnalyzing}
          onClick={() => void handleAnalyze()}
          aria-busy={isAnalyzing}
        >
          {isAnalyzing ? (
            <>
              <Spinner className="size-4" />
              Analyzing with {typeof window !== "undefined" && window.location.hostname === "localhost" ? "Gemma 4" : "AI"}...
            </>
          ) : (
            <>
              <Camera className="size-4" />
              Analyze Film Look
            </>
          )}
        </Button>
        <p className="mt-2 text-center text-[9px] text-muted-foreground">
          Your current image will be captured and compared with the reference
        </p>
      </div>

      {/* Error */}
      {error ? (
        <div className="border-b border-border px-3 py-2 md:px-4">
          <p className="text-[11px] text-red-400">
            {error}
          </p>
        </div>
      ) : null}

      {/* Result */}
      {result ? (
        <div className="flex-1 overflow-y-auto p-3 md:p-4">
          <div className="mb-3 rounded-lg border border-border bg-surface p-3">
            <div className="mb-1 flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-violet-400" />
              <span className="text-sm font-semibold text-foreground">
                {result.filmName}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {result.description}
            </p>
          </div>

          {/* Parameter preview */}
          <div className="mb-3">
            <h4 className="mb-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              Detected Parameters
            </h4>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              {Object.entries(result.params).map(([key, value]) => {
                // Skip curves in the preview (too complex for grid)
                if (key.endsWith("Curve")) return null;
                return (
                  <div key={key} className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground">{key}</span>
                    <span className="font-mono text-muted-foreground">
                      {typeof value === "number" ? value.toFixed(3) : String(value)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            className="w-full gap-2 bg-emerald-600 text-white hover:bg-emerald-500"
            onClick={handleApply}
          >
            <Upload className="size-4" />
            Apply to Current Image
          </Button>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="text-center">
            <Sparkles className="mx-auto mb-2 size-6 text-muted-foreground/40" />
            <p className="text-[11px] text-muted-foreground">
              Upload a reference photo, then click
              <br />
              <strong>Analyze Film Look</strong> to detect the color grading.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
