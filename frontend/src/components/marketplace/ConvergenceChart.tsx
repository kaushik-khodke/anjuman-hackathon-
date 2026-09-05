import React from "react";
import type { ModelRuntimeState } from "@/lib/marketplace-store";

export function ConvergenceChart({ state }: { state: ModelRuntimeState }) {
  const history = state.accuracyHistory;
  const width = 520;
  const height = 200;
  const padX = 12;
  const padY = 18;

  const minV = 0.6;
  const maxV = 1.0;

  const points = history.map((v, i) => {
    const x = padX + (i / Math.max(history.length - 1, 1)) * (width - padX * 2);
    const y = padY + (1 - (v - minV) / (maxV - minV)) * (height - padY * 2);
    return [x, y] as const;
  });

  const linePath = points
    .map((p, i) => {
      if (i === 0) return `M ${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
      const prev = points[i - 1];
      const cx = (prev[0] + p[0]) / 2;
      return `C ${cx.toFixed(1)} ${prev[1].toFixed(1)} ${cx.toFixed(1)} ${p[1].toFixed(1)} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
    })
    .join(" ");

  const areaPath =
    points.length > 1
      ? `${linePath} L ${points[points.length - 1][0].toFixed(1)} ${height - padY} L ${points[0][0].toFixed(1)} ${height - padY} Z`
      : "";

  return (
    <div className="rounded-2xl border border-border/80 bg-card/90 backdrop-blur-md p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground">Convergence Trajectory</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Global validation accuracy per round</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground font-medium">Current Loss</div>
          <div className="font-mono text-lg font-bold text-foreground">{state.loss.toFixed(3)}</div>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-4 h-52 w-full overflow-visible"
        preserveAspectRatio="none"
        role="img"
        aria-label="Accuracy convergence curve"
      >
        <defs>
          <linearGradient id="convFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        {[0.65, 0.75, 0.85, 0.95].map((g) => {
          const y = padY + (1 - (g - minV) / (maxV - minV)) * (height - padY * 2);
          return (
            <g key={g}>
              <line x1={padX} y1={y} x2={width - padX} y2={y} stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
              <text x={padX} y={y - 3} className="fill-muted-foreground text-[9px] font-mono">
                {Math.round(g * 100)}%
              </text>
            </g>
          );
        })}
        {areaPath && <path d={areaPath} fill="url(#convFill)" />}
        <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.length > 0 && (
          <circle
            cx={points[points.length - 1][0]}
            cy={points[points.length - 1][1]}
            r="4.5"
            fill="#6366f1"
            stroke="#ffffff"
            strokeWidth="2"
          />
        )}
      </svg>
      <div className="mt-2 text-xs text-muted-foreground flex items-center justify-between">
        <span>
          Round <span className="font-bold text-foreground">{state.round}</span> of {state.maxRounds}
        </span>
        <span className="font-mono text-[11px] text-indigo-500 dark:text-indigo-400 font-semibold">
          Current AUC: {(state.accuracy * 100).toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

export default ConvergenceChart;
