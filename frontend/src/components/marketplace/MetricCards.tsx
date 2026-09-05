import React from "react";
import { ShieldCheck, Building2, TrendingUp, Waves } from "lucide-react";
import type { ModelRuntimeState } from "@/lib/marketplace-store";

function SemiGauge({ value }: { value: number }) {
  const radius = 46;
  const cx = 60;
  const cy = 60;
  const circumference = Math.PI * radius;
  const offset = circumference * (1 - Math.min(1, Math.max(0, value)));
  return (
    <svg viewBox="0 0 120 70" className="h-16 w-28 shrink-0" aria-hidden="true">
      <path
        d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.12"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
        fill="none"
        stroke="#6366f1"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
    </svg>
  );
}

function ProgressRing({ fraction }: { fraction: number }) {
  const radius = 26;
  const stroke = 6;
  const c = 2 * Math.PI * radius;
  const offset = c * (1 - Math.min(1, Math.max(0, fraction)));
  return (
    <svg viewBox="0 0 68 68" className="h-16 w-16 shrink-0" aria-hidden="true">
      <circle cx="34" cy="34" r={radius} fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth={stroke} />
      <circle
        cx="34"
        cy="34"
        r={radius}
        fill="none"
        stroke="#0ea5e9"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform="rotate(-90 34 34)"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text x="34" y="38" textAnchor="middle" className="fill-foreground text-[12px] font-bold font-mono">
        {Math.round(fraction * 100)}%
      </text>
    </svg>
  );
}

function MetricCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card/90 backdrop-blur-md p-5 shadow-sm hover:shadow-md transition-all">
      {children}
    </div>
  );
}

export function MetricCards({ state }: { state: ModelRuntimeState }) {
  const delta = state.accuracy - state.prevAccuracy;
  const synced = state.sites.filter((s) => s.status !== "filtered").length;
  const filtered = state.sites.filter((s) => s.status === "filtered").length;
  const epsilonFraction = state.epsilon / state.epsilonMax;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-indigo-500" />
            <span className="text-xs font-semibold uppercase tracking-wider">Global Accuracy</span>
          </div>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
              delta >= 0
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
            }`}
          >
            {delta >= 0 ? "+" : ""}
            {(delta * 100).toFixed(1)}% / round
          </span>
        </div>
        <div className="mt-3 flex items-end justify-between">
          <div className="text-3xl font-bold tracking-tight text-foreground">
            {(state.accuracy * 100).toFixed(1)}%
          </div>
          <SemiGauge value={state.accuracy} />
        </div>
      </MetricCard>

      <MetricCard>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Building2 className="h-4 w-4 text-blue-500" />
          <span className="text-xs font-semibold uppercase tracking-wider">Participating Sites</span>
        </div>
        <div className="mt-3 text-3xl font-bold tracking-tight text-foreground">{state.sites.length}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{synced} active</span>,{" "}
          <span className={filtered > 0 ? "text-rose-500 font-semibold" : ""}>{filtered} quarantined</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {state.sites.map((s) => (
            <span
              key={s.id}
              className={`inline-flex h-7 min-w-9 items-center justify-center rounded-lg px-2 text-[11px] font-bold border transition-all ${
                s.status === "filtered"
                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                  : s.status === "harmonized"
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                  : "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30"
              }`}
              title={`${s.name} (${s.scanner})`}
            >
              {s.code}
            </span>
          ))}
        </div>
      </MetricCard>

      <MetricCard>
        <div className="flex items-center gap-2 text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span className="text-xs font-semibold uppercase tracking-wider">Privacy Budget</span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold tracking-tight text-foreground font-mono">
              ε = {state.epsilon.toFixed(2)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              DP-SGD · {state.epsilonMax.toFixed(1)} ε max bound
            </div>
          </div>
          <ProgressRing fraction={epsilonFraction} />
        </div>
      </MetricCard>

      <MetricCard>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Waves className="h-4 w-4 text-sky-500" />
          <span className="text-xs font-semibold uppercase tracking-wider">Scanner Adaptation</span>
        </div>
        <div className="mt-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border ${
              state.mmd < 0.2
                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                state.mmd < 0.2 ? "bg-blue-500 animate-pulse" : "bg-amber-500 animate-ping"
              }`}
            />
            {state.mmd < 0.2 ? "Harmonized (FedBN)" : "Domain Shift Detected"}
          </span>
        </div>
        <div className="mt-3 text-xs text-muted-foreground font-mono">
          {state.mmd.toFixed(2)} MMD · {state.mmd < 0.2 ? "low domain drift" : "elevated vendor variance"}
        </div>
      </MetricCard>
    </div>
  );
}

export default MetricCards;
