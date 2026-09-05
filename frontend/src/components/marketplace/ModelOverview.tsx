import React, { useState } from "react";
import {
  ArrowLeft,
  Cpu,
  Building2,
  MapPin,
  LayoutGrid,
  Database,
  GraduationCap,
  History,
  AlertTriangle,
  Layers,
  Sparkles,
} from "lucide-react";
import type { FLModel } from "@/lib/fl-service";
import type { SiteState } from "@/lib/marketplace-store";
import { useModelState } from "@/hooks/useMarketplace";
import { MetricCards } from "./MetricCards";
import { ConvergenceChart } from "./ConvergenceChart";
import { DataRequirements } from "./DataRequirements";
import { TrainingPanel } from "./TrainingPanel";
import { TrainingHistory } from "./TrainingHistory";

type Section = "overview" | "data" | "train" | "history";

const SECTIONS: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Model Architecture & Overview", icon: <LayoutGrid className="h-4 w-4" /> },
  { id: "data", label: "Data Requirements & Eligibility", icon: <Database className="h-4 w-4" /> },
  { id: "train", label: "Train & Contribute Rounds", icon: <GraduationCap className="h-4 w-4" /> },
  { id: "history", label: "Training History & Evaluation Traces", icon: <History className="h-4 w-4" /> },
];

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 text-xs">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono font-bold text-foreground">{value}</dd>
    </div>
  );
}

function HospitalsPanel({
  model,
  sites,
}: {
  model: FLModel;
  sites: SiteState[];
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card/90 backdrop-blur-md shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border/60 px-6 py-4 bg-muted/20">
        <Building2 className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground">Contributing Hospital Roster</h3>
        <span className="ml-auto text-xs text-muted-foreground font-mono">
          {sites.length} active site{sites.length === 1 ? "" : "s"}
        </span>
      </div>
      <ul className="divide-y divide-border/40">
        {sites.length === 0 ? (
          <li className="px-6 py-8 text-center text-xs text-muted-foreground">
            No hospital nodes registered yet for this model. Be the first hospital to stage local data!
          </li>
        ) : (
          sites.map((s) => (
            <li key={s.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors">
              <span
                className={`inline-flex h-10 w-12 shrink-0 items-center justify-center rounded-xl text-xs font-bold font-mono border ${
                  s.status === "filtered"
                    ? "border-rose-500/30 bg-rose-500/10 text-rose-500"
                    : s.status === "harmonized"
                    ? "border-blue-500/30 bg-blue-500/10 text-blue-500"
                    : s.status === "synced"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                    : "border-border bg-muted text-muted-foreground"
                }`}
              >
                {s.code}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="truncate text-xs font-bold text-foreground">{s.name}</div>
                  {s.adversarial && (
                    <span className="rounded-full bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-500">
                      Adversarial probe
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {s.region}
                  </span>
                  <span>·</span>
                  <span>{s.scanner}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-xs font-bold text-foreground">
                  {(s.samples || 0).toLocaleString()}
                </div>
                <div className="text-[10px] text-muted-foreground">Local Studies</div>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export function ModelOverview({
  model,
  onBack,
}: {
  model: FLModel;
  onBack: () => void;
}) {
  const [section, setSection] = useState<Section>("overview");
  const state = useModelState(model.id);

  if (!state) return null;

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-card px-4 py-2 text-xs font-bold text-foreground hover:bg-muted transition-all shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Model Catalog
        </button>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Modality:</span>
          <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 font-bold text-primary">
            {model.modality}
          </span>
        </div>
      </div>

      {/* Model Header */}
      <div className="glass-card flex flex-col gap-5 rounded-3xl border border-border/80 bg-white/90 dark:bg-card/90 p-6 md:p-8 backdrop-blur-xl shadow-md lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-purple-600 text-white shadow-lg shadow-primary/30">
            <Cpu className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-primary">
                {model.short_name}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{model.task}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground font-heading">
              {model.name}
            </h1>
            <p className="mt-2 max-w-3xl text-xs md:text-sm leading-relaxed text-muted-foreground">
              {model.description}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setSection("train")}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-purple-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-primary/25 hover:opacity-95 transition-all"
          >
            <GraduationCap className="h-4 w-4" />
            Train &amp; Contribute Rounds
          </button>
        </div>
      </div>

      {/* Real-time Metric Cards */}
      <MetricCards state={state} />

      {/* Navigation tabs */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-2 overflow-x-auto">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              section === s.id
                ? "bg-primary text-white shadow-md shadow-primary/25"
                : "border border-border/80 bg-card text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {s.icon}
            {s.label}
          </button>
        ))}
      </div>

      {/* Tab contents */}
      {section === "overview" && (
        <div className="space-y-6">
          <ConvergenceChart state={state} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Architecture specs */}
            <div className="rounded-2xl border border-border/80 bg-card/90 backdrop-blur-md shadow-sm p-6">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60 pb-3">
                <Cpu className="h-4 w-4 text-primary" />
                Network Architecture &amp; Target
              </div>
              <dl className="mt-3 divide-y divide-border/40">
                <SpecRow label="Architecture" value={model.architecture} />
                <SpecRow label="Trainable Parameters" value={model.parameters_count} />
                <SpecRow
                  label="Target Accuracy"
                  value={`${(model.target_accuracy * 100).toFixed(1)}%`}
                />
                <SpecRow
                  label="Base Benchmark"
                  value={`${(model.base_accuracy * 100).toFixed(1)}%`}
                />
                <SpecRow
                  label="Privacy Budget (ε max)"
                  value={`${model.epsilon_max.toFixed(1)}`}
                />
                <SpecRow
                  label="Max Convergence Rounds"
                  value={`${model.max_rounds}`}
                />
              </dl>

              <div className="mt-4 pt-4 border-t border-border/60">
                <div className="text-xs font-bold text-muted-foreground mb-2">Target Diagnostic Classes</div>
                <div className="flex flex-wrap gap-1.5">
                  {(model.classes || []).map((cls) => (
                    <span
                      key={cls}
                      className="rounded-lg border border-border/80 bg-muted/50 px-2.5 py-1 text-[11px] font-mono font-medium text-foreground"
                    >
                      {cls}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Hospitals roster */}
            <HospitalsPanel model={model} sites={state.sites} />
          </div>
        </div>
      )}

      {section === "data" && <DataRequirements model={model} />}

      {section === "train" && <TrainingPanel model={model} state={state} />}

      {section === "history" && <TrainingHistory />}
    </div>
  );
}

export default ModelOverview;
