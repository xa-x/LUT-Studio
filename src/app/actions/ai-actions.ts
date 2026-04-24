"use server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AIFilmAnalysisResult {
  params: Record<string, number>;
  filmName: string;
  description: string;
}

interface VisionResponse {
  filmName: string;
  description: string;
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
  redLift: number;
  redGamma: number;
  redGain: number;
  greenLift: number;
  greenGamma: number;
  greenGain: number;
  blueLift: number;
  blueGamma: number;
  blueGain: number;
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an expert colorist and film analyst. You analyze photographs to determine what film stock, color grading, or cinematic look was applied. You must respond with ONLY a JSON object — no markdown, no explanation outside the JSON.

Analyze the provided reference photo's color grading characteristics:
- Color temperature (warm vs cool)
- Contrast and tonality
- Saturation and vibrance
- Color shifts (lift/gamma/gain per channel)
- Highlight and shadow behavior
- Overall mood and aesthetic

If a "current image" is also provided, analyze how the reference look should be applied to transform the current image into the reference style. Focus on the difference between them.

Return a JSON object with exactly these fields and value ranges:
{
  "filmName": "string — the closest matching film stock or look name",
  "description": "string — brief description of the detected look (1-2 sentences)",
  "brightness": number,      // -0.5 to 0.5 (default 0)
  "contrast": number,        // 0.2 to 2 (default 1)
  "saturation": number,      // 0 to 2 (default 1)
  "hue": number,             // -0.5 to 0.5 (default 0)
  "temperature": number,     // -1 to 1 (default 0)
  "tint": number,            // -1 to 1 (default 0)
  "exposure": number,        // -2 to 2 (default 0)
  "gamma": number,           // 0.2 to 3 (default 1)
  "highlights": number,      // -0.5 to 0.5 (default 0)
  "shadows": number,         // -0.5 to 0.5 (default 0)
  "vibrance": number,        // -1 to 1 (default 0)
  "redLift": number,         // -0.5 to 0.5 (default 0)
  "redGamma": number,        // 0.2 to 3 (default 1)
  "redGain": number,         // 0 to 3 (default 1)
  "greenLift": number,       // -0.5 to 0.5 (default 0)
  "greenGamma": number,      // 0.2 to 3 (default 1)
  "greenGain": number,       // 0 to 3 (default 1)
  "blueLift": number,        // -0.5 to 0.5 (default 0)
  "blueGamma": number,       // 0.2 to 3 (default 1)
  "blueGain": number          // 0 to 3 (default 1)
}

Important:
- Produce subtle, realistic adjustments — not extreme values
- Neutral/identity values are: brightness=0, contrast=1, saturation=1, hue=0, temperature=0, tint=0, exposure=0, gamma=1, highlights=0, shadows=0, vibrance=0, redLift=0, redGamma=1, redGain=1, greenLift=0, greenGamma=1, greenGain=1, blueLift=0, blueGamma=1, blueGain=1
- Clamp ALL values within the specified ranges
- Respond with ONLY the raw JSON object, no code fences or additional text`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getBaseUrl(): string {
  return process.env.AI_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:11434/v1";
}

function getModel(): string {
  return process.env.AI_MODEL ?? "gemma4:latest";
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampResponse(raw: VisionResponse): VisionResponse {
  return {
    ...raw,
    brightness: clamp(raw.brightness, -0.5, 0.5),
    contrast: clamp(raw.contrast, 0.2, 2),
    saturation: clamp(raw.saturation, 0, 2),
    hue: clamp(raw.hue, -0.5, 0.5),
    temperature: clamp(raw.temperature, -1, 1),
    tint: clamp(raw.tint, -1, 1),
    exposure: clamp(raw.exposure, -2, 2),
    gamma: clamp(raw.gamma, 0.2, 3),
    highlights: clamp(raw.highlights, -0.5, 0.5),
    shadows: clamp(raw.shadows, -0.5, 0.5),
    vibrance: clamp(raw.vibrance, -1, 1),
    redLift: clamp(raw.redLift, -0.5, 0.5),
    redGamma: clamp(raw.redGamma, 0.2, 3),
    redGain: clamp(raw.redGain, 0, 3),
    greenLift: clamp(raw.greenLift, -0.5, 0.5),
    greenGamma: clamp(raw.greenGamma, 0.2, 3),
    greenGain: clamp(raw.greenGain, 0, 3),
    blueLift: clamp(raw.blueLift, -0.5, 0.5),
    blueGamma: clamp(raw.blueGamma, 0.2, 3),
    blueGain: clamp(raw.blueGain, 0, 3),
  };
}

// ---------------------------------------------------------------------------
// Truncated JSON Repair
// ---------------------------------------------------------------------------

const DEFAULT_VALUES: Record<string, number> = {
  brightness: 0, contrast: 1, saturation: 1, hue: 0, temperature: 0,
  tint: 0, exposure: 0, gamma: 1, highlights: 0, shadows: 0, vibrance: 0,
  redLift: 0, redGamma: 1, redGain: 1, greenLift: 0, greenGamma: 1,
  greenGain: 1, blueLift: 0, blueGamma: 1, blueGain: 1,
};

const NUMERIC_FIELDS = Object.keys(DEFAULT_VALUES);

function repairTruncatedJson(raw: string): VisionResponse | null {
  // Try to close the JSON and fill missing fields with defaults
  let s = raw.trim();

  // Remove trailing incomplete key-value pair (partial string/number)
  s = s.replace(/,?\s*"[^"]*"?\s*:?\s*$/, "");

  // Count brackets
  const openBraces = (s.match(/{/g) || []).length;
  const closeBraces = (s.match(/}/g) || []).length;
  const missing = openBraces - closeBraces;

  // Close the object
  for (let i = 0; i < missing; i++) s += "}";

  let partial: Record<string, unknown>;
  try {
    partial = JSON.parse(s);
  } catch {
    return null;
  }

  // Ensure required string fields
  if (!partial.filmName) partial.filmName = "Unknown Film Look";
  if (!partial.description) partial.description = "AI-detected color grading";

  // Fill missing numeric fields with defaults
  for (const field of NUMERIC_FIELDS) {
    if (typeof partial[field] !== "number") {
      (partial as Record<string, unknown>)[field] = DEFAULT_VALUES[field];
    }
  }

  return partial as unknown as VisionResponse;
}

// ---------------------------------------------------------------------------
// Server Action
// ---------------------------------------------------------------------------

/**
 * Analyze a reference photo's color grading via a vision model and return
 * matching filter params that can be applied to reproduce the look.
 *
 * @param base64Image — base64-encoded reference image (with or without data URI prefix)
 * @param currentImageBase64 — optional base64-encoded current image for comparison
 */
export async function analyzeFilmLook(
  base64Image: string,
  currentImageBase64?: string,
): Promise<AIFilmAnalysisResult> {
  const baseUrl = getBaseUrl();
  const model = getModel();

  // Strip data URI prefix if present
  const stripPrefix = (s: string) => s.replace(/^data:[^;]+;base64,/, "");
  const refData = stripPrefix(base64Image);

  // Build the user message content with reference photo (+ optional current image)
  const userContent: Array<{ type: string; text?: string; image_url?: { url: string; detail?: string } }> = [];

  // If we have a current image, show both for comparison
  if (currentImageBase64) {
    const curData = stripPrefix(currentImageBase64);
    userContent.push({
      type: "image_url",
      image_url: { url: `data:image/jpeg;base64,${curData}`, detail: "low" },
    });
    userContent.push({
      type: "text",
      text: "FIRST image = current photo being edited. SECOND image = reference with the desired film look.",
    });
    userContent.push({
      type: "image_url",
      image_url: { url: `data:image/jpeg;base64,${refData}`, detail: "high" },
    });
    userContent.push({
      type: "text",
      text: "Analyze the reference (second) photo's color grading. Return JSON adjustments to transform the current (first) photo to match.",
    });
  } else {
    // Reference only
    userContent.push({
      type: "image_url",
      image_url: { url: `data:image/jpeg;base64,${refData}`, detail: "high" },
    });
    userContent.push({
      type: "text",
      text: "Analyze the color grading and film look of this photo. Return the JSON matching the specified schema.",
    });
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Ollama doesn't require an API key; OpenAI-compatible services do
  const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      max_tokens: 4096,
      temperature: 0.3,
      stream: false,
      options: {
        num_ctx: 8192,
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "unknown error");
    throw new Error(
      `Vision API error (${response.status}): ${text}`,
    );
  }

  const json = await response.json();
  const content: string | undefined = json.choices?.[0]?.message?.content
    || json.message?.content; // Ollama can return either format

  if (!content) {
    throw new Error("No content returned from vision model");
  }

  // Extract JSON from response (handle potential markdown code fences)
  let jsonStr = content.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1]!.trim();
  }

  // Attempt to parse; if truncated, try to repair
  let parsed: VisionResponse;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    // Model may have truncated at max_tokens — try to repair
    const repaired = repairTruncatedJson(jsonStr);
    if (!repaired) {
      throw new Error(`Failed to parse vision model response as JSON: ${jsonStr.slice(0, 200)}`);
    }
    parsed = repaired;
  }

  // Validate required fields exist
  if (!parsed.filmName || !parsed.description) {
    throw new Error("Vision model response missing filmName or description");
  }

  const clamped = clampResponse(parsed);

  return {
    params: {
      brightness: clamped.brightness,
      contrast: clamped.contrast,
      saturation: clamped.saturation,
      hue: clamped.hue,
      temperature: clamped.temperature,
      tint: clamped.tint,
      exposure: clamped.exposure,
      gamma: clamped.gamma,
      highlights: clamped.highlights,
      shadows: clamped.shadows,
      vibrance: clamped.vibrance,
      redLift: clamped.redLift,
      redGamma: clamped.redGamma,
      redGain: clamped.redGain,
      greenLift: clamped.greenLift,
      greenGamma: clamped.greenGamma,
      greenGain: clamped.greenGain,
      blueLift: clamped.blueLift,
      blueGamma: clamped.blueGamma,
      blueGain: clamped.blueGain,
    },
    filmName: clamped.filmName,
    description: clamped.description,
  };
}
