"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { analyzeFilmLook, type AIFilmAnalysisResult } from "@/app/actions/ai-actions";
import { freshParams, type FilterParams } from "@/lib/lut-engine";
import { Sparkles, Upload, X, ImageIcon } from "lucide-react";

interface AIFilmMimicProps {
  onApplyParams: (params: FilterParams) => void;
}

export default function AIFilmMimic({ onApplyParams }: AIFilmMimicProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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
        setPreviewUrl(dataUrl);
        setBase64Data(dataUrl);
      };
      reader.onerror = () => {
        setError("Failed to read image file.");
      };
      reader.readAsDataURL(file);
    },
    [],
  );

  const handleAnalyze = useCallback(async () => {
    if (!base64Data) return;

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const analysisResult = await analyzeFilmLook(base64Data);
      setResult(analysisResult);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to analyze image";
      setError(message);
    } finally {
      setIsAnalyzing(false);
    }
  }, [base64Data]);

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
    setPreviewUrl(null);
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
          {previewUrl ? (
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
          Upload a reference photo and AI will detect the film stock or color
          grading, then generate matching filter settings.
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

        {previewUrl ? (
          <div className="relative overflow-hidden rounded-lg border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL preview */}
            <img
              src={previewUrl}
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
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="size-4" />
              Analyze Film Look
            </>
          )}
        </Button>
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
              {Object.entries(result.params).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">{key}</span>
                  <span className="font-mono text-muted-foreground">
                    {typeof value === "number" ? value.toFixed(3) : String(value)}
                  </span>
                </div>
              ))}
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
