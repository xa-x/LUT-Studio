/** HEIC/HEIF from iPhones and similar — not drawable on canvas until decoded. */
export function isHeicLike(file: File): boolean {
  const name = file.name.toLowerCase();
  if (name.endsWith(".heic") || name.endsWith(".heif")) return true;
  const t = file.type.toLowerCase();
  return t === "image/heic" || t === "image/heif" || t === "image/heif-sequence";
}

/**
 * Returns an object URL suitable for `HTMLImageElement` / canvas (JPEG for HEIC).
 * Caller must `URL.revokeObjectURL` when done.
 * `heic2any` is loaded only on the client (dynamic import — avoids SSR `window` errors).
 */
export async function fileToImageObjectUrl(file: File): Promise<string> {
  if (!isHeicLike(file)) {
    return URL.createObjectURL(file);
  }

  const { default: heic2any } = await import("heic2any");
  const converted = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.92,
  });

  const blob = Array.isArray(converted) ? converted[0] : converted;
  return URL.createObjectURL(blob);
}
