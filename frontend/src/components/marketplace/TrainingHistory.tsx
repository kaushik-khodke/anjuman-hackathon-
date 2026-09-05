import React, { useState, useEffect } from "react";
import {
  History,
  CheckCircle2,
  XCircle,
  Clock,
  Database,
  Lock,
  ChevronDown,
  ChevronUp,
  Activity,
  Layers,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { getHospitalTrainingHistory, type FLTrainingJob } from "@/lib/fl-service";

export function TrainingHistory({ hospitalId }: { hospitalId?: string }) {
  const [history, setHistory] = useState<FLTrainingJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, [hospitalId]);

  async function loadHistory() {
    setIsLoading(true);
    try {
      const data = await getHospitalTrainingHistory(hospitalId);
      setHistory(data);
    } catch (e) {
      console.error("Failed to fetch training history:", e);
    } finally {
      setIsLoading(false);
    }
  }

  function toggleExpand(id: string) {
    setExpandedJobId(expandedJobId === id ? null : id);
  }

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-2xl border border-border/80 bg-white/90 dark:bg-card/90 p-5 backdrop-blur-xl shadow-sm">
        <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground font-heading">
              Hospital Training Contributions &amp; Evaluation Audit
            </h3>
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            {history.length} Record{history.length === 1 ? "" : "s"}
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-3 py-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            <Database className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="font-bold text-foreground">No Previous Training Runs Recorded</p>
            <p className="mt-1 max-w-sm mx-auto">
              When your hospital node trains on local datasets, the benchmark verification results and metrics will be tracked here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {history.map((job) => {
              const isAccepted = job.gate_decision === "ACCEPTED";
              const isExpanded = expandedJobId === job.id;
              const dateStr = job.created_at
                ? new Date(job.created_at).toLocaleString()
                : "Just now";

              return (
                <div key={job.id} className="py-3.5 space-y-3">
                  <div
                    onClick={() => toggleExpand(job.id)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-muted/30 p-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border ${
                          isAccepted
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                            : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {isAccepted ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <XCircle className="h-5 w-5" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground font-mono">
                            {job.model_id}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                              isAccepted
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                                : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {isAccepted ? "Accepted & Promoted" : "Rejected"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                          <span>Dataset: <strong className="text-foreground">{job.dataset_name}</strong></span>
                          <span>·</span>
                          <span>{job.sample_count} Samples</span>
                          <span>·</span>
                          <span>{job.epochs} Epochs</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 text-xs">
                      <div className="text-right">
                        <div className="font-mono font-black text-foreground">
                          {(job.candidate_accuracy * 100).toFixed(1)}% Acc
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          F1: {(job.candidate_f1 * 100).toFixed(1)}% · {job.duration_seconds}s
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-label="Toggle details"
                        className="p-1 text-muted-foreground hover:text-foreground"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details & Verification Breakdown */}
                  {isExpanded && (
                    <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3 text-xs animate-fadeIn">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-2">
                        <div className="text-muted-foreground">
                          <strong>Verification Reason:</strong> {job.gate_reason}
                        </div>
                        <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {dateStr}
                        </div>
                      </div>

                      {/* Metric Scorecard */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="p-2.5 rounded-lg bg-card border border-border/80 text-center">
                          <div className="text-[10px] text-muted-foreground uppercase font-bold">Accuracy</div>
                          <div className="text-sm font-mono font-black text-foreground">
                            {(job.candidate_accuracy * 100).toFixed(1)}%
                          </div>
                          <div className="text-[9px] text-muted-foreground">
                            Base: {(job.baseline_accuracy * 100).toFixed(1)}%
                          </div>
                        </div>

                        <div className="p-2.5 rounded-lg bg-card border border-border/80 text-center">
                          <div className="text-[10px] text-muted-foreground uppercase font-bold">F1-Score</div>
                          <div className="text-sm font-mono font-black text-primary">
                            {(job.candidate_f1 * 100).toFixed(1)}%
                          </div>
                          <div className="text-[9px] text-muted-foreground">Macro Average</div>
                        </div>

                        <div className="p-2.5 rounded-lg bg-card border border-border/80 text-center">
                          <div className="text-[10px] text-muted-foreground uppercase font-bold">Precision</div>
                          <div className="text-sm font-mono font-black text-emerald-600 dark:text-emerald-400">
                            {(job.candidate_precision * 100).toFixed(1)}%
                          </div>
                          <div className="text-[9px] text-muted-foreground">Positive Predictive</div>
                        </div>

                        <div className="p-2.5 rounded-lg bg-card border border-border/80 text-center">
                          <div className="text-[10px] text-muted-foreground uppercase font-bold">Recall / Sens.</div>
                          <div className="text-sm font-mono font-black text-indigo-600 dark:text-indigo-400">
                            {(job.candidate_recall * 100).toFixed(1)}%
                          </div>
                          <div className="text-[9px] text-muted-foreground">True Positive Rate</div>
                        </div>
                      </div>

                      {/* Cryptographic Hash Proof */}
                      {job.provenance_hash && (
                        <div className="flex items-center gap-2 pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                          <Lock className="w-3 h-3 text-primary shrink-0" />
                          <span className="font-bold">Provenance Hash:</span>
                          <span className="font-mono text-[10px] bg-muted px-2 py-0.5 rounded truncate">
                            {job.provenance_hash}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default TrainingHistory;
