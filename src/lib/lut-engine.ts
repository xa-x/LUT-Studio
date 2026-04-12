import { LUT_GENERATE_SHADER, LUT_APPLY_SHADER, LUT_BLIT_SHADER } from './shaders';

export interface FilterParams {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  temperature: number;
  tint: number;
  exposure: number;
  gamma: number;
  highlights: number;
  shadows: number;
  vibrance: number;
  // Per-channel
  redLift: number;
  redGamma: number;
  redGain: number;
  greenLift: number;
  greenGamma: number;
  greenGain: number;
  blueLift: number;
  blueGamma: number;
  blueGain: number;
  // Curves: each curve is 5 control points [{x, y}]
  masterCurve: CurvePoint[];
  redCurve: CurvePoint[];
  greenCurve: CurvePoint[];
  blueCurve: CurvePoint[];
}

export interface CurvePoint {
  x: number;
  y: number;
}

export const DEFAULT_CURVE: CurvePoint[] = [
  { x: 0, y: 0 },
  { x: 0.25, y: 0.25 },
  { x: 0.5, y: 0.5 },
  { x: 0.75, y: 0.75 },
  { x: 1, y: 1 },
];

export function freshParams(): FilterParams {
  return {
    brightness: 0,
    contrast: 1,
    saturation: 1,
    hue: 0,
    temperature: 0,
    tint: 0,
    exposure: 0,
    gamma: 1,
    highlights: 0,
    shadows: 0,
    vibrance: 0,
    redLift: 0,
    redGamma: 1,
    redGain: 1,
    greenLift: 0,
    greenGamma: 1,
    greenGain: 1,
    blueLift: 0,
    blueGamma: 1,
    blueGain: 1,
    masterCurve: DEFAULT_CURVE.map(p => ({ ...p })),
    redCurve: DEFAULT_CURVE.map(p => ({ ...p })),
    greenCurve: DEFAULT_CURVE.map(p => ({ ...p })),
    blueCurve: DEFAULT_CURVE.map(p => ({ ...p })),
  };
}

export const DEFAULT_PARAMS: FilterParams = freshParams();

/** Deep-clone default identity curves (safe for presets; avoids shared point refs). */
export function cloneDefaultCurves(): Pick<
  FilterParams,
  "masterCurve" | "redCurve" | "greenCurve" | "blueCurve"
> {
  const copy = () => DEFAULT_CURVE.map((p) => ({ ...p }));
  return {
    masterCurve: copy(),
    redCurve: copy(),
    greenCurve: copy(),
    blueCurve: copy(),
  };
}

const LUT_SIZE = 32;

const GEN_UNIFORM_SIZE = 256;
const APPLY_UNIFORM_SIZE = 16;

export class LUTEngine {
  private device: GPUDevice | null = null;
  private generatePipeline: GPUComputePipeline | null = null;
  private applyPipeline: GPUComputePipeline | null = null;
  private blitPipeline: GPURenderPipeline | null = null;
  private canvasFormat: GPUTextureFormat | null = null;
  private sampler: GPUSampler | null = null;
  private lutTexture: GPUTexture | null = null;
  private lutSize = LUT_SIZE;

  /** Reused uniform buffers (avoid per-frame allocation). */
  private genUniformBuffer: GPUBuffer | null = null;
  private applyUniformBuffer: GPUBuffer | null = null;

  /** Pooled textures / readback for apply pass (resize when dimensions change). */
  private poolW = 0;
  private poolH = 0;
  private pooledInput: GPUTexture | null = null;
  private pooledOutput: GPUTexture | null = null;
  private pooledReadBuffer: GPUBuffer | null = null;

  async init(): Promise<boolean> {
    if (!navigator.gpu) return false;

    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: 'high-performance',
    });
    if (!adapter) return false;

    this.device = await adapter.requestDevice();
    if (!this.device) return false;

    this.canvasFormat = navigator.gpu.getPreferredCanvasFormat();

    // Create compute pipelines
    this.generatePipeline = this.device.createComputePipeline({
      layout: 'auto',
      compute: {
        module: this.device.createShaderModule({ code: LUT_GENERATE_SHADER }),
        entryPoint: 'main',
      },
    });

    this.applyPipeline = this.device.createComputePipeline({
      layout: 'auto',
      compute: {
        module: this.device.createShaderModule({ code: LUT_APPLY_SHADER }),
        entryPoint: 'main',
      },
    });

    const blitModule = this.device.createShaderModule({ code: LUT_BLIT_SHADER });
    this.blitPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: blitModule,
        entryPoint: 'vs_main',
      },
      fragment: {
        module: blitModule,
        entryPoint: 'fs_main',
        targets: [{ format: this.canvasFormat }],
      },
      primitive: { topology: 'triangle-list' },
    });

    this.sampler = this.device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
      addressModeU: 'clamp-to-edge',
      addressModeV: 'clamp-to-edge',
      addressModeW: 'clamp-to-edge',
    });

    this.genUniformBuffer = this.device.createBuffer({
      size: GEN_UNIFORM_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.applyUniformBuffer = this.device.createBuffer({
      size: APPLY_UNIFORM_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Create persistent LUT 3D texture
    // Using rgba16float instead of rgba32float because rgba32float is UnfilterableFloat
    // and we use textureLoad (not textureSampleLevel) for the LUT in the apply shader
    this.lutTexture = this.device.createTexture({
      size: [this.lutSize, this.lutSize, this.lutSize],
      format: 'rgba16float',
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
      dimension: '3d',
    });

    return true;
  }

  private releasePool(): void {
    this.pooledInput?.destroy();
    this.pooledOutput?.destroy();
    this.pooledReadBuffer?.destroy();
    this.pooledInput = null;
    this.pooledOutput = null;
    this.pooledReadBuffer = null;
    this.poolW = 0;
    this.poolH = 0;
  }

  private ensurePool(width: number, height: number): boolean {
    if (!this.device) return false;
    if (this.poolW === width && this.poolH === height && this.pooledInput && this.pooledOutput && this.pooledReadBuffer) {
      return true;
    }

    this.releasePool();
    this.poolW = width;
    this.poolH = height;

    const texUsageIn =
      GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT;
    const texUsageOut =
      GPUTextureUsage.STORAGE_BINDING |
      GPUTextureUsage.COPY_SRC |
      GPUTextureUsage.TEXTURE_BINDING;

    this.pooledInput = this.device.createTexture({
      size: [width, height],
      format: 'rgba8unorm',
      usage: texUsageIn,
    });

    this.pooledOutput = this.device.createTexture({
      size: [width, height],
      format: 'rgba8unorm',
      usage: texUsageOut,
    });

    const bytesPerRow = Math.ceil((width * 4) / 256) * 256;
    this.pooledReadBuffer = this.device.createBuffer({
      size: bytesPerRow * height,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });

    return true;
  }

  /** Upload source image + apply uniforms; must run before the apply compute pass in the same frame. */
  private queueApplyInputUpload(
    imageBitmap: ImageBitmap | HTMLCanvasElement,
    width: number,
    height: number,
  ): boolean {
    if (!this.device || !this.pooledInput || !this.applyUniformBuffer) return false;
    this.device.queue.copyExternalImageToTexture(
      { source: imageBitmap },
      { texture: this.pooledInput },
      [width, height],
    );
    const applyDims = new Uint32Array([width, height, this.lutSize, 0]);
    this.device.queue.writeBuffer(this.applyUniformBuffer, 0, applyDims);
    return true;
  }

  /** Encode apply compute only (caller already queued upload + gen uniforms). */
  private encodeApplyPass(encoder: GPUCommandEncoder): boolean {
    if (!this.device || !this.applyPipeline || !this.lutTexture || !this.sampler || !this.applyUniformBuffer) {
      return false;
    }
    if (!this.pooledInput || !this.pooledOutput) return false;

    const bindGroup = this.device.createBindGroup({
      layout: this.applyPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.applyUniformBuffer } },
        { binding: 1, resource: this.pooledInput.createView() },
        { binding: 2, resource: this.pooledOutput.createView() },
        { binding: 3, resource: this.lutTexture.createView({ dimension: '3d' }) },
        { binding: 4, resource: this.sampler },
      ],
    });

    const pass = encoder.beginComputePass();
    pass.setPipeline(this.applyPipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(Math.ceil(this.poolW / 16), Math.ceil(this.poolH / 16));
    pass.end();

    return true;
  }

  private writeGenUniforms(params: FilterParams): void {
    if (!this.device || !this.genUniformBuffer) return;
    const uniformData = this.packUniforms(params);
    this.device.queue.writeBuffer(
      this.genUniformBuffer,
      0,
      uniformData.buffer,
      uniformData.byteOffset,
      uniformData.byteLength,
    );
  }

  private encodeGenerateLUTPass(encoder: GPUCommandEncoder): void {
    if (!this.device || !this.generatePipeline || !this.lutTexture || !this.genUniformBuffer) return;

    const bindGroup = this.device.createBindGroup({
      layout: this.generatePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.genUniformBuffer } },
        { binding: 1, resource: this.lutTexture.createView({ dimension: '3d' }) },
      ],
    });

    const pass = encoder.beginComputePass();
    pass.setPipeline(this.generatePipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(
      Math.ceil(this.lutSize / 4),
      Math.ceil(this.lutSize / 4),
      Math.ceil(this.lutSize / 4),
    );
    pass.end();
  }

  /**
   * Fast preview: compute on GPU, blit to WebGPU canvas — no CPU readback.
   */
  presentPreviewToCanvas(canvas: HTMLCanvasElement, imageBitmap: ImageBitmap, params: FilterParams): boolean {
    if (!this.device || !this.blitPipeline || !this.canvasFormat || !this.sampler) return false;

    const width = imageBitmap.width;
    const height = imageBitmap.height;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('webgpu');
    if (!ctx) return false;

    ctx.configure({
      device: this.device,
      format: this.canvasFormat,
      alphaMode: 'opaque',
    });

    if (!this.ensurePool(width, height) || !this.pooledOutput) return false;

    this.writeGenUniforms(params);
    if (!this.queueApplyInputUpload(imageBitmap, width, height)) return false;

    const encoder = this.device.createCommandEncoder();
    this.encodeGenerateLUTPass(encoder);
    if (!this.encodeApplyPass(encoder)) return false;

    const blitBg = this.device.createBindGroup({
      layout: this.blitPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: this.pooledOutput.createView() },
        { binding: 1, resource: this.sampler },
      ],
    });

    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: ctx.getCurrentTexture().createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    });
    pass.setPipeline(this.blitPipeline);
    pass.setBindGroup(0, blitBg);
    pass.draw(3);
    pass.end();

    this.device.queue.submit([encoder.finish()]);
    return true;
  }

  private curve5(
    curve: CurvePoint[] | undefined,
    fallback: typeof DEFAULT_CURVE,
  ): { x: number; y: number }[] {
    const src = curve?.length === 5 ? curve : fallback;
    return Array.from({ length: 5 }, (_, i) => ({
      x: Number.isFinite(src[i]?.x) ? src[i]!.x : fallback[i]!.x,
      y: Number.isFinite(src[i]?.y) ? src[i]!.y : fallback[i]!.y,
    }));
  }

  private packUniforms(params: FilterParams): Float32Array {
    // Must match the shader struct layout exactly (all f32, aligned)
    // We need to pack curves as flat f32 pairs
    const mc = this.curve5(params.masterCurve, DEFAULT_CURVE);
    const rc = this.curve5(params.redCurve, DEFAULT_CURVE);
    const gc = this.curve5(params.greenCurve, DEFAULT_CURVE);
    const bc = this.curve5(params.blueCurve, DEFAULT_CURVE);

    const data = new Float32Array([
      // Basic params (lutSize as u32 but we write as f32 bits)
      this.lutSize,
      params.brightness,
      params.contrast,
      params.saturation,
      params.hue,
      params.temperature,
      params.tint,
      params.exposure,
      params.gamma,
      params.highlights,
      params.shadows,
      params.vibrance,
      // Red channel
      params.redLift,
      params.redGamma,
      params.redGain,
      // Green channel
      params.greenLift,
      params.greenGamma,
      params.greenGain,
      // Blue channel
      params.blueLift,
      params.blueGamma,
      params.blueGain,
      // Master curve (5 x,y pairs = 10 floats)
      mc[0].x, mc[0].y, mc[1].x, mc[1].y, mc[2].x, mc[2].y, mc[3].x, mc[3].y, mc[4].x, mc[4].y,
      // Red curve
      rc[0].x, rc[0].y, rc[1].x, rc[1].y, rc[2].x, rc[2].y, rc[3].x, rc[3].y, rc[4].x, rc[4].y,
      // Green curve
      gc[0].x, gc[0].y, gc[1].x, gc[1].y, gc[2].x, gc[2].y, gc[3].x, gc[3].y, gc[4].x, gc[4].y,
      // Blue curve
      bc[0].x, bc[0].y, bc[1].x, bc[1].y, bc[2].x, bc[2].y, bc[3].x, bc[3].y, bc[4].x, bc[4].y,
    ]);

    return data;
  }

  generateLUT(params: FilterParams): void {
    if (!this.device || !this.generatePipeline || !this.lutTexture || !this.genUniformBuffer) return;

    this.writeGenUniforms(params);
    const encoder = this.device.createCommandEncoder();
    this.encodeGenerateLUTPass(encoder);
    this.device.queue.submit([encoder.finish()]);
  }

  async applyToImage(
    imageBitmap: ImageBitmap | HTMLCanvasElement,
    params: FilterParams,
  ): Promise<ImageBitmap | null> {
    if (!this.device || !this.applyPipeline || !this.lutTexture || !this.sampler) return null;

    const width = imageBitmap.width;
    const height = imageBitmap.height;

    if (!this.ensurePool(width, height) || !this.pooledOutput || !this.pooledReadBuffer) {
      return null;
    }

    this.writeGenUniforms(params);
    if (!this.queueApplyInputUpload(imageBitmap, width, height)) return null;

    const encoder = this.device.createCommandEncoder();
    this.encodeGenerateLUTPass(encoder);
    if (!this.encodeApplyPass(encoder)) return null;

    const bytesPerRow = Math.ceil((width * 4) / 256) * 256;

    encoder.copyTextureToBuffer(
      { texture: this.pooledOutput },
      { buffer: this.pooledReadBuffer, bytesPerRow },
      [width, height],
    );

    this.device.queue.submit([encoder.finish()]);

    await this.pooledReadBuffer.mapAsync(GPUMapMode.READ);
    const mappedData = new Uint8Array(this.pooledReadBuffer.getMappedRange().slice(0));
    this.pooledReadBuffer.unmap();

    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      const srcOffset = y * bytesPerRow;
      const dstOffset = y * width * 4;
      data.set(mappedData.subarray(srcOffset, srcOffset + width * 4), dstOffset);
    }

    const imageData = new ImageData(data, width, height);
    const bitmap = await createImageBitmap(imageData);

    return bitmap;
  }

  async readLUTData(params: FilterParams): Promise<Float32Array | null> {
    if (!this.device || !this.lutTexture) return null;

    // Generate the LUT first
    this.generateLUT(params);

    // We need to copy the 3D texture to a buffer
    // Since we can't directly copy 3D textures to buffers in all implementations,
    // we'll re-generate the LUT on CPU by reading back through a staging texture
    // Actually, let's just compute the LUT on CPU for export - it's more reliable
    return this.generateLUTCPU(params);
  }

  private catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
    const t2 = t * t;
    const t3 = t2 * t;
    return 0.5 * (
      (2 * p1) +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3
    );
  }

  private sampleCurve(x: number, curve: CurvePoint[]): number {
    const xs = curve.map(p => p.x);
    const ys = curve.map(p => p.y);

    if (x <= xs[0]) return ys[0];
    if (x >= xs[4]) return ys[4];

    let seg = 0;
    for (let i = 0; i < 4; i++) {
      if (x >= xs[i] && x <= xs[i + 1]) {
        seg = i;
        break;
      }
    }

    const segLen = xs[seg + 1] - xs[seg];
    const t = segLen > 0 ? (x - xs[seg]) / segLen : 0;

    const p0 = ys[seg > 0 ? seg - 1 : 0];
    const p1 = ys[seg];
    const p2 = ys[seg + 1];
    const p3 = ys[seg + 2 <= 4 ? seg + 2 : 4];

    return this.catmullRom(p0, p1, p2, p3, t);
  }

  private rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const l = (maxC + minC) / 2;
    let h = 0, s = 0;

    if (maxC !== minC) {
      const d = maxC - minC;
      s = l < 0.5 ? d / (maxC + minC) : d / (2 - maxC - minC);
      if (maxC === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (maxC === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }
    return [h, s, l];
  }

  private hslToRgb(h: number, s: number, l: number): [number, number, number] {
    if (s === 0) return [l, l, l];
    const hue2rgb = (p: number, q: number, t: number) => {
      let tt = t;
      if (tt < 0) tt += 1;
      if (tt > 1) tt -= 1;
      if (tt < 1 / 6) return p + (q - p) * 6 * tt;
      if (tt < 1 / 2) return q;
      if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return [hue2rgb(p, q, h + 1 / 3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1 / 3)];
  }

  generateLUTCPU(params: FilterParams): Float32Array {
    const size = this.lutSize;
    const totalEntries = size * size * size;
    const data = new Float32Array(totalEntries * 3);

    for (let bIdx = 0; bIdx < size; bIdx++) {
      for (let gIdx = 0; gIdx < size; gIdx++) {
        for (let rIdx = 0; rIdx < size; rIdx++) {
          let r = rIdx / (size - 1);
          let g = gIdx / (size - 1);
          let b = bIdx / (size - 1);

          // Same pipeline as shader
          // Exposure
          r *= Math.pow(2, params.exposure);
          g *= Math.pow(2, params.exposure);
          b *= Math.pow(2, params.exposure);

          // Brightness
          r += params.brightness;
          g += params.brightness;
          b += params.brightness;

          // Contrast
          r = (r - 0.5) * params.contrast + 0.5;
          g = (g - 0.5) * params.contrast + 0.5;
          b = (b - 0.5) * params.contrast + 0.5;

          // Gamma
          r = Math.pow(Math.max(r, 0), 1 / Math.max(params.gamma, 0.01));
          g = Math.pow(Math.max(g, 0), 1 / Math.max(params.gamma, 0.01));
          b = Math.pow(Math.max(b, 0), 1 / Math.max(params.gamma, 0.01));

          // Highlights and Shadows
          const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          const hiMask = this.smoothstep(0.3, 0.7, lum);
          const shMask = 1 - this.smoothstep(0, 0.5, lum);
          r += params.highlights * hiMask + params.shadows * shMask;
          g += params.highlights * hiMask + params.shadows * shMask;
          b += params.highlights * hiMask + params.shadows * shMask;

          // Temperature
          r += params.temperature * 0.1;
          b -= params.temperature * 0.1;

          // Tint
          g += params.tint * 0.05;

          // Saturation & Vibrance
          let [h, s, l] = this.rgbToHsl(r, g, b);
          const satBoost = params.saturation + params.vibrance * (1 - s);
          s = Math.max(0, Math.min(1, s * satBoost));
          [r, g, b] = this.hslToRgb(h, s, l);

          // Hue rotation
          [h, s, l] = this.rgbToHsl(r, g, b);
          [r, g, b] = this.hslToRgb(((h + params.hue) % 1 + 1) % 1, s, l);

          // Per-channel Lift/Gamma/Gain
          r = Math.pow(Math.max(r * params.redGain + params.redLift, 0), 1 / Math.max(params.redGamma, 0.01));
          g = Math.pow(Math.max(g * params.greenGain + params.greenLift, 0), 1 / Math.max(params.greenGamma, 0.01));
          b = Math.pow(Math.max(b * params.blueGain + params.blueLift, 0), 1 / Math.max(params.blueGamma, 0.01));

          // Master curve (sample at luminance so identity curve leaves RGB unchanged)
          const lumW = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          const m = this.sampleCurve(lumW, params.masterCurve);
          const masterEffect = m - lumW;
          r += masterEffect;
          g += masterEffect;
          b += masterEffect;

          // Per-channel curves
          r = this.sampleCurve(r, params.redCurve);
          g = this.sampleCurve(g, params.greenCurve);
          b = this.sampleCurve(b, params.blueCurve);

          // Clamp
          r = Math.max(0, Math.min(1, r));
          g = Math.max(0, Math.min(1, g));
          b = Math.max(0, Math.min(1, b));

          const idx = (bIdx * size * size + gIdx * size + rIdx) * 3;
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
        }
      }
    }

    return data;
  }

  private smoothstep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  exportCube(params: FilterParams, title: string = 'LUT Studio Export'): string {
    const lutData = this.generateLUTCPU(params);
    const size = this.lutSize;

    const lines: string[] = [];
    lines.push(`TITLE "${title}"`);
    lines.push(``);
    lines.push(`# Created with LUT Studio`);
    lines.push(`# LUT_3D_SIZE ${size}`);
    lines.push(``);
    lines.push(`LUT_3D_SIZE ${size}`);
    lines.push(``);
    lines.push(`# domain min/max`);
    lines.push(`DOMAIN_MIN 0.0 0.0 0.0`);
    lines.push(`DOMAIN_MAX 1.0 1.0 1.0`);
    lines.push(``);

    // .cube format: outer loop = B (fastest R, then G, then B)
    // Actually the spec says: the data is ordered such that the first index
    // (first value in triplet) varies fastest, then second, then third.
    // So for entry at (R, G, B): index = B * size^2 + G * size + R
    // And the loops are: for B, for G, for R
    for (let bIdx = 0; bIdx < size; bIdx++) {
      for (let gIdx = 0; gIdx < size; gIdx++) {
        for (let rIdx = 0; rIdx < size; rIdx++) {
          const idx = (bIdx * size * size + gIdx * size + rIdx) * 3;
          const r = lutData[idx];
          const g = lutData[idx + 1];
          const b = lutData[idx + 2];
          lines.push(`${r.toFixed(6)} ${g.toFixed(6)} ${b.toFixed(6)}`);
        }
      }
    }

    return lines.join('\n') + '\n';
  }

  destroy(): void {
    this.releasePool();
    this.genUniformBuffer?.destroy();
    this.applyUniformBuffer?.destroy();
    this.genUniformBuffer = null;
    this.applyUniformBuffer = null;
    this.lutTexture?.destroy();
    this.device?.destroy();
    this.device = null;
  }
}
