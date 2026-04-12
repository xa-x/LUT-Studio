"use client";

import { FilterParams, freshParams, DEFAULT_PARAMS, DEFAULT_CURVE } from "@/lib/lut-engine";

interface FilterPanelProps {
  params: FilterParams;
  onChange: (params: FilterParams) => void;
}

const PRESETS: { name: string; params: Partial<FilterParams> }[] = [
  {
    name: "Cinematic",
    params: {
      contrast: 1.15,
      saturation: 0.85,
      temperature: 0.08,
      shadows: -0.03,
      highlights: -0.05,
      gamma: 0.95,
      vibrance: 0.15,
    },
  },
  {
    name: "Teal & Orange",
    params: {
      contrast: 1.2,
      saturation: 1.1,
      temperature: 0.12,
      tint: -0.08,
      shadows: -0.05,
      highlights: -0.03,
      redGain: 1.1,
      blueLift: 0.02,
      blueGain: 1.15,
      vibrance: 0.2,
    },
  },
  {
    name: "Vintage",
    params: {
      contrast: 0.88,
      saturation: 0.55,
      temperature: 0.2,
      tint: 0.06,
      shadows: 0.08,
      gamma: 1.12,
      vibrance: -0.1,
      redGain: 1.05,
      blueLift: 0.03,
      greenGain: 0.95,
    },
  },
  {
    name: "Moody",
    params: {
      contrast: 1.35,
      saturation: 0.45,
      exposure: -0.25,
      shadows: -0.08,
      highlights: -0.1,
      temperature: -0.08,
      gamma: 0.92,
    },
  },
  {
    name: "Warm Glow",
    params: {
      temperature: 0.22,
      saturation: 1.1,
      highlights: 0.04,
      gamma: 0.96,
      shadows: 0.03,
      vibrance: 0.15,
      redGain: 1.05,
    },
  },
  {
    name: "Cool Tone",
    params: {
      temperature: -0.2,
      saturation: 0.85,
      contrast: 1.08,
      tint: -0.04,
      highlights: -0.02,
      blueGain: 1.08,
      vibrance: 0.1,
    },
  },
  {
    name: "B&W Film",
    params: {
      saturation: 0,
      contrast: 1.25,
      gamma: 0.97,
      shadows: -0.02,
      highlights: -0.03,
    },
  },
  {
    name: "High Key",
    params: {
      brightness: 0.08,
      contrast: 0.82,
      saturation: 0.85,
      highlights: 0.12,
      shadows: 0.06,
      gamma: 1.05,
      vibrance: 0.1,
    },
  },
  {
    name: "Film Noir",
    params: {
      contrast: 1.45,
      saturation: 0.25,
      shadows: -0.12,
      exposure: -0.2,
      highlights: -0.08,
      gamma: 0.9,
    },
  },
  {
    name: "Faded",
    params: {
      contrast: 0.78,
      saturation: 0.6,
      brightness: 0.04,
      shadows: 0.08,
      highlights: -0.06,
      gamma: 1.15,
      vibrance: -0.1,
      redLift: 0.02,
      greenLift: 0.01,
      blueLift: 0.03,
    },
  },
  {
    name: "Punchy",
    params: {
      contrast: 1.3,
      saturation: 1.35,
      vibrance: 0.3,
      gamma: 0.93,
      highlights: 0.03,
      shadows: -0.04,
    },
  },
  {
    name: "Matte",
    params: {
      contrast: 0.85,
      saturation: 0.75,
      brightness: 0.03,
      shadows: 0.1,
      gamma: 1.08,
      redLift: 0.02,
      blueLift: 0.01,
    },
  },
];

export default function FilterPanel({ params, onChange }: FilterPanelProps) {
  const update = (key: keyof FilterParams, value: number | typeof DEFAULT_CURVE) => {
    onChange({ ...params, [key]: value });
  };

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    onChange({
      ...DEFAULT_PARAMS,
      ...preset.params,
      masterCurve: [...DEFAULT_CURVE],
      redCurve: [...DEFAULT_CURVE],
      greenCurve: [...DEFAULT_CURVE],
      blueCurve: [...DEFAULT_CURVE],
    });
  };

  const resetAll = () => {
    onChange(freshParams());
  };

  const sliderSections = [
    {
      title: "Light",
      controls: [
        { key: "exposure" as const, label: "Exposure", min: -2, max: 2, step: 0.01, default: 0 },
        { key: "brightness" as const, label: "Brightness", min: -0.5, max: 0.5, step: 0.01, default: 0 },
        { key: "contrast" as const, label: "Contrast", min: 0.2, max: 2, step: 0.01, default: 1 },
        { key: "gamma" as const, label: "Gamma", min: 0.2, max: 3, step: 0.01, default: 1 },
        { key: "highlights" as const, label: "Highlights", min: -0.5, max: 0.5, step: 0.01, default: 0 },
        { key: "shadows" as const, label: "Shadows", min: -0.5, max: 0.5, step: 0.01, default: 0 },
      ],
    },
    {
      title: "Color",
      controls: [
        { key: "saturation" as const, label: "Saturation", min: 0, max: 2, step: 0.01, default: 1 },
        { key: "vibrance" as const, label: "Vibrance", min: -1, max: 1, step: 0.01, default: 0 },
        { key: "hue" as const, label: "Hue", min: -0.5, max: 0.5, step: 0.01, default: 0 },
        { key: "temperature" as const, label: "Temperature", min: -1, max: 1, step: 0.01, default: 0 },
        { key: "tint" as const, label: "Tint", min: -1, max: 1, step: 0.01, default: 0 },
      ],
    },
    {
      title: "Red",
      controls: [
        { key: "redLift" as const, label: "Lift", min: -0.5, max: 0.5, step: 0.01, default: 0 },
        { key: "redGamma" as const, label: "Gamma", min: 0.2, max: 3, step: 0.01, default: 1 },
        { key: "redGain" as const, label: "Gain", min: 0, max: 3, step: 0.01, default: 1 },
      ],
    },
    {
      title: "Green",
      controls: [
        { key: "greenLift" as const, label: "Lift", min: -0.5, max: 0.5, step: 0.01, default: 0 },
        { key: "greenGamma" as const, label: "Gamma", min: 0.2, max: 3, step: 0.01, default: 1 },
        { key: "greenGain" as const, label: "Gain", min: 0, max: 3, step: 0.01, default: 1 },
      ],
    },
    {
      title: "Blue",
      controls: [
        { key: "blueLift" as const, label: "Lift", min: -0.5, max: 0.5, step: 0.01, default: 0 },
        { key: "blueGamma" as const, label: "Gamma", min: 0.2, max: 3, step: 0.01, default: 1 },
        { key: "blueGain" as const, label: "Gain", min: 0, max: 3, step: 0.01, default: 1 },
      ],
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Presets */}
      <div className="p-3 md:p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2 md:mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Presets
          </h3>
          <button
            onClick={resetAll}
            className="text-[11px] text-zinc-600 hover:text-accent transition-colors py-1 px-2"
          >
            Reset All
          </button>
        </div>
        <div className="grid grid-cols-4 gap-1 md:gap-1.5">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              className="px-1.5 py-2 md:px-2 md:py-1.5 text-[10px] md:text-[11px] font-medium rounded-md bg-surface hover:bg-surface-hover text-zinc-400 hover:text-zinc-200 transition-all border border-transparent hover:border-border active:scale-95"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Sliders */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4 md:space-y-5 overscroll-contain">
        {sliderSections.map((section) => (
          <div key={section.title}>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600 mb-2 md:mb-3">
              {section.title}
            </h3>
            <div className="space-y-1 md:space-y-3">
              {section.controls.map((ctrl) => (
                <div key={ctrl.key} className="flex items-center gap-2 md:gap-3 py-0.5">
                  <span className="text-[10px] md:text-[11px] text-zinc-500 w-14 md:w-16 shrink-0">
                    {ctrl.label}
                  </span>
                  <input
                    type="range"
                    min={ctrl.min}
                    max={ctrl.max}
                    step={ctrl.step}
                    value={params[ctrl.key] as number}
                    onChange={(e) => update(ctrl.key, parseFloat(e.target.value))}
                    className="flex-1 slider-mobile"
                  />
                  <span className="text-[9px] md:text-[10px] font-mono text-zinc-600 w-10 text-right shrink-0">
                    {(params[ctrl.key] as number).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
