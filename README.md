# LUT Studio

Professional 3D LUT color grading in your browser. Create, preview, and export `.cube` LUT files with real-time WebGPU acceleration.

## Features

- **Real-time preview** — GPU-accelerated color grading via WebGPU compute shaders
- **CPU fallback** — Works on all browsers, even without WebGPU
- **Curves editor** — Master, Red, Green, Blue channel curves with drag-to-edit control points
- **30+ presets** — Cinematic looks, Fuji film simulations, Kodak film stocks
- **Full filter controls** — Exposure, contrast, saturation, temperature, tint, vibrance, highlights, shadows, per-channel lift/gamma/gain
- **`.cube` export** — Export standard 3D LUT files compatible with DaVinci Resolve, Premiere Pro, Final Cut Pro, and more
- **Image export** — Save graded images directly
- **HEIC support** — Import iPhone HEIC/HEIF photos
- **State persistence** — Your adjustments are saved automatically
- **Responsive** — Works on desktop and mobile with touch-optimized controls
- **Dark theme** — Easy on the eyes during long grading sessions

## Tech Stack

- **Next.js 16** — App Router, React 19, Server Components
- **WebGPU** — Compute shaders for LUT generation and image processing
- **Tailwind CSS 4** + **shadcn/ui** — Styling and UI components
- **WGSL shaders** — Custom compute shaders for LUT generation and application
- **TypeScript** — Full type safety

## Getting Started

```bash
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

## How It Works

1. **Upload** — Drop or select any image (including HEIC)
2. **Adjust** — Use sliders and presets for color grading, or drag curve control points
3. **Export** — Download a `.cube` LUT file to use in your NLE, or save the graded image

The 3D LUT is generated as a 32×32×32 color mapping table using WebGPU compute shaders for real-time performance. The CPU fallback generates the same LUT on the main thread.

## Privacy

All processing happens locally in your browser. No images or data are ever uploaded to any server. See [/privacy](/privacy) for details.

## License

MIT
