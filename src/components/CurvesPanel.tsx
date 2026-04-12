"use client";

import { FilterParams, freshParams } from "@/lib/lut-engine";
import { Button } from "@/components/ui/button";
import CurveEditor from "./CurveEditor";

interface CurvesPanelProps {
  params: FilterParams;
  onChange: (params: FilterParams) => void;
}

type CurveKey = "masterCurve" | "redCurve" | "greenCurve" | "blueCurve";

const CURVES: { key: CurveKey; label: string; color: string }[] = [
  { key: "masterCurve", label: "Master", color: "#e4e4e7" },
  { key: "redCurve", label: "Red", color: "#ef4444" },
  { key: "greenCurve", label: "Green", color: "#22c55e" },
  { key: "blueCurve", label: "Blue", color: "#3b82f6" },
];

export default function CurvesPanel({ params, onChange }: CurvesPanelProps) {
  const resetAll = () => {
    onChange(freshParams());
  };

  return (
    <div className="flex h-full flex-col">
      <div className="hidden items-center justify-between border-b border-border p-4 md:flex">
        <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Curves</h3>
        <Button type="button" variant="ghost" size="xs" onClick={resetAll} className="text-muted-foreground">
          Reset all
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain p-3 md:p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
          {CURVES.map(({ key, label, color }) => (
            <div key={key} className="w-full">
              <CurveEditor
                label={label}
                points={params[key]}
                color={color}
                onChange={(pts) => onChange({ ...params, [key]: pts })}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
