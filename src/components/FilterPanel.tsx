"use client";

import { FilterParams, freshParams, cloneDefaultCurves } from "@/lib/lut-engine";
import { LOOK_PRESETS, FUJI_PRESETS } from "@/lib/presets";
import type { PresetItem } from "@/lib/presets";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";

interface FilterPanelProps {
  params: FilterParams;
  onChange: (params: FilterParams) => void;
}

export default function FilterPanel({ params, onChange }: FilterPanelProps) {
  const update = (key: keyof FilterParams, value: number) => {
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
          <Button type="button" variant="ghost" size="xs" onClick={resetAll} aria-label="Reset all adjustments" className="text-muted-foreground">
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
              aria-label={`Apply ${preset.name} preset`}
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
              aria-label={`Apply ${preset.name} preset`}
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
                      aria-label={`${ctrl.label}: ${(params[ctrl.key] as number).toFixed(2)}`}
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
