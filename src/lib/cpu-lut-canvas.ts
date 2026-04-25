import type { FilterParams, LUTEngine } from "@/lib/lut-engine";

/** Apply CPU LUT pipeline to a scaled canvas copy of `img`. */
export function renderCpuLutCanvas(
  img: HTMLImageElement,
  params: FilterParams,
  maxDim: number,
  engine: LUTEngine
): HTMLCanvasElement | null {
  const canvas = document.createElement("canvas");
  let w = img.naturalWidth;
  let h = img.naturalHeight;
  if (w > maxDim || h > maxDim) {
    const scale = maxDim / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
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

    const r0 = Math.floor(rF);
    const r1 = Math.min(r0 + 1, lutMax);
    const g0 = Math.floor(gF);
    const g1 = Math.min(g0 + 1, lutMax);
    const b0 = Math.floor(bF);
    const b1 = Math.min(b0 + 1, lutMax);

    const rD = rF - r0;
    const gD = gF - g0;
    const bD = bF - b0;

    const idx = (bz: number, gz: number, rz: number) =>
      (bz * lutSize * lutSize + gz * lutSize + rz) * 3;

    const sample = (bz: number, gz: number, rz: number) => {
      const j = idx(bz, gz, rz);
      return [lutData[j], lutData[j + 1], lutData[j + 2]];
    };

    // Sample 8 corners of the LUT cell
    // idx(b, g, r) → B slowest, G middle, R fastest (standard .cube axis order)
    // Naming convention: cBGR where 0=low, 1=high for each axis
    const c000 = sample(b0, g0, r0);
    const c001 = sample(b0, g0, r1); // r+1
    const c010 = sample(b0, g1, r0); // g+1
    const c011 = sample(b0, g1, r1); // g+1, r+1
    const c100 = sample(b1, g0, r0); // b+1
    const c101 = sample(b1, g0, r1); // b+1, r+1
    const c110 = sample(b1, g1, r0); // b+1, g+1
    const c111 = sample(b1, g1, r1); // b+1, g+1, r+1

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    // Trilinear interpolation: R fastest → G middle → B slowest
    for (let c = 0; c < 3; c++) {
      // Step 1: interpolate along R (fastest axis)
      const c00 = lerp(c000[c], c001[c], rD);
      const c01 = lerp(c010[c], c011[c], rD);
      const c10 = lerp(c100[c], c101[c], rD);
      const c11 = lerp(c110[c], c111[c], rD);
      // Step 2: interpolate along G (middle axis)
      const c0f = lerp(c00, c01, gD);
      const c1f = lerp(c10, c11, gD);
      // Step 3: interpolate along B (slowest axis)
      const val = lerp(c0f, c1f, bD);
      data[i + c] = Math.round(Math.max(0, Math.min(1, val)) * 255);
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}
