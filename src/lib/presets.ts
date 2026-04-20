import type { FilterParams } from "./lut-engine";

export type PresetItem = { name: string; params: Partial<FilterParams> };

/** Creative looks — tuned for natural starting points (not extreme posterization). */
export const LOOK_PRESETS: PresetItem[] = [
  {
    name: "Cinematic",
    params: {
      contrast: 1.08,
      saturation: 0.92,
      temperature: 0.05,
      shadows: -0.04,
      highlights: -0.04,
      gamma: 0.97,
      vibrance: 0.1,
    },
  },
  {
    name: "Teal & Orange",
    params: {
      contrast: 1.12,
      saturation: 1.08,
      temperature: 0.1,
      tint: -0.06,
      shadows: -0.05,
      highlights: -0.03,
      redGain: 1.06,
      blueGain: 1.1,
      vibrance: 0.15,
    },
  },
  {
    name: "Vintage",
    params: {
      contrast: 0.9,
      saturation: 0.62,
      temperature: 0.16,
      tint: 0.05,
      shadows: 0.06,
      gamma: 1.08,
      vibrance: -0.08,
      redGain: 1.04,
      greenGain: 0.97,
    },
  },
  {
    name: "Moody",
    params: {
      contrast: 1.22,
      saturation: 0.52,
      exposure: -0.18,
      shadows: -0.1,
      highlights: -0.08,
      temperature: -0.06,
      gamma: 0.94,
    },
  },
  {
    name: "Warm Glow",
    params: {
      temperature: 0.18,
      saturation: 1.06,
      highlights: 0.03,
      gamma: 0.97,
      shadows: 0.04,
      vibrance: 0.12,
      redGain: 1.04,
    },
  },
  {
    name: "Cool Tone",
    params: {
      temperature: -0.16,
      saturation: 0.88,
      contrast: 1.06,
      tint: -0.03,
      blueGain: 1.05,
      vibrance: 0.08,
    },
  },
  {
    name: "High Key",
    params: {
      brightness: 0.06,
      contrast: 0.88,
      saturation: 0.88,
      highlights: 0.1,
      shadows: 0.05,
      gamma: 1.04,
      vibrance: 0.08,
    },
  },
  {
    name: "Film Noir",
    params: {
      contrast: 1.32,
      saturation: 0.28,
      shadows: -0.1,
      exposure: -0.15,
      highlights: -0.06,
      gamma: 0.92,
    },
  },
  {
    name: "Faded",
    params: {
      contrast: 0.82,
      saturation: 0.65,
      brightness: 0.03,
      shadows: 0.07,
      highlights: -0.05,
      gamma: 1.1,
      vibrance: -0.08,
    },
  },
  {
    name: "Punchy",
    params: {
      contrast: 1.18,
      saturation: 1.22,
      vibrance: 0.22,
      gamma: 0.95,
      highlights: 0.02,
      shadows: -0.03,
    },
  },
  {
    name: "Matte",
    params: {
      contrast: 0.88,
      saturation: 0.78,
      brightness: 0.02,
      shadows: 0.08,
      gamma: 1.06,
    },
  },
  {
    name: "B&W Film",
    params: {
      saturation: 0,
      contrast: 1.18,
      gamma: 0.98,
      shadows: -0.03,
      highlights: -0.03,
    },
  },
];

/** Fuji-inspired film simulations (approximate; not affiliated with Fujifilm). */
export const FUJI_PRESETS: PresetItem[] = [
  {
    name: "Fuji Provia",
    params: {
      contrast: 1.06,
      saturation: 1.06,
      vibrance: 0.08,
      temperature: 0.02,
      gamma: 0.99,
    },
  },
  {
    name: "Fuji Velvia",
    params: {
      contrast: 1.12,
      saturation: 1.28,
      vibrance: 0.22,
      greenGain: 1.04,
      blueGain: 1.06,
      gamma: 0.96,
    },
  },
  {
    name: "Fuji Astia",
    params: {
      contrast: 0.94,
      saturation: 1.02,
      highlights: 0.04,
      shadows: 0.04,
      gamma: 1.02,
      vibrance: 0.05,
    },
  },
  {
    name: "Fuji Classic Chrome",
    params: {
      contrast: 1.04,
      saturation: 0.78,
      temperature: 0.06,
      tint: -0.06,
      shadows: 0.05,
      greenGain: 0.96,
      vibrance: 0.06,
    },
  },
  {
    name: "Fuji Classic Neg",
    params: {
      contrast: 0.95,
      saturation: 0.95,
      shadows: 0.08,
      temperature: 0.08,
      gamma: 1.04,
      highlights: -0.02,
    },
  },
  {
    name: "Fuji Eterna",
    params: {
      contrast: 0.92,
      saturation: 0.72,
      shadows: 0.05,
      tint: -0.04,
      gamma: 1.03,
      highlights: -0.03,
    },
  },
  {
    name: "Fuji Pro Neg Hi",
    params: {
      contrast: 1.08,
      saturation: 1.06,
      vibrance: 0.1,
      gamma: 0.98,
      shadows: 0.02,
    },
  },
  {
    name: "Fuji Acros",
    params: {
      saturation: 0,
      contrast: 1.2,
      gamma: 0.97,
      shadows: -0.04,
      highlights: -0.04,
    },
  },
];
