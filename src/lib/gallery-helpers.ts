/** Category metadata for LUT gallery display. */
export const CATEGORIES = [
  "cinematic",
  "film",
  "fuji",
  "vintage",
  "bw",
  "custom",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_STYLES: Record<Category, { label: string; bg: string; text: string }> = {
  cinematic: { label: "Cinematic", bg: "bg-purple-500/20", text: "text-purple-400" },
  film:      { label: "Film",      bg: "bg-amber-500/20",  text: "text-amber-400"  },
  fuji:      { label: "Fuji",      bg: "bg-green-500/20",  text: "text-green-400"  },
  vintage:   { label: "Vintage",   bg: "bg-orange-500/20", text: "text-orange-400" },
  bw:        { label: "B&W",       bg: "bg-zinc-500/20",   text: "text-zinc-400"   },
  custom:    { label: "Custom",    bg: "bg-blue-500/20",   text: "text-blue-400"   },
};

export function getCategoryStyle(cat: string) {
  return CATEGORY_STYLES[cat as Category] ?? CATEGORY_STYLES.custom;
}

/** Format an ISO date string to a human-readable form. */
export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

/** Human-readable labels for filter params. */
export const PARAM_LABELS: Record<string, string> = {
  brightness: "Brightness",
  contrast: "Contrast",
  saturation: "Saturation",
  hue: "Hue Rotation",
  temperature: "Temperature",
  tint: "Tint",
  exposure: "Exposure",
  gamma: "Gamma",
  highlights: "Highlights",
  shadows: "Shadows",
  vibrance: "Vibrance",
  redLift: "Red Lift",
  redGamma: "Red Gamma",
  redGain: "Red Gain",
  greenLift: "Green Lift",
  greenGamma: "Green Gamma",
  greenGain: "Green Gain",
  blueLift: "Blue Lift",
  blueGamma: "Blue Gamma",
  blueGain: "Blue Gain",
};

/** Numeric param keys (excludes curves). */
export const NUMERIC_PARAM_KEYS = [
  "brightness", "contrast", "saturation", "hue", "temperature", "tint",
  "exposure", "gamma", "highlights", "shadows", "vibrance",
  "redLift", "redGamma", "redGain",
  "greenLift", "greenGamma", "greenGain",
  "blueLift", "blueGamma", "blueGain",
] as const;

/** Check if a param value differs from its default (identity) value. */
export function isNonDefault(key: string, value: number): boolean {
  const defaults: Record<string, number> = {
    brightness: 0, contrast: 1, saturation: 1, hue: 0, temperature: 0,
    tint: 0, exposure: 0, gamma: 1, highlights: 0, shadows: 0, vibrance: 0,
    redLift: 0, redGamma: 1, redGain: 1,
    greenLift: 0, greenGamma: 1, greenGain: 1,
    blueLift: 0, blueGamma: 1, blueGain: 1,
  };
  return value !== (defaults[key] ?? 0);
}
