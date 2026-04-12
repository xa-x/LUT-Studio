"use client";

import { FilterParams, freshParams, cloneDefaultCurves, DEFAULT_CURVE } from "@/lib/lut-engine";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";

interface FilterPanelProps {
  params: FilterParams;
  onChange: (params: FilterParams) => void;
}

type PresetItem = { name: string; params: Partial<FilterParams> };

/** Creative looks — tuned for natural starting points (not extreme posterization). */
const LOOK_PRESETS: PresetItem[] = [
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
const FUJI_PRESETS: PresetItem[] = [
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

export default function FilterPanel({ params, onChange }: FilterPanelProps) {
  const update = (key: keyof FilterParams, value: number | typeof DEFAULT_CURVE) => {
    onChange({ ...params, [key]: value });
  };

  const applyPreset = (preset: PresetItem) => {
    onChange({
      ...freshParams(),
      ...preset.params,
      ...cloneDefaultCurves(),
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
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-3 md:p-4">
        <div className="mb-2 flex items-center justify-between md:mb-3">
          <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Presets
          </h3>
          <Button type="button" variant="ghost" size="xs" onClick={resetAll} className="text-muted-foreground">
            Reset All
          </Button>
        </div>
        <p className="mb-2 text-[10px] text-muted-foreground md:text-[11px]">
          Looks reset all sliders and curves to defaults, then apply only the values below.
        </p>
        <h4 className="mb-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
          Looks
        </h4>
        <div className="mb-3 grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4 md:gap-1.5">
          {LOOK_PRESETS.map((preset) => (
            <Button
              key={preset.name}
              type="button"
              variant="outline"
              size="xs"
              className="h-auto min-h-8 px-1.5 py-2 text-[10px] whitespace-normal md:text-[11px]"
              onClick={() => applyPreset(preset)}
            >
              {preset.name}
            </Button>
          ))}
        </div>
        <h4 className="mb-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
          Fuji-inspired
        </h4>
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4 md:gap-1.5">
          {FUJI_PRESETS.map((preset) => (
            <Button
              key={preset.name}
              type="button"
              variant="outline"
              size="xs"
              className="h-auto min-h-8 px-1.5 py-2 text-[10px] whitespace-normal md:text-[11px]"
              onClick={() => applyPreset(preset)}
            >
              {preset.name}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain p-3 md:p-4">
        <div className="flex flex-col gap-4 md:gap-5">
          {sliderSections.map((section, si) => (
            <div key={section.title}>
              {si > 0 ? <Separator className="mb-4 md:mb-5" /> : null}
              <h3 className="mb-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase md:mb-3">
                {section.title}
              </h3>
              <div className="flex flex-col gap-3 md:gap-4">
                {section.controls.map((ctrl) => (
                  <div key={ctrl.key} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                    <span className="w-14 shrink-0 text-[10px] text-muted-foreground md:w-16 md:text-[11px]">
                      {ctrl.label}
                    </span>
                    <Slider
                      className="min-h-8 flex-1 py-1"
                      min={ctrl.min}
                      max={ctrl.max}
                      step={ctrl.step}
                      value={[params[ctrl.key] as number]}
                      onValueChange={(v) => update(ctrl.key, v[0] ?? ctrl.default)}
                    />
                    <span className="w-10 shrink-0 text-right font-mono text-[9px] text-muted-foreground md:text-[10px]">
                      {(params[ctrl.key] as number).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
