import type { FilterParams } from "./lut-engine";

const STORAGE_KEY = "lut-studio-params";

export function saveParams(params: FilterParams): void {
  try {
    const json = JSON.stringify(params);
    localStorage.setItem(STORAGE_KEY, json);
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

export function loadParams(): FilterParams | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isValidParams(parsed)) return null;
    return parsed as FilterParams;
  } catch {
    return null;
  }
}

function isValidParams(obj: unknown): obj is FilterParams {
  if (typeof obj !== "object" || obj === null) return false;
  const p = obj as Record<string, unknown>;

  const numericKeys = [
    "brightness", "contrast", "saturation", "hue", "temperature", "tint",
    "exposure", "gamma", "highlights", "shadows", "vibrance",
    "redLift", "redGamma", "redGain",
    "greenLift", "greenGamma", "greenGain",
    "blueLift", "blueGamma", "blueGain",
  ];

  for (const key of numericKeys) {
    if (typeof p[key] !== "number") return false;
  }

  const curveKeys = ["masterCurve", "redCurve", "greenCurve", "blueCurve"];
  for (const key of curveKeys) {
    const curve = p[key];
    if (!Array.isArray(curve) || curve.length !== 5) return false;
    for (const pt of curve) {
      if (typeof pt !== "object" || pt === null) return false;
      if (typeof (pt as Record<string, unknown>).x !== "number") return false;
      if (typeof (pt as Record<string, unknown>).y !== "number") return false;
    }
  }

  return true;
}
