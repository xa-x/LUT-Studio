"use client";

interface FilterSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  onChange: (value: number) => void;
  onReset: () => void;
}

export default function FilterSlider({
  label,
  value,
  min,
  max,
  step,
  defaultValue,
  onChange,
  onReset,
}: FilterSliderProps) {
  const isModified = Math.abs(value - defaultValue) > 0.001;

  return (
    <div className="group relative">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors">
          {label}
        </span>
        <div className="flex items-center gap-2">
          {isModified && (
            <button
              onClick={onReset}
              className="text-[10px] text-zinc-600 hover:text-accent transition-colors"
              title="Reset"
            >
              ↺
            </button>
          )}
          <span className="text-[11px] font-mono text-zinc-500 w-10 text-right">
            {value.toFixed(step < 1 ? 2 : 0)}
          </span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full"
      />
    </div>
  );
}
