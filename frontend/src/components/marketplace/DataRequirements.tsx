import React from "react";
import { Database, CheckCircle2, Layers, ShieldCheck } from "lucide-react";
import type { FLModel } from "@/lib/fl-service";

export function DataRequirements({ model }: { model: FLModel }) {
  const reqs = model.data_requirements || [];
  const prep = model.preprocessing_steps || [];

  return (
    <div className="rounded-2xl border border-border/80 bg-card/90 backdrop-blur-md shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border/60 px-6 py-4 bg-muted/20">
        <Database className="h-4 w-4 text-indigo-500" />
        <h3 className="text-sm font-bold text-foreground">Data Requirements &amp; Eligibility</h3>
      </div>

      <div className="grid grid-cols-1 gap-px bg-border/40 md:grid-cols-2">
        {/* Input spec */}
        <div className="bg-card p-6">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Layers className="h-4 w-4 text-indigo-500" />
            Input Tensor Spec
          </div>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between items-center py-1 border-b border-border/30">
              <dt className="text-muted-foreground">Resolution</dt>
              <dd className="font-mono font-semibold text-foreground">{model.input_spec?.resolution || "224 × 224"}</dd>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-border/30">
              <dt className="text-muted-foreground">Channels</dt>
              <dd className="font-mono font-semibold text-foreground">{model.input_spec?.channels || "1 (grayscale)"}</dd>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-border/30">
              <dt className="text-muted-foreground">File Format</dt>
              <dd className="font-mono font-semibold text-foreground">{model.input_spec?.format || "DICOM / PNG"}</dd>
            </div>
            <div className="flex justify-between items-center py-1">
              <dt className="text-muted-foreground">Min. Local Cohort</dt>
              <dd className="font-mono font-semibold text-foreground">{(model.min_samples || 100).toLocaleString()} studies</dd>
            </div>
          </dl>
        </div>

        {/* Eligibility requirements */}
        <div className="bg-card p-6">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Eligibility Checklist
          </div>
          <ul className="mt-4 space-y-2.5 text-sm">
            {reqs.map((req) => (
              <li key={req.label} className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <span className="text-muted-foreground leading-relaxed">
                  <span className="font-bold text-foreground">{req.label}:</span> {req.value}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Preprocessing */}
      <div className="border-t border-border/60 p-6 bg-card">
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Local Preprocessing Pipeline (Runs completely on hospital node)
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {prep.map((step, i) => (
            <span
              key={step}
              className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-muted/40 px-3 py-2 text-xs font-medium text-foreground"
            >
              <span className="font-mono text-[10px] font-bold text-indigo-500 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                0{i + 1}
              </span>
              {step}
            </span>
          ))}
        </div>
      </div>

      {/* Privacy note */}
      <div className="flex items-start gap-3 border-t border-emerald-500/30 bg-emerald-500/10 p-6">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
        <p className="text-xs leading-relaxed text-emerald-800 dark:text-emerald-300">
          <strong className="font-bold">Zero Raw Image Exposure Invariant:</strong> Raw medical images and patient DICOM records never leave your secure hospital perimeter. All preprocessing and gradient steps run on your local infrastructure; only differentially-private weight updates (DP-SGD) with gradient clipping are transmitted to the coordinator.
        </p>
      </div>
    </div>
  );
}

export default DataRequirements;
