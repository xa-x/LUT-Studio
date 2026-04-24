import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { luts } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";
import path from "path";
import fs from "fs";
import crypto from "crypto";

// Default curve points
const DEFAULT_CURVE = [
  { x: 0, y: 0 },
  { x: 0.25, y: 0.25 },
  { x: 0.5, y: 0.5 },
  { x: 0.75, y: 0.75 },
  { x: 1, y: 1 },
];

function freshParams(): Record<string, unknown> {
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
    masterCurve: DEFAULT_CURVE.map((p) => ({ ...p })),
    redCurve: DEFAULT_CURVE.map((p) => ({ ...p })),
    greenCurve: DEFAULT_CURVE.map((p) => ({ ...p })),
    blueCurve: DEFAULT_CURVE.map((p) => ({ ...p })),
  };
}

function makeParams(overrides: Record<string, unknown>) {
  return { ...freshParams(), ...overrides };
}

const SAMPLE_LUTS = [
  // === Cinematic / Creative ===
  {
    name: "Cinematic",
    description: "Warm cinematic look with lifted blacks and rich midtones",
    category: "cinematic",
    params: makeParams({ contrast: 1.08, saturation: 0.92, temperature: 0.05, shadows: -0.04, highlights: -0.04, gamma: 0.97, vibrance: 0.1 }),
  },
  {
    name: "Teal & Orange",
    description: "Blockbuster color grade — cool shadows, warm highlights",
    category: "cinematic",
    params: makeParams({ contrast: 1.12, saturation: 1.08, temperature: 0.1, tint: -0.06, shadows: -0.05, highlights: -0.03, redGain: 1.06, blueGain: 1.1, vibrance: 0.15 }),
  },
  {
    name: "Moody",
    description: "Dark, desaturated, and atmospheric",
    category: "cinematic",
    params: makeParams({ contrast: 1.22, saturation: 0.52, exposure: -0.18, shadows: -0.1, highlights: -0.08, temperature: -0.06, gamma: 0.94 }),
  },
  {
    name: "Film Noir",
    description: "High contrast black and white with deep shadows",
    category: "cinematic",
    params: makeParams({ contrast: 1.32, saturation: 0.28, shadows: -0.1, exposure: -0.15, highlights: -0.06, gamma: 0.92 }),
  },
  {
    name: "Punchy",
    description: "Vibrant and high-contrast — punchy colors that pop",
    category: "cinematic",
    params: makeParams({ contrast: 1.18, saturation: 1.22, vibrance: 0.22, gamma: 0.95, highlights: 0.02, shadows: -0.03 }),
  },

  // === Film / Vintage ===
  {
    name: "Vintage",
    description: "Faded analog look with warm tones and lifted blacks",
    category: "vintage",
    params: makeParams({ contrast: 0.9, saturation: 0.62, temperature: 0.16, tint: 0.05, shadows: 0.06, gamma: 1.08, vibrance: -0.08, redGain: 1.04, greenGain: 0.97 }),
  },
  {
    name: "Faded",
    description: "Soft, washed-out film look with gentle contrast",
    category: "vintage",
    params: makeParams({ contrast: 0.82, saturation: 0.65, brightness: 0.03, shadows: 0.07, highlights: -0.05, gamma: 1.1, vibrance: -0.08 }),
  },
  {
    name: "Matte",
    description: "Matte finish with lifted shadows and muted tones",
    category: "vintage",
    params: makeParams({ contrast: 0.88, saturation: 0.78, brightness: 0.02, shadows: 0.08, gamma: 1.06 }),
  },
  {
    name: "Warm Glow",
    description: "Soft warm light wrapping around the image",
    category: "vintage",
    params: makeParams({ temperature: 0.18, saturation: 1.06, highlights: 0.03, gamma: 0.97, shadows: 0.04, vibrance: 0.12, redGain: 1.04 }),
  },

  // === B&W ===
  {
    name: "B&W Film",
    description: "Classic black and white film simulation",
    category: "bw",
    params: makeParams({ saturation: 0, contrast: 1.18, gamma: 0.98, shadows: -0.03, highlights: -0.03 }),
  },
  {
    name: "High Key",
    description: "Bright, airy, and dreamy — high-key lighting effect",
    category: "bw",
    params: makeParams({ brightness: 0.06, contrast: 0.88, saturation: 0.88, highlights: 0.1, shadows: 0.05, gamma: 1.04, vibrance: 0.08 }),
  },

  // === Cool / Tone ===
  {
    name: "Cool Tone",
    description: "Cool blue tones with clean contrast",
    category: "cinematic",
    params: makeParams({ temperature: -0.16, saturation: 0.88, contrast: 1.06, tint: -0.03, blueGain: 1.05, vibrance: 0.08 }),
  },

  // === Fuji Film Sims ===
  {
    name: "Fuji Provia",
    description: "Fuji Provia — natural color reproduction with slight warmth",
    category: "fuji",
    params: makeParams({ contrast: 1.06, saturation: 1.06, vibrance: 0.08, temperature: 0.02, gamma: 0.99 }),
  },
  {
    name: "Fuji Velvia",
    description: "Fuji Velvia — vivid, saturated colors for landscapes",
    category: "fuji",
    params: makeParams({ contrast: 1.12, saturation: 1.28, vibrance: 0.22, greenGain: 1.04, blueGain: 1.06, gamma: 0.96 }),
  },
  {
    name: "Fuji Astia",
    description: "Fuji Astia — soft, portrait-friendly tones",
    category: "fuji",
    params: makeParams({ contrast: 0.94, saturation: 1.02, highlights: 0.04, shadows: 0.04, gamma: 1.02, vibrance: 0.05 }),
  },
  {
    name: "Fuji Classic Chrome",
    description: "Fuji Classic Chrome — muted, documentary-style color",
    category: "fuji",
    params: makeParams({ contrast: 1.04, saturation: 0.78, temperature: 0.06, tint: -0.06, shadows: 0.05, greenGain: 0.96, vibrance: 0.06 }),
  },
  {
    name: "Fuji Classic Neg",
    description: "Fuji Classic Neg — nostalgic negative film feel",
    category: "fuji",
    params: makeParams({ contrast: 0.95, saturation: 0.95, shadows: 0.08, temperature: 0.08, gamma: 1.04, highlights: -0.02 }),
  },
  {
    name: "Fuji Eterna",
    description: "Fuji Eterna — cinematic film stock with soft contrast",
    category: "fuji",
    params: makeParams({ contrast: 0.92, saturation: 0.72, shadows: 0.05, tint: -0.04, gamma: 1.03, highlights: -0.03 }),
  },
  {
    name: "Fuji Pro Neg Hi",
    description: "Fuji Pro Neg. Hi — punchy portrait film",
    category: "fuji",
    params: makeParams({ contrast: 1.08, saturation: 1.06, vibrance: 0.1, gamma: 0.98, shadows: 0.02 }),
  },
  {
    name: "Fuji Acros",
    description: "Fuji Acros — fine-grain black and white film",
    category: "fuji",
    params: makeParams({ saturation: 0, contrast: 1.2, gamma: 0.97, shadows: -0.04, highlights: -0.04 }),
  },
];

async function seed() {
  const DB_PATH = path.join(process.cwd(), "data", "lut-studio.db");
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const sqlite = new Database(DB_PATH);
  sqlite.run("PRAGMA journal_mode = WAL");

  // Create table if not exists
  sqlite.run(`
    CREATE TABLE IF NOT EXISTS luts (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'custom' NOT NULL,
      params TEXT NOT NULL,
      thumbnail_url TEXT,
      is_sample INTEGER DEFAULT 0 NOT NULL,
      is_published INTEGER DEFAULT 0 NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  const database = drizzle(sqlite);

  const now = new Date().toISOString();

  for (const lut of SAMPLE_LUTS) {
    const id = crypto.randomUUID();

    await database.insert(luts).values({
      id,
      name: lut.name,
      description: lut.description ?? null,
      category: lut.category,
      params: lut.params,
      thumbnailUrl: null,
      isSample: true,
      isPublished: true,
      createdAt: now,
      updatedAt: now,
    }).onConflictDoNothing().execute();
  }

  const result = sqlite.query("SELECT COUNT(*) as count FROM luts WHERE is_sample = 1").get() as { count: number } | null;
  console.log(`Seeded ${result?.count ?? 0} sample LUTs`);

  sqlite.close();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
