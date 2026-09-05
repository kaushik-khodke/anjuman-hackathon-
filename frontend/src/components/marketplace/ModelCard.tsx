import React from "react";
import { ArrowUpRight, Building2, Users } from "lucide-react";
import type { FLModel } from "@/lib/fl-service";
import { useModelState } from "@/hooks/useMarketplace";

const MODALITY_STYLES: Record<string, string> = {
  "Chest X-ray": "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
  "Chest CT Scan": "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30",
  "Cardiac MRI": "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
  Dermatoscopy: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
  "Breast Ultrasound": "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30",
  "Retinal Fundus": "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  "Blood Microscopy": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  "Abdominal CT": "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
};

const STATUS_STYLES: Record<string, string> = {
  recruiting: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  training: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
  converged: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
};

const STATUS_LABEL: Record<string, string> = {
  recruiting: "Recruiting Sites",
  training: "Training Live",
  converged: "Converged Checkpoint",
};

export function ModelCard({
  model,
  onOpen,
}: {
  model: FLModel;
  onOpen: (id: string) => void;
}) {
  const runtime = useModelState(model.id);
  const accuracy = runtime?.accuracy ?? model.current_accuracy ?? model.base_accuracy;
  const round = runtime?.round ?? model.current_round ?? 0;
  const isTraining = runtime?.isTraining ?? false;
  const sites = runtime?.sites ?? [];
  const totalSamples = sites.reduce((sum, s) => sum + (s.samples || 0), 0);
  const hospitalCount = sites.length > 0 ? sites.length : 1;

  return (
    <button
      type="button"
      onClick={() => onOpen(model.id)}
      className="group flex flex-col rounded-2xl border border-border/80 bg-card/90 backdrop-blur-md p-6 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
    >
      <div className="flex items-start justify-between gap-3 w-full">
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold border ${
            MODALITY_STYLES[model.modality] ?? "bg-muted text-muted-foreground border-border"
          }`}
        >
          {model.modality}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold border ${
            STATUS_STYLES[model.status] || STATUS_STYLES.recruiting
          }`}
        >
          {isTraining && (
            <span className="h-1.5 w-1.5 animate-ping rounded-full bg-current" />
          )}
          {isTraining ? "Training Live" : STATUS_LABEL[model.status] || "Recruiting Sites"}
        </span>
      </div>

      <div className="mt-4 flex-1">
        <h3 className="text-base font-bold tracking-tight text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {model.name}
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground line-clamp-2">
          {model.summary}
        </p>
      </div>

      <div className="mt-5 flex items-end justify-between w-full">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Global Accuracy
          </div>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-black tracking-tight text-foreground font-mono">
              {(accuracy * 100).toFixed(1)}%
            </span>
            <span className="text-xs text-muted-foreground font-mono">· Rd {round}</span>
          </div>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <div className="font-mono font-bold text-foreground">
            {model.architecture.split(" ")[0]}
          </div>
          <div className="text-[11px] opacity-80">{model.parameters_count} params</div>
        </div>
      </div>

      {/* Accuracy track */}
      <div className="mt-3.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500"
          style={{ width: `${Math.min(100, ((accuracy - 0.5) / 0.5) * 100)}%` }}
        />
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-4 w-full">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-indigo-500" />
            {hospitalCount} Hospital{hospitalCount > 1 ? "s" : ""}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-emerald-500" />
            {totalSamples > 0 ? `${totalSamples.toLocaleString()} Studies` : `Min ${model.min_samples} req.`}
          </span>
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform">
          Open Model
          <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </button>
  );
}

export default ModelCard;
