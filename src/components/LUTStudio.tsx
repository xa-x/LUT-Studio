"use client";

import { FilterParams, LUTEngine, freshParams } from "@/lib/lut-engine";
import FilterPanel from "@/components/FilterPanel";
import CurvesPanel from "@/components/CurvesPanel";
import AIFilmMimic from "@/components/AIFilmMimic";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { withBasePath } from "@/lib/base-path";
import { cn } from "@/lib/utils";
import { renderCpuLutCanvas } from "@/lib/cpu-lut-canvas";
import { fileToImageObjectUrl, isHeicLike } from "@/lib/heic";
import { Sparkles, Upload, Save, GalleryHorizontal } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { saveParams, loadParams } from "@/lib/storage";
import SaveLutDialog from "@/components/SaveLutDialog";
import Link from "next/link";

type Tab = "adjust" | "curves" | "ai";

const EXPORT_MAX_DIM = 8192;

function getPreviewMaxDim(): number {
  if (typeof window === "undefined") return 1920;
  return window.innerWidth <= 767 ? 1024 : 1920;
}

function getPreviewDebounceMs(): number {
  if (typeof window === "undefined") return 150;
  return window.innerWidth <= 767 ? 220 : 150;
}

function canvasToBlobUrl(canvas: HTMLCanvasElement): Promise<string | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(null);
        return;
      }
      resolve(URL.createObjectURL(blob));
    }, "image/png");
  });
}

function bitmapToBlobUrl(bitmap: ImageBitmap): Promise<string | null> {
  const c = document.createElement("canvas");
  c.width = bitmap.width;
  c.height = bitmap.height;
  c.getContext("2d")!.drawImage(bitmap, 0, 0);
  return canvasToBlobUrl(c);
}

export default function LUTStudio() {
  const [params, setParams] = useState<FilterParams>(() => {
    if (typeof window !== "undefined") {
      const saved = loadParams();
      if (saved) return saved;
    }
    return freshParams();
  });
  const [activeTab, setActiveTab] = useState<Tab>("adjust");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  /** WebGPU path: graded result is drawn to this canvas (no CPU readback). */
  const [gpuPreviewReady, setGpuPreviewReady] = useState(false);
  const previewUrlRef = useRef<string | null>(null);
  useEffect(() => {
    previewUrlRef.current = previewUrl;
  }, [previewUrl]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const [useCPU, setUseCPU] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSnap, setDrawerSnap] = useState<"peek" | "half" | "full">("half");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  const engineRef = useRef<LUTEngine | null>(null);
  const gpuPreviewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const drawerStartY = useRef(0);
  const drawerCurrentTranslate = useRef(0);

  const paramsRef = useRef(params);
  paramsRef.current = params;

  const useCPURef = useRef(useCPU);
  useCPURef.current = useCPU;

  const isProcessingRef = useRef(false);
  useEffect(() => {
    isProcessingRef.current = isProcessing;
  }, [isProcessing]);

  const pendingPreviewRef = useRef(false);
  const imageObjectUrlRef = useRef<string | null>(null);

  const loadImage = useCallback((src: string, options?: { resetParams?: boolean }) => {
    if (imageObjectUrlRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(imageObjectUrlRef.current);
    }
    imageObjectUrlRef.current = src.startsWith("blob:") ? src : null;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;
      setImageUrl(src);
      if (options?.resetParams) {
        setParams(freshParams());
      }
      setGpuPreviewReady(false);
      setPreviewUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return null;
      });
    };
    img.onerror = () => {
      console.error("Failed to decode image");
    };
    img.src = src;
  }, []);

  useEffect(() => {
    return () => {
      const u = previewUrlRef.current;
      if (u?.startsWith("blob:")) URL.revokeObjectURL(u);
      const imgUrl = imageObjectUrlRef.current;
      if (imgUrl?.startsWith("blob:")) URL.revokeObjectURL(imgUrl);
    };
  }, []);

  useEffect(() => {
    const init = async () => {
      if (!navigator.gpu) {
        setUseCPU(true);
        setGpuPreviewReady(false);
        const engine = new LUTEngine();
        engineRef.current = engine;
        setEngineReady(true);
        return;
      }
      const engine = new LUTEngine();
      const ok = await engine.init();
      if (ok) {
        engineRef.current = engine;
        setEngineReady(true);
      } else {
        console.warn("WebGPU init failed, falling back to CPU processing");
        setUseCPU(true);
        setGpuPreviewReady(false);
        const cpuEngine = new LUTEngine();
        engineRef.current = cpuEngine;
        setEngineReady(true);
      }
    };
    void init();
    return () => {
      engineRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    loadImage(withBasePath("/sample.jpg"));
  }, [loadImage]);

  // Load params from URL search params (e.g. from Gallery "Apply in Studio")
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const lutParam = sp.get("lut");
    if (lutParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(lutParam));
        if (parsed && typeof parsed === "object") {
          setParams(parsed as FilterParams);
          // Clean the URL without reload
          const url = new URL(window.location.href);
          url.searchParams.delete("lut");
          window.history.replaceState({}, "", url.pathname);
        }
      } catch {
        // Invalid params — ignore
      }
    }
  }, []);

  // Persist params to localStorage (debounced)
  useEffect(() => {
    const timer = setTimeout(() => saveParams(params), 500);
    return () => clearTimeout(timer);
  }, [params]);

  const updatePreview = useCallback(async () => {
    if (!engineRef.current || !imageRef.current) return;
    if (isProcessingRef.current) {
      pendingPreviewRef.current = true;
      return;
    }

    isProcessingRef.current = true;
    setIsProcessing(true);
    const p = paramsRef.current;
    const img = imageRef.current;
    const maxDim = getPreviewMaxDim();

    try {
      if (useCPURef.current) {
        const canvas = renderCpuLutCanvas(img, p, maxDim, engineRef.current);
        if (!canvas) return;
        const url = await canvasToBlobUrl(canvas);
        if (url) {
          setPreviewUrl((prev) => {
            if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
            return url;
          });
        }
      } else {
        const canvas = document.createElement("canvas");
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (Math.max(w, h) > maxDim) {
          const scale = maxDim / Math.max(w, h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);

        const bitmap = await createImageBitmap(canvas);
        const engine = engineRef.current;
        const surface = gpuPreviewCanvasRef.current;

        if (surface && engine?.presentPreviewToCanvas(surface, bitmap, p)) {
          bitmap.close();
          setGpuPreviewReady(true);
          setPreviewUrl((prev) => {
            if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
            return null;
          });
        } else {
          const result = await engine!.applyToImage(bitmap, p);
          bitmap.close();
          setGpuPreviewReady(false);

          if (result) {
            const url = await bitmapToBlobUrl(result);
            result.close();
            if (url) {
              setPreviewUrl((prev) => {
                if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
                return url;
              });
            }
          } else {
            console.warn("WebGPU applyToImage returned null, falling back to CPU");
            setUseCPU(true);
            setGpuPreviewReady(false);
            const cpuCanvas = renderCpuLutCanvas(img, p, maxDim, engineRef.current!);
            if (cpuCanvas) {
              const url = await canvasToBlobUrl(cpuCanvas);
              if (url) {
                setPreviewUrl((prev) => {
                  if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
                  return url;
                });
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Preview error:", err);
      if (!useCPURef.current) {
        console.warn("WebGPU error, falling back to CPU");
        setUseCPU(true);
        setGpuPreviewReady(false);
        const cpuCanvas = renderCpuLutCanvas(img, p, maxDim, engineRef.current!);
        if (cpuCanvas) {
          const url = await canvasToBlobUrl(cpuCanvas);
          if (url) {
            setPreviewUrl((prev) => {
              if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
              return url;
            });
          }
        }
      }
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
      if (pendingPreviewRef.current) {
        pendingPreviewRef.current = false;
        void updatePreview();
      }
    }
  }, []);

  useEffect(() => {
    if (!engineReady || !imageRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      void updatePreview();
    }, getPreviewDebounceMs());

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [params, engineReady, imageUrl, updatePreview]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") && !isHeicLike(file)) return;
    try {
      const url = await fileToImageObjectUrl(file);
      loadImage(url, { resetParams: true });
    } catch (err) {
      console.error("Failed to load image:", err);
    }
  };

  const triggerFileInput = () => {
    const input = fileInputRef.current;
    if (!input) return;
    input.value = "";
    input.click();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/") && !isHeicLike(file)) return;
    try {
      const url = await fileToImageObjectUrl(file);
      loadImage(url, { resetParams: true });
    } catch (err) {
      console.error("Failed to load image:", err);
    }
  };

  const waitForIdle = useCallback(() => {
    return new Promise<void>((resolve) => {
      const start = Date.now();
      const check = () => {
        if (!isProcessingRef.current) {
          resolve();
          return;
        }
        if (Date.now() - start > 10000) {
          resolve();
          return;
        }
        setTimeout(check, 50);
      };
      check();
    });
  }, []);

  const renderFullExportBlob = useCallback(async (): Promise<Blob | null> => {
    const img = imageRef.current;
    const engine = engineRef.current;
    if (!img || !engine) return null;
    const p = paramsRef.current;

    if (!useCPURef.current) {
      const canvas = document.createElement("canvas");
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (Math.max(w, h) > EXPORT_MAX_DIM) {
        const scale = EXPORT_MAX_DIM / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      const bitmap = await createImageBitmap(canvas);
      const result = await engine.applyToImage(bitmap, p);
      bitmap.close();
      if (result) {
        const c = document.createElement("canvas");
        c.width = result.width;
        c.height = result.height;
        c.getContext("2d")!.drawImage(result, 0, 0);
        result.close();
        return await new Promise((resolve) => {
          c.toBlob((blob) => resolve(blob), "image/png");
        });
      }
    }

    const cpuCanvas = renderCpuLutCanvas(img, p, EXPORT_MAX_DIM, engine);
    if (!cpuCanvas) return null;
    return await new Promise((resolve) => {
      cpuCanvas.toBlob((blob) => resolve(blob), "image/png");
    });
  }, []);

  const handleExportCube = async () => {
    if (!engineRef.current) return;
    await waitForIdle();
    const cubeContent = engineRef.current.exportCube(paramsRef.current, "LUT Studio Filter");
    const blob = new Blob([cubeContent], { type: "text/plain" });
    downloadBlob(blob, "lut-studio-filter.cube");
  };

  const handleSaveImage = async () => {
    if (!imageRef.current || !engineRef.current) return;
    await waitForIdle();
    const blob = await renderFullExportBlob();
    if (blob) downloadBlob(blob, "lut-studio-edited.png");
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      const win = window.open(url, "_blank");
      if (!win) {
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } else {
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.toggle("drawer-open", drawerOpen);
    return () => document.body.classList.remove("drawer-open");
  }, [drawerOpen]);

  const handleDrawerTouchStart = (e: React.TouchEvent) => {
    drawerStartY.current = e.touches[0].clientY;
  };

  const handleDrawerTouchMove = (e: React.TouchEvent) => {
    if (!drawerRef.current) return;
    const deltaY = e.touches[0].clientY - drawerStartY.current;
    drawerCurrentTranslate.current = deltaY;

    const drawer = drawerRef.current;
    if (deltaY > 0) {
      drawer.style.transform = `translateY(${deltaY}px)`;
    }
  };

  const handleDrawerTouchEnd = () => {
    if (!drawerRef.current) return;
    const drawer = drawerRef.current;
    drawer.style.transform = "";

    const delta = drawerCurrentTranslate.current;

    if (delta > 80) {
      if (drawerSnap === "full") {
        setDrawerSnap("half");
      } else if (drawerSnap === "half") {
        setDrawerSnap("peek");
      } else {
        setDrawerOpen(false);
      }
    } else if (delta < -80) {
      if (drawerSnap === "peek") {
        setDrawerSnap("half");
      } else if (drawerSnap === "half") {
        setDrawerSnap("full");
      }
    }

    drawerCurrentTranslate.current = 0;
  };

  const openDrawerWithTab = (tab: Tab) => {
    setActiveTab(tab);
    setDrawerOpen(true);
    setDrawerSnap("half");
  };

  const handleApplyAIParams = useCallback(
    (aiParams: FilterParams) => {
      setParams(aiParams);
      setActiveTab("adjust");
    },
    [],
  );

  const tabBar = (
    <Tabs
      value={activeTab}
      onValueChange={(v) => setActiveTab(v as Tab)}
      className="flex h-full min-h-0 flex-1 flex-col gap-0"
    >
      <TabsList variant="line" className="h-10 w-full shrink-0 justify-stretch rounded-none border-b border-border bg-transparent p-0">
        <TabsTrigger value="adjust" className="flex-1 rounded-none">
          Adjust
        </TabsTrigger>
        <TabsTrigger value="curves" className="flex-1 rounded-none">
          Curves
        </TabsTrigger>
        <TabsTrigger value="ai" className="flex-1 gap-1 rounded-none">
          <Sparkles className="size-3.5" />
          AI
        </TabsTrigger>
      </TabsList>
      <TabsContent value="adjust" className="mt-0 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden">
        <FilterPanel params={params} onChange={setParams} />
      </TabsContent>
      <TabsContent value="curves" className="mt-0 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden">
        <CurvesPanel params={params} onChange={setParams} />
      </TabsContent>
      <TabsContent value="ai" className="mt-0 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden">
        <AIFilmMimic
          onApplyParams={handleApplyAIParams}
          gpuCanvasRef={gpuPreviewCanvasRef}
          imageRef={imageRef}
          useCPU={useCPU}
          previewUrl={previewUrl}
        />
      </TabsContent>
    </Tabs>
  );

  const exportActions = (
    <div className="flex flex-col gap-2 border-t border-border p-4">
      <Button
        type="button"
        variant="secondary"
        className="w-full bg-emerald-600 text-white hover:bg-emerald-500"
        disabled={(!previewUrl && !gpuPreviewReady) || isProcessing}
        aria-busy={isProcessing}
        onClick={() => void handleSaveImage()}
      >
        <span className="inline-flex items-center gap-2">
          {isProcessing ? <Spinner className="size-4" /> : null}
          Save image
        </span>
      </Button>
      <Button type="button" disabled={!engineReady || isProcessing} aria-busy={isProcessing} onClick={() => void handleExportCube()}>
        <span className="inline-flex items-center gap-2">
          {isProcessing ? <Spinner className="size-4" /> : null}
          Export .cube
        </span>
      </Button>
    </div>
  );

  if (!engineReady) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-background">
        <Spinner className="size-8" />
        <p className="text-sm text-muted-foreground">Initializing color engine...</p>
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-background md:h-screen">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.heic,.heif"
        onChange={handleFileUpload}
        className="pointer-events-none fixed top-[-9999px] left-[-9999px] h-px w-px opacity-0"
        aria-hidden
        tabIndex={-1}
      />

      <div className="bg-surface hidden h-dvh min-h-0 w-80 shrink-0 flex-col border-r border-border md:flex">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{tabBar}</div>
        {exportActions}
      </div>

      <div
        className="relative flex flex-1 flex-col"
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className="hidden items-center justify-between border-b border-border px-6 py-3 md:flex">
          <div className="flex items-center gap-3">
            <Link href={withBasePath("/")} className="flex items-center gap-2">
              <div className="bg-primary size-2 animate-pulse rounded-full" />
              <h1 className="text-sm font-semibold tracking-tight">LUT Studio</h1>
            </Link>
            <span className="font-mono text-[10px] text-muted-foreground">{useCPU ? "CPU" : "WebGPU"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href={withBasePath("/gallery")}>
              <Button type="button" variant="ghost" size="sm" aria-label="Open Gallery">
                <GalleryHorizontal className="size-3.5" />
                Gallery
              </Button>
            </Link>
            <Button type="button" variant="outline" size="sm" onClick={() => setSaveDialogOpen(true)} aria-label="Save LUT">
              <Save className="size-3.5" />
              Save
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={triggerFileInput} aria-label="Upload image">
              Upload image
            </Button>
            {isProcessing ? (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Spinner className="size-3" />
                Processing
              </span>
            ) : null}
          </div>
        </div>

        <div className="safe-area-top bg-background/80 absolute top-0 right-0 left-0 z-10 flex items-center justify-between px-4 py-2 backdrop-blur-sm md:hidden">
          <div className="flex items-center gap-2">
            <div className="bg-primary size-1.5 animate-pulse rounded-full" />
            <h1 className="text-xs font-semibold tracking-tight">LUT Studio</h1>
            <span className="font-mono text-[9px] text-muted-foreground">{useCPU ? "CPU" : "GPU"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Link href={withBasePath("/gallery")}>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Open Gallery"
              >
                <GalleryHorizontal className="size-3.5" />
              </Button>
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setSaveDialogOpen(true)}
              aria-label="Save LUT"
            >
              <Save className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={triggerFileInput}
              aria-label="Upload image"
            >
              <Upload />
            </Button>
            {isProcessing ? (
              <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <Spinner className="size-3" />
                Processing
              </span>
            ) : null}
          </div>
        </div>

        <div className="relative flex flex-1 items-center justify-center p-4 pt-14 md:p-8 md:pt-8">
          {isDragging ? (
            <div className="border-primary bg-background/80 absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed">
              <span className="text-primary text-sm font-medium">Drop image here</span>
            </div>
          ) : null}

          {!imageUrl && !previewUrl ? (
            <button
              type="button"
              onClick={triggerFileInput}
              className="group flex cursor-pointer flex-col items-center gap-4 border-0 bg-transparent p-4 text-left"
              aria-label="Upload an image"
            >
              <div className="border-border group-hover:border-primary flex size-20 items-center justify-center rounded-2xl border-2 border-dashed bg-surface text-3xl transition-colors">
                <Upload className="text-muted-foreground group-hover:text-foreground size-8" aria-hidden />
              </div>
              <div className="text-center">
                <p className="text-muted-foreground group-hover:text-foreground text-sm transition-colors">
                  Drop an image or tap to upload
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  JPG, PNG, WebP, HEIC supported
                </p>
              </div>
            </button>
          ) : (
            <div className="relative max-h-full max-w-full">
              {!useCPU && imageUrl ? (
                <canvas
                  ref={gpuPreviewCanvasRef}
                  className={cn(
                    "max-h-[calc(100dvh-120px)] max-w-full rounded-lg shadow-2xl md:max-h-[calc(100vh-120px)]",
                    gpuPreviewReady ? "block" : "hidden",
                  )}
                  aria-hidden={!gpuPreviewReady}
                />
              ) : null}
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- blob/data URLs and live preview
                <img
                  src={previewUrl}
                  alt="Color graded preview"
                  className={cn(
                    "max-h-[calc(100dvh-120px)] max-w-full rounded-lg object-contain shadow-2xl md:max-h-[calc(100vh-120px)]",
                    gpuPreviewReady && !useCPU && "hidden",
                  )}
                />
              ) : null}
              {!previewUrl && imageUrl && !(gpuPreviewReady && !useCPU) ? (
                // eslint-disable-next-line @next/next/no-img-element -- user uploads and object URLs
                <img
                  src={imageUrl}
                  alt="Original"
                  className="max-h-[calc(100dvh-120px)] max-w-full rounded-lg object-contain opacity-60 shadow-2xl md:max-h-[calc(100vh-120px)]"
                />
              ) : null}
            </div>
          )}
        </div>

        <div className="safe-area-bottom bg-surface/95 flex items-stretch border-t border-border backdrop-blur-md md:hidden">
          <button
            type="button"
            onClick={() => openDrawerWithTab("adjust")}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 transition-colors ${
              drawerOpen && activeTab === "adjust" ? "text-primary" : "text-muted-foreground"
            }`}
            aria-label="Open adjustments"
          >
            <span className="text-[10px] font-medium">Adjust</span>
          </button>

          <div className="flex items-center gap-1 px-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="bg-emerald-600 text-white hover:bg-emerald-500"
              disabled={(!previewUrl && !gpuPreviewReady) || isProcessing}
              aria-label="Save edited image"
              onClick={() => void handleSaveImage()}
            >
              Save
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!engineReady || isProcessing}
              aria-label="Export cube LUT file"
              onClick={() => void handleExportCube()}
            >
              .cube
            </Button>
          </div>

          <button
            type="button"
            onClick={() => openDrawerWithTab("curves")}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 transition-colors ${
              drawerOpen && activeTab === "curves" ? "text-primary" : "text-muted-foreground"
            }`}
            aria-label="Open curves"
          >
            <span className="text-[10px] font-medium">Curves</span>
          </button>

          <button
            type="button"
            onClick={() => openDrawerWithTab("ai")}
            className={`flex flex-col items-center justify-center gap-0.5 px-3 py-2.5 transition-colors ${
              drawerOpen && activeTab === "ai" ? "text-violet-400" : "text-muted-foreground"
            }`}
            aria-label="Open AI film mimic"
          >
            <Sparkles className="size-3.5" />
            <span className="text-[10px] font-medium">AI</span>
          </button>
        </div>

        {drawerOpen ? (
          <div className="fixed inset-0 z-40 md:hidden" onClick={() => setDrawerOpen(false)} aria-hidden>
            <div className="absolute inset-0 bg-black/40" />
          </div>
        ) : null}

        <div
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Editing controls"
          className={`bg-surface fixed right-0 left-0 z-50 flex flex-col rounded-t-2xl border-t border-border shadow-2xl transition-transform duration-300 ease-out md:hidden ${
            drawerOpen ? "" : "pointer-events-none translate-y-full"
          } ${
            drawerSnap === "peek" ? "drawer-peek" : drawerSnap === "half" ? "drawer-half" : "drawer-full"
          }`}
          style={{ bottom: 0, top: drawerSnap === "full" ? "48px" : "auto" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="shrink-0 touch-none py-2"
            style={{ touchAction: "none" }}
            onTouchStart={handleDrawerTouchStart}
            onTouchMove={handleDrawerTouchMove}
            onTouchEnd={handleDrawerTouchEnd}
          >
            <div className="mx-auto h-1 w-10 rounded-full bg-muted" />
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{tabBar}</div>
        </div>
      </div>

      <SaveLutDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        params={params}
      />
    </div>
  );
}
