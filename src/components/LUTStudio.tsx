"use client";

import { FilterParams, LUTEngine, freshParams, DEFAULT_PARAMS, DEFAULT_CURVE } from "@/lib/lut-engine";
import FilterPanel from "@/components/FilterPanel";
import CurvesPanel from "@/components/CurvesPanel";
import { useCallback, useEffect, useRef, useState } from "react";

type Tab = "adjust" | "curves";

export default function LUTStudio() {
  const [params, setParams] = useState<FilterParams>(freshParams());
  const [activeTab, setActiveTab] = useState<Tab>("adjust");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [webgpuSupported, setWebgpuSupported] = useState<boolean | null>(null);
  const [engineReady, setEngineReady] = useState(false);
  const [useCPU, setUseCPU] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSnap, setDrawerSnap] = useState<"peek" | "half" | "full">("half");

  const engineRef = useRef<LUTEngine | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const drawerStartY = useRef(0);
  const drawerCurrentTranslate = useRef(0);

  // Initialize WebGPU engine
  useEffect(() => {
    const init = async () => {
      if (!navigator.gpu) {
        setWebgpuSupported(false);
        setUseCPU(true);
        const engine = new LUTEngine();
        engineRef.current = engine;
        setEngineReady(true);
        return;
      }
      setWebgpuSupported(true);
      const engine = new LUTEngine();
      const ok = await engine.init();
      if (ok) {
        engineRef.current = engine;
        setEngineReady(true);
      } else {
        console.warn("WebGPU init failed, falling back to CPU processing");
        setUseCPU(true);
        const cpuEngine = new LUTEngine();
        engineRef.current = cpuEngine;
        setEngineReady(true);
      }
    };
    init();
    return () => {
      engineRef.current?.destroy();
    };
  }, []);

  // Load default sample image
  useEffect(() => {
    loadImage("/sample.jpg");
  }, []);

  // Debounced preview update
  useEffect(() => {
    if (!engineReady || !imageRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      updatePreview();
    }, 150);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [params, engineReady, imageUrl]);

  const loadImage = useCallback((src: string) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;
      setImageUrl(src);
      setPreviewUrl(null);
    };
    img.src = src;
  }, []);

  const applyToImageCPU = useCallback((img: HTMLImageElement, params: FilterParams): string | null => {
    const engine = engineRef.current;
    if (!engine) return null;

    const canvas = document.createElement("canvas");
    const maxDim = 2048;
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    if (w > maxDim || h > maxDim) {
      const scale = maxDim / Math.max(w, h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, w, h);

    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    const lutData = engine.generateLUTCPU(params);
    const lutSize = 32;
    const lutMax = lutSize - 1;

    for (let i = 0; i < data.length; i += 4) {
      const rIn = data[i] / 255;
      const gIn = data[i + 1] / 255;
      const bIn = data[i + 2] / 255;

      const rF = rIn * lutMax;
      const gF = gIn * lutMax;
      const bF = bIn * lutMax;

      const r0 = Math.floor(rF); const r1 = Math.min(r0 + 1, lutMax);
      const g0 = Math.floor(gF); const g1 = Math.min(g0 + 1, lutMax);
      const b0 = Math.floor(bF); const b1 = Math.min(b0 + 1, lutMax);

      const rD = rF - r0; const gD = gF - g0; const bD = bF - b0;

      const idx = (bz: number, gz: number, rz: number) => (bz * lutSize * lutSize + gz * lutSize + rz) * 3;

      const sample = (bz: number, gz: number, rz: number) => {
        const j = idx(bz, gz, rz);
        return [lutData[j], lutData[j + 1], lutData[j + 2]];
      };

      const c000 = sample(b0, g0, r0);
      const c100 = sample(b1, g0, r0);
      const c010 = sample(b0, g1, r0);
      const c110 = sample(b1, g1, r0);
      const c001 = sample(b0, g0, r1);
      const c101 = sample(b1, g0, r1);
      const c011 = sample(b0, g1, r1);
      const c111 = sample(b1, g1, r1);

      const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

      for (let c = 0; c < 3; c++) {
        const c00 = lerp(c000[c], c001[c], rD);
        const c01 = lerp(c010[c], c011[c], rD);
        const c10 = lerp(c100[c], c101[c], rD);
        const c11 = lerp(c110[c], c111[c], rD);
        const c0f = lerp(c00, c10, bD);
        const c1f = lerp(c01, c11, bD);
        const val = lerp(c0f, c1f, gD);
        data[i + c] = Math.round(Math.max(0, Math.min(1, val)) * 255);
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL("image/png");
  }, []);

  const updatePreview = useCallback(async () => {
    if (!engineRef.current || !imageRef.current || isProcessing) return;

    setIsProcessing(true);
    try {
      const img = imageRef.current;

      if (useCPU) {
        const result = applyToImageCPU(img, params);
        if (result) {
          setPreviewUrl(result);
        }
      } else {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);

        const bitmap = await createImageBitmap(canvas);
        const result = await engineRef.current.applyToImage(bitmap, params);

        if (result) {
          const resultCanvas = document.createElement("canvas");
          resultCanvas.width = result.width;
          resultCanvas.height = result.height;
          const rctx = resultCanvas.getContext("2d")!;
          rctx.drawImage(result, 0, 0);
          setPreviewUrl(resultCanvas.toDataURL("image/png"));
          result.close();
        } else {
          console.warn("WebGPU applyToImage returned null, falling back to CPU");
          setUseCPU(true);
          const cpuResult = applyToImageCPU(img, params);
          if (cpuResult) {
            setPreviewUrl(cpuResult);
          }
        }
        bitmap.close();
      }
    } catch (err) {
      console.error("Preview error:", err);
      if (!useCPU) {
        console.warn("WebGPU error, falling back to CPU");
        setUseCPU(true);
        const cpuResult = applyToImageCPU(imageRef.current!, params);
        if (cpuResult) {
          setPreviewUrl(cpuResult);
        }
      }
    } finally {
      setIsProcessing(false);
    }
  }, [params, isProcessing, useCPU, applyToImageCPU]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    loadImage(url);
    e.target.value = "";
  };

  // iOS Safari: must use native click, not React synthetic
  const triggerFileInput = () => {
    const input = fileInputRef.current;
    if (!input) return;
    // Reset to allow re-upload
    input.value = "";
    input.click();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      loadImage(url);
    }
  };

  const handleExportCube = async () => {
    if (!engineRef.current) return;
    
    if (isProcessing) {
      await new Promise<void>((resolve) => {
        const check = () => {
          if (!isProcessing) { resolve(); return; }
          setTimeout(check, 50);
        };
        setTimeout(() => resolve(), 10000);
        check();
      });
    }
    
    const cubeContent = engineRef.current.exportCube(params, "LUT Studio Filter");
    const blob = new Blob([cubeContent], { type: "text/plain" });
    downloadBlob(blob, "lut-studio-filter.cube");
  };

  const handleSaveImage = async () => {
    if (!previewUrl || !imageRef.current) return;
    
    if (isProcessing) {
      await new Promise<void>((resolve) => {
        const check = () => {
          if (!isProcessing) { resolve(); return; }
          setTimeout(check, 50);
        };
        setTimeout(() => resolve(), 10000);
        check();
      });
    }
    
    const img = imageRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    
    const previewImg = new window.Image();
    previewImg.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      previewImg.onload = () => resolve();
      previewImg.onerror = reject;
      previewImg.src = previewUrl;
    });
    ctx.drawImage(previewImg, 0, 0);
    
    canvas.toBlob((blob) => {
      if (!blob) return;
      downloadBlob(blob, "lut-studio-edited.png");
    }, "image/png");
  };

  /** Cross-platform download — works on iOS Safari */
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    // iOS Safari: open in new tab (user can then save/share)
    // Desktop: triggers download via anchor
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      const win = window.open(url, "_blank");
      if (!win) {
        // Popup blocked — fallback to anchor with download attr
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

  // Drawer swipe handling
  const handleDrawerTouchStart = (e: React.TouchEvent) => {
    drawerStartY.current = e.touches[0].clientY;
  };

  const handleDrawerTouchMove = (e: React.TouchEvent) => {
    if (!drawerRef.current) return;
    const deltaY = e.touches[0].clientY - drawerStartY.current;
    drawerCurrentTranslate.current = deltaY;
    
    const drawer = drawerRef.current;
    if (deltaY > 0) {
      // Swiping down — apply transform
      drawer.style.transform = `translateY(${deltaY}px)`;
    }
  };

  const handleDrawerTouchEnd = () => {
    if (!drawerRef.current) return;
    const drawer = drawerRef.current;
    drawer.style.transform = "";
    
    const delta = drawerCurrentTranslate.current;
    
    if (delta > 80) {
      // Swipe down significant — go to previous snap or close
      if (drawerSnap === "full") {
        setDrawerSnap("half");
      } else if (drawerSnap === "half") {
        setDrawerSnap("peek");
      } else {
        setDrawerOpen(false);
      }
    } else if (delta < -80) {
      // Swipe up — expand
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

  if (webgpuSupported === false && !useCPU) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4 p-8">
          <div className="text-5xl">🚫</div>
          <h1 className="text-xl font-semibold text-foreground">
            WebGPU Not Supported
          </h1>
          <p className="text-sm text-zinc-500 max-w-md">
            LUT Studio requires WebGPU. Please use a modern browser (Chrome 113+, Edge 113+, or Safari 18+).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh bg-background overflow-hidden md:h-screen">
      {/* Shared hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        style={{ position: "fixed", top: "-9999px", left: "-9999px", opacity: 0, width: 1, height: 1 }}
      />

      {/* ========== DESKTOP SIDEBAR (>=768px) ========== */}
      <div className="hidden md:flex w-80 shrink-0 flex-col border-r border-border bg-surface">
        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab("adjust")}
            className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeTab === "adjust"
                ? "text-accent border-b-2 border-accent"
                : "text-zinc-600 hover:text-zinc-400"
            }`}
          >
            Adjust
          </button>
          <button
            onClick={() => setActiveTab("curves")}
            className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeTab === "curves"
                ? "text-accent border-b-2 border-accent"
                : "text-zinc-600 hover:text-zinc-400"
            }`}
          >
            Curves
          </button>
        </div>

        {/* Panel */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "adjust" ? (
            <FilterPanel params={params} onChange={setParams} />
          ) : (
            <CurvesPanel params={params} onChange={setParams} />
          )}
        </div>

        {/* Export buttons */}
        <div className="p-4 border-t border-border space-y-2">
          <button
            onClick={handleSaveImage}
            disabled={!previewUrl || isProcessing}
            className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
          >
            {isProcessing ? "⏳ Processing…" : "💾 Save Image"}
          </button>
          <button
            onClick={handleExportCube}
            disabled={!engineReady || isProcessing}
            className="w-full py-2.5 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
          >
            {isProcessing ? "⏳ Processing…" : "↓ Export .cube"}
          </button>
        </div>
      </div>

      {/* ========== MAIN PREVIEW ========== */}
      <div
        className="flex-1 flex flex-col relative"
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {/* Top bar — desktop */}
        <div className="hidden md:flex items-center justify-between px-6 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <h1 className="text-sm font-semibold tracking-tight">
              LUT Studio
            </h1>
            <span className="text-[10px] text-zinc-600 font-mono">
              {useCPU ? "CPU" : "WebGPU"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={triggerFileInput}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-surface hover:bg-surface-hover text-zinc-400 hover:text-zinc-200 border border-border transition-all"
            >
              Upload Image
            </button>
            {isProcessing && (
              <span className="text-[10px] text-zinc-600 animate-pulse">Processing…</span>
            )}
          </div>
        </div>

        {/* Mobile top bar */}
        <div className="flex md:hidden items-center justify-between px-4 py-2 bg-background/80 backdrop-blur-sm z-10 absolute top-0 left-0 right-0">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            <h1 className="text-xs font-semibold tracking-tight">LUT Studio</h1>
            <span className="text-[9px] text-zinc-600 font-mono">
              {useCPU ? "CPU" : "GPU"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={triggerFileInput}
              className="p-2 rounded-lg bg-surface/80 text-zinc-400 hover:text-zinc-200 border border-border transition-all"
              title="Upload Image"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </button>
            {isProcessing && (
              <span className="text-[9px] text-zinc-600 animate-pulse">Processing…</span>
            )}
          </div>
        </div>

        {/* Preview area */}
        <div className="flex-1 flex items-center justify-center p-4 pt-12 md:p-8 md:pt-8 relative">
          {isDragging && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 border-2 border-dashed border-accent rounded-lg">
              <span className="text-sm text-accent font-medium">Drop image here</span>
            </div>
          )}

          {!imageUrl && !previewUrl ? (
            <div
              onClick={triggerFileInput}
              className="flex flex-col items-center gap-4 cursor-pointer group"
            >
              <div className="w-20 h-20 rounded-2xl bg-surface border-2 border-dashed border-border group-hover:border-accent transition-colors flex items-center justify-center text-3xl">
                📷
              </div>
              <div className="text-center">
                <p className="text-sm text-zinc-400 group-hover:text-zinc-200 transition-colors">
                  Drop an image or click to upload
                </p>
                <p className="text-[11px] text-zinc-600 mt-1">
                  JPG, PNG, WebP supported
                </p>
              </div>
            </div>
          ) : (
            <div className="relative max-w-full max-h-full">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-w-full max-h-[calc(100dvh-120px)] md:max-h-[calc(100vh-120px)] object-contain rounded-lg shadow-2xl"
                />
              ) : imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Original"
                  className="max-w-full max-h-[calc(100dvh-120px)] md:max-h-[calc(100vh-120px)] object-contain rounded-lg shadow-2xl opacity-60"
                />
              ) : null}
            </div>
          )}
        </div>

        {/* ========== MOBILE BOTTOM TAB BAR (<768px) ========== */}
        <div className="flex md:hidden items-stretch border-t border-border bg-surface/95 backdrop-blur-md safe-area-bottom">
          <button
            onClick={() => openDrawerWithTab("adjust")}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors ${
              drawerOpen && activeTab === "adjust"
                ? "text-accent"
                : "text-zinc-500"
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
            <span className="text-[10px] font-medium">Adjust</span>
          </button>

          {/* Export buttons inline on mobile */}
          <div className="flex items-center gap-1 px-2">
            <button
              onClick={handleSaveImage}
              disabled={!previewUrl || isProcessing}
              className="px-3 py-2 rounded-lg bg-emerald-600 disabled:opacity-40 text-white text-[11px] font-semibold transition-colors"
            >
              💾
            </button>
            <button
              onClick={handleExportCube}
              disabled={!engineReady || isProcessing}
              className="px-3 py-2 rounded-lg bg-accent disabled:opacity-40 text-white text-[11px] font-semibold transition-colors"
            >
              .cube
            </button>
          </div>

          <button
            onClick={() => openDrawerWithTab("curves")}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors ${
              drawerOpen && activeTab === "curves"
                ? "text-accent"
                : "text-zinc-500"
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 20 Q 9 4, 12 12 T 21 4" />
            </svg>
            <span className="text-[10px] font-medium">Curves</span>
          </button>
        </div>

        {/* ========== MOBILE DRAWER OVERLAY ========== */}
        {drawerOpen && (
          <div
            className="md:hidden fixed inset-0 z-40"
            onClick={() => setDrawerOpen(false)}
          >
            <div className="absolute inset-0 bg-black/40" />
          </div>
        )}

        {/* ========== MOBILE DRAWER PANEL ========== */}
        <div
          ref={drawerRef}
          className={`md:hidden fixed left-0 right-0 z-50 bg-surface border-t border-border rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out flex flex-col ${
            drawerOpen ? "" : "translate-y-full pointer-events-none"
          } ${
            drawerSnap === "peek" ? "drawer-peek" :
            drawerSnap === "half" ? "drawer-half" :
            "drawer-full"
          }`}
          style={{ bottom: 0, top: drawerSnap === "full" ? "48px" : "auto" }}
        >
          {/* Drawer handle */}
          <div
            className="flex justify-center py-2 cursor-grab active:cursor-grabbing shrink-0"
            onTouchStart={handleDrawerTouchStart}
            onTouchMove={handleDrawerTouchMove}
            onTouchEnd={handleDrawerTouchEnd}
          >
            <div className="w-10 h-1 rounded-full bg-zinc-600" />
          </div>

          {/* Drawer tab header */}
          <div className="flex border-b border-border shrink-0">
            <button
              onClick={() => setActiveTab("adjust")}
              className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                activeTab === "adjust"
                  ? "text-accent border-b-2 border-accent"
                  : "text-zinc-600"
              }`}
            >
              Adjust
            </button>
            <button
              onClick={() => setActiveTab("curves")}
              className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                activeTab === "curves"
                  ? "text-accent border-b-2 border-accent"
                  : "text-zinc-600"
              }`}
            >
              Curves
            </button>
          </div>

          {/* Drawer content */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {activeTab === "adjust" ? (
              <FilterPanel params={params} onChange={setParams} />
            ) : (
              <CurvesPanel params={params} onChange={setParams} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
