"use client";

import { DEFAULT_CURVE } from "@/lib/lut-engine";
import { useEffect, useRef, useState } from "react";

interface CurveEditorProps {
  label: string;
  points: { x: number; y: number }[];
  onChange: (points: { x: number; y: number }[]) => void;
  color?: string;
}

export default function CurveEditor({
  label,
  points,
  onChange,
  color = "#8b5cf6",
}: CurveEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgSize, setSvgSize] = useState(130);
  const padding = 2;
  const plotSize = svgSize - padding * 2;

  // Responsive: fill container width on mobile
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        // On mobile, use full width (minus some padding). On desktop, keep 130.
        if (w < 200) {
          setSvgSize(Math.min(w - 4, 200));
        } else {
          setSvgSize(130);
        }
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const toSvgX = (v: number) => padding + v * plotSize;
  const toSvgY = (v: number) => padding + (1 - v) * plotSize;

  const handleDrag = (index: number, clientX: number, clientY: number, svgEl: SVGSVGElement | null) => {
    if (!svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left - padding) / plotSize));
    const y = Math.max(0, Math.min(1, 1 - (clientY - rect.top - padding) / plotSize));

    const newPoints = [...points];
    if (index === 0) {
      newPoints[0] = { x: 0, y };
    } else if (index === 4) {
      newPoints[4] = { x: 1, y };
    } else {
      const minX = index > 0 ? newPoints[index - 1].x + 0.01 : 0;
      const maxX = index < 4 ? newPoints[index + 1].x - 0.01 : 1;
      newPoints[index] = { x: Math.max(minX, Math.min(maxX, x)), y };
    }
    onChange(newPoints);
  };

  const pathD = (() => {
    const p = points;
    let d = `M ${toSvgX(p[0].x)} ${toSvgY(p[0].y)}`;
    for (let i = 1; i < p.length; i++) {
      const prev = p[i - 1];
      const curr = p[i];
      const cpx1 = toSvgX(prev.x + (curr.x - prev.x) * 0.4);
      const cpy1 = toSvgY(prev.y);
      const cpx2 = toSvgX(curr.x - (curr.x - prev.x) * 0.4);
      const cpy2 = toSvgY(curr.y);
      d += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${toSvgX(curr.x)} ${toSvgY(curr.y)}`;
    }
    return d;
  })();

  return (
    <div className="space-y-1" ref={containerRef}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-400">{label}</span>
        <button
          onClick={() =>
            onChange(DEFAULT_CURVE.map(p => ({ ...p })))
          }
          className="text-[10px] text-zinc-600 hover:text-accent transition-colors py-1 px-2"
        >
          Reset
        </button>
      </div>
      <svg
        width={svgSize}
        height={svgSize}
        viewBox={`0 0 ${svgSize} ${svgSize}`}
        className="rounded border border-border bg-surface cursor-crosshair w-full max-w-[200px]"
        style={{ touchAction: "none", aspectRatio: "1" }}
      >
        {/* Grid */}
        {[0.25, 0.5, 0.75].map((v) => (
          <g key={v}>
            <line
              x1={toSvgX(v)} y1={toSvgY(0)} x2={toSvgX(v)} y2={toSvgY(1)}
              stroke="#27272a" strokeWidth={0.5}
            />
            <line
              x1={toSvgX(0)} y1={toSvgY(v)} x2={toSvgX(1)} y2={toSvgY(v)}
              stroke="#27272a" strokeWidth={0.5}
            />
          </g>
        ))}
        {/* Diagonal reference */}
        <line
          x1={toSvgX(0)} y1={toSvgY(0)} x2={toSvgX(1)} y2={toSvgY(1)}
          stroke="#27272a" strokeWidth={0.5} strokeDasharray="3,3"
        />
        {/* Curve */}
        <path d={pathD} fill="none" stroke={color} strokeWidth={2} />
        {/* Control points — invisible larger hit area + visible small circle */}
        {points.map((p, i) => (
          <DraggablePoint
            key={i}
            cx={toSvgX(p.x)}
            cy={toSvgY(p.y)}
            color={color}
            onDrag={(cx, cy, el) => handleDrag(i, cx, cy, el)}
          />
        ))}
      </svg>
    </div>
  );
}

function DraggablePoint({
  cx,
  cy,
  color,
  onDrag,
}: {
  cx: number;
  cy: number;
  color: string;
  onDrag: (clientX: number, clientY: number, svg: SVGSVGElement | null) => void;
}) {
  let svgRef: SVGSVGElement | null = null;

  const handleDown = (e: React.PointerEvent<SVGGElement>) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    const svg = (e.target as Element).closest("svg");
    svgRef = svg;
  };

  const handleMove = (e: React.PointerEvent<SVGGElement>) => {
    if (e.buttons > 0) {
      onDrag(e.clientX, e.clientY, svgRef);
    }
  };

  return (
    <g
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      className="cursor-grab active:cursor-grabbing"
    >
      {/* Larger invisible hit target for touch */}
      <circle
        cx={cx}
        cy={cy}
        r={20}
        fill="transparent"
        stroke="none"
      />
      {/* Visible point */}
      <circle
        cx={cx}
        cy={cy}
        r={6}
        fill={color}
        stroke="#0c0c0f"
        strokeWidth={2}
      />
    </g>
  );
}
