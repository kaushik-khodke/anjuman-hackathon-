import React, { useRef, useState, useEffect } from "react";
import {
  Play,
  Loader2,
  ZapOff,
  Sliders,
  RotateCcw,
  ShieldCheck,
  GraduationCap,
  UploadCloud,
  FileCheck2,
  X,
  Lock,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  TrendingUp,
  Activity,
  Layers,
  Terminal,
  AlertTriangle,
  FileWarning,
  Globe,
  Copy,
  Check,
  ExternalLink,
  Download,
} from "lucide-react";
import type { FLModel, FLTrainingJob } from "@/lib/fl-service";
import type { ModelRuntimeState } from "@/lib/marketplace-store";
import {
  startBackendTrainingJob,
  streamTrainingProgress,
  upsertMyHospitalNode,
  getMyHospitalNode,
} from "@/lib/fl-service";

export function TrainingPanel({
  model,
  state,
}: {
  model: FLModel;
  state: ModelRuntimeState;
}) {
  const [dataset, setDataset] = useState<File | null>(null);
  const [localRegisteredSamples, setLocalRegisteredSamples] = useState<number>(0);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [isLiveTraining, setIsLiveTraining] = useState<boolean>(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isAdversarialTest, setIsAdversarialTest] = useState<boolean>(false);
  
  // Real-time live telemetry state
  const [liveEpoch, setLiveEpoch] = useState<number>(0);
  const [totalEpochs, setTotalEpochs] = useState<number>(10);
  const [liveLoss, setLiveLoss] = useState<number>(0.9);
  const [liveAcc, setLiveAcc] = useState<number>(0.7);
  const [liveEta, setLiveEta] = useState<number>(0);
  const [currentPhase, setCurrentPhase] = useState<string>("IDLE");
  
  // Real-time Background Execution Log Stream
  const [liveLogs, setLiveLogs] = useState<string[]>([]);
  const [validationErrorMsg, setValidationErrorMsg] = useState<string | null>(null);
  
  // Evaluation Result Modal
  const [verificationResult, setVerificationResult] = useState<FLTrainingJob | null>(null);
  const [showResultModal, setShowResultModal] = useState<boolean>(false);
  const [copiedCid, setCopiedCid] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logConsoleRef = useRef<HTMLDivElement>(null);
  const canTrain = Boolean(dataset) && !isLiveTraining;

  useEffect(() => {
    getMyHospitalNode(model.id).then((node) => {
      if (node) {
        setLocalRegisteredSamples(node.local_samples_count || 0);
      }
    });
  }, [model.id]);

  useEffect(() => {
    if (logConsoleRef.current) {
      logConsoleRef.current.scrollTop = logConsoleRef.current.scrollHeight;
    }
  }, [liveLogs]);

  async function handleDatasetChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setDataset(file);
    setValidationErrorMsg(null);

    if (file) {
      setIsRegistering(true);
      try {
        const sampleCount = Math.max(12, Math.round((file.size / 1024) * 0.4) + 12);
        setLocalRegisteredSamples(sampleCount);

        await upsertMyHospitalNode(model.id, {
          datasetName: file.name,
          datasetSizeMb: +(file.size / 1024 / 1024).toFixed(2),
          localSamplesCount: sampleCount,
          nodeStatus: "ready",
          isAdversarial: isAdversarialTest,
        });
      } catch (err) {
        console.error("Failed to register hospital dataset in Supabase:", err);
      } finally {
        setIsRegistering(false);
      }
    }
  }

  async function handleStartTraining() {
    if (!dataset) return;
    setIsLiveTraining(true);
    setValidationErrorMsg(null);
    setCurrentPhase("PRE_FLIGHT_VALIDATION");
    setLiveEpoch(0);
    setTotalEpochs(10);
    setLiveEta(6.5);
    setLiveLogs([
      `[${new Date().toLocaleTimeString()}] Initializing training dispatch for model '${model.name}'...`,
      `[${new Date().toLocaleTimeString()}] Uploading dataset '${dataset.name}' (${(dataset.size / 1024).toFixed(1)} KB) to local training daemon...`,
    ]);

    try {
      const res = await startBackendTrainingJob({
        modelId: model.id,
        datasetFile: dataset,
        datasetName: dataset.name,
        modality: model.modality,
        classes: model.classes || ["Normal", "Pneumonia / Infiltration"],
        sampleCount: localRegisteredSamples || 100,
        epochs: 10,
        batchSize: 16,
        baselineAccuracy: model.current_accuracy || model.base_accuracy || 0.76,
        isAdversarial: isAdversarialTest,
      });

      setActiveJobId(res.jobId);

      // Connect to SSE stream
      streamTrainingProgress(
        res.jobId,
        (progress) => {
          if (progress.epoch !== undefined) {
            setLiveEpoch(progress.epoch);
            setTotalEpochs(progress.total_epochs || 10);
            setLiveLoss(progress.train_loss);
            setLiveAcc(progress.train_accuracy);
            setLiveEta(progress.eta_seconds || 0);
            setCurrentPhase("LOCAL_TRAINING");
          } else if (progress.phase) {
            setCurrentPhase(progress.phase);
          }
        },
        (logMessage) => {
          setLiveLogs((prev) => [...prev, logMessage]);
        },
        (finalResult) => {
          setIsLiveTraining(false);
          setCurrentPhase("COMPLETE");
          setVerificationResult(finalResult);
          setShowResultModal(true);
        },
        (errPayload) => {
          setIsLiveTraining(false);
          setCurrentPhase("ERROR");
          const reason = errPayload?.gate_reason || errPayload?.error || "Dataset failed pre-flight validation.";
          setValidationErrorMsg(reason);
        }
      );
    } catch (err: any) {
      console.error("Failed to start training:", err);
      setIsLiveTraining(false);
      setValidationErrorMsg(err?.message || "Connection error to training engine.");
    }
  }

  const steps = model.training_steps || [];
  const progressPercent = totalEpochs > 0 ? Math.round((liveEpoch / totalEpochs) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Guided steps */}
      <div className="rounded-2xl border border-border/80 bg-card/90 backdrop-blur-md shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border/60 px-6 py-4 bg-muted/20">
          <GraduationCap className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">How to Train &amp; Contribute to This Model</h3>
        </div>
        <ol className="divide-y divide-border/40">
          {steps.map((step, i) => {
            const active = isLiveTraining && Math.floor((liveEpoch / totalEpochs) * steps.length) === i;
            const complete = isLiveTraining ? Math.floor((liveEpoch / totalEpochs) * steps.length) > i : false;
            return (
              <li key={step.title} className="flex items-start gap-4 px-6 py-4">
                <span
                  className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all font-mono ${
                    complete
                      ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30"
                      : active
                      ? "bg-primary text-white shadow-sm shadow-primary/30 animate-pulse"
                      : "bg-muted text-muted-foreground border border-border"
                  }`}
                >
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                    {step.title}
                    {active && <span className="h-2 w-2 animate-ping rounded-full bg-primary" />}
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{step.detail}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Cloud Decentralized Dataset & Weights Download Bar */}
      {model.input_spec && (
        <div className="rounded-2xl border border-border/80 bg-card/60 p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Globe className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-foreground flex items-center gap-2">
                Cloud IPFS Verified Resources
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-bold">
                  Decentralized
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Download verified sample cohorts or base PyTorch weights directly from Pinata IPFS.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {model.input_spec.sample_dataset_url && (
              <a
                href={model.input_spec.sample_dataset_url}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/30 px-3.5 py-2 text-[11px] font-bold text-primary transition-all shadow-sm"
              >
                <Download className="h-3.5 w-3.5" />
                Sample Dataset (.zip)
              </a>
            )}
            {model.input_spec.ipfs_gateway_url && (
              <a
                href={model.input_spec.ipfs_gateway_url}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-muted/80 hover:bg-muted border border-border px-3.5 py-2 text-[11px] font-bold text-foreground transition-all shadow-sm"
              >
                <Download className="h-3.5 w-3.5" />
                Base Weights (.pt)
              </a>
            )}
          </div>
        </div>
      )}

      {/* Local dataset selector */}
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <UploadCloud className="h-5 w-5 text-primary" />
              Stage Your Hospital Dataset Archive
            </div>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
              Select your local image dataset (<code className="text-primary font-mono">.zip</code> archive containing medical images in class folders like <code className="text-primary font-mono">normal/</code> and <code className="text-primary font-mono">pneumonia/</code>). Non-image files or plain tabular CSVs will be rejected.
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="sr-only"
            onChange={handleDatasetChange}
            accept=".zip,.png,.jpg,.jpeg,.dcm,.dicom,.csv"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isRegistering || isLiveTraining}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-primary/40 bg-card px-5 text-xs font-bold text-primary hover:bg-primary/10 transition-all shadow-sm disabled:opacity-50"
          >
            {isRegistering ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            Select Dataset Archive
          </button>
        </div>

        {dataset ? (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
              <FileCheck2 className="h-4 w-4 shrink-0 text-emerald-500" />
              <span className="truncate font-bold font-mono">{dataset.name}</span>
              <span className="shrink-0 text-[11px] opacity-75">
                ({(dataset.size / 1024).toFixed(1)} KB · Ready for Pre-flight Ingestion)
              </span>
            </div>
            <button
              type="button"
              aria-label="Remove selected dataset"
              disabled={isLiveTraining}
              onClick={() => {
                setDataset(null);
                setLocalRegisteredSamples(0);
                setValidationErrorMsg(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="rounded-lg p-1 text-emerald-700 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-primary/30 bg-card/60 px-4 py-3 text-center text-xs text-muted-foreground">
            No dataset archive loaded. Select a <code className="font-mono text-primary">.zip</code> archive of medical images to enable training.
          </div>
        )}

        {/* Validation Failure Warning Banner */}
        {validationErrorMsg && (
          <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-800 dark:text-rose-300 space-y-1.5 animate-fadeIn">
            <div className="flex items-center gap-2 font-bold text-sm text-rose-600 dark:text-rose-400">
              <FileWarning className="h-5 w-5 shrink-0" />
              Dataset Format Rejected by Security Gate
            </div>
            <p className="leading-relaxed">{validationErrorMsg}</p>
          </div>
        )}
      </div>

      {/* Live Real-time Training Telemetry Monitor & Console */}
      {(isLiveTraining || liveLogs.length > 0) && (
        <div className="rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-xl space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                {isLiveTraining ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                )}
              </span>
              <div>
                <h4 className="text-sm font-bold text-foreground">
                  {isLiveTraining ? "PyTorch CNN Training in Progress" : "Execution Logs & Telemetry"}
                </h4>
                <p className="text-xs text-muted-foreground">
                  Real-time neural network telemetry and background execution traces
                </p>
              </div>
            </div>

            {isLiveTraining && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 rounded-xl bg-card border border-border px-3 py-1.5 text-xs font-mono">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span className="text-muted-foreground">ETA:</span>
                  <span className="font-bold text-foreground">~{liveEta.toFixed(1)}s</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-xl bg-primary/10 border border-primary/25 px-3 py-1.5 text-xs font-mono font-bold text-primary">
                  Epoch {liveEpoch} / {totalEpochs}
                </div>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {isLiveTraining && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-muted-foreground">Epoch Progress</span>
                <span className="font-bold text-primary">{progressPercent}%</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-purple-600 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Live Metric Gauges */}
          {isLiveTraining && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-card border border-border/80 text-center">
                <div className="text-[10px] uppercase font-bold text-muted-foreground">Train Loss</div>
                <div className="text-lg font-mono font-black text-foreground">{liveLoss.toFixed(4)}</div>
              </div>
              <div className="p-3 rounded-xl bg-card border border-border/80 text-center">
                <div className="text-[10px] uppercase font-bold text-muted-foreground">Local Accuracy</div>
                <div className="text-lg font-mono font-black text-emerald-600 dark:text-emerald-400">
                  {(liveAcc * 100).toFixed(1)}%
                </div>
              </div>
              <div className="p-3 rounded-xl bg-card border border-border/80 text-center">
                <div className="text-[10px] uppercase font-bold text-muted-foreground">Current Phase</div>
                <div className="text-xs font-mono font-bold text-primary truncate mt-1">
                  {currentPhase}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-card border border-border/80 text-center">
                <div className="text-[10px] uppercase font-bold text-muted-foreground">Privacy Bound</div>
                <div className="text-xs font-mono font-bold text-indigo-500 mt-1">ε = 0.12 / epoch</div>
              </div>
            </div>
          )}

          {/* Live Background Execution Console */}
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 font-mono font-bold">
                <Terminal className="w-3.5 h-3.5 text-primary" /> Live Background Execution Console
              </div>
              <span className="text-[10px] font-mono opacity-70">Daemon: PyTorch 2.11 CPU</span>
            </div>
            <div
              ref={logConsoleRef}
              className="h-44 w-full rounded-xl border border-border/80 bg-black/90 p-3.5 font-mono text-[11px] leading-relaxed text-emerald-400 overflow-y-auto shadow-inner space-y-1"
            >
              {liveLogs.map((log, index) => {
                const isError = log.includes("[REJECTION]") || log.includes("[ERROR]") || log.includes("FATAL");
                const isSuccess = log.includes("[SUCCESS]") || log.includes("Surpassed") || log.includes("ACCEPTED");
                const isWarn = log.includes("[WARN]");
                return (
                  <div
                    key={index}
                    className={
                      isError
                        ? "text-rose-400 font-bold"
                        : isSuccess
                        ? "text-emerald-300 font-bold"
                        : isWarn
                        ? "text-amber-300"
                        : "text-muted-foreground"
                    }
                  >
                    {log}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="rounded-2xl border border-border/80 bg-card/90 backdrop-blur-md p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-bold text-foreground">Execute Collaborative Training Rounds</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Validates dataset integrity, extracts images, computes local DP-SGD gradients, and tests against clinical benchmark.
            </div>
          </div>
          <button
            type="button"
            onClick={handleStartTraining}
            disabled={!canTrain}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-purple-600 px-6 text-xs font-bold text-white shadow-lg shadow-primary/25 transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLiveTraining ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {isLiveTraining
              ? `Training Round… (Epoch ${liveEpoch}/${totalEpochs})`
              : dataset
              ? "Train 10 Rounds from Dataset"
              : "Select Dataset Archive to Train"}
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border/60 pt-4">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mr-1">
            Simulate Adversary:
          </span>
          <button
            type="button"
            onClick={() => setIsAdversarialTest(!isAdversarialTest)}
            disabled={isLiveTraining}
            className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all shadow-sm ${
              isAdversarialTest
                ? "border-rose-500/40 bg-rose-500/15 text-rose-600 dark:text-rose-400"
                : "border-border/80 bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <ZapOff className="h-3.5 w-3.5" />
            Byzantine Probe (Invert Labels)
          </button>

          {isAdversarialTest && (
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 px-3 py-1 text-xs font-bold text-rose-600 dark:text-rose-400 animate-pulse">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              Adversary Active · Verification Gate will test quarantine
            </span>
          )}
        </div>
      </div>

      {/* Verification Gate Result Modal */}
      {showResultModal && verificationResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 md:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`h-10 w-10 rounded-2xl flex items-center justify-center border ${
                    verificationResult.gate_decision === "ACCEPTED"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {verificationResult.gate_decision === "ACCEPTED" ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    <XCircle className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Benchmark Verification Gate Report
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono">{verificationResult.model_id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowResultModal(false)}
                className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Decision Banner */}
            <div
              className={`p-4 rounded-2xl border text-xs leading-relaxed ${
                verificationResult.gate_decision === "ACCEPTED"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300"
              }`}
            >
              <div className="font-bold text-sm mb-1">
                Decision: {verificationResult.gate_decision === "ACCEPTED" ? "PROMOTED TO GLOBAL MODEL" : "MODEL UPDATE REJECTED"}
              </div>
              <p>{verificationResult.gate_reason}</p>
            </div>

            {/* Scorecard */}
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 rounded-xl bg-muted/40 border border-border/80">
                <div className="text-[10px] uppercase font-bold text-muted-foreground">Candidate Accuracy</div>
                <div className="text-xl font-mono font-black text-foreground mt-0.5">
                  {(verificationResult.candidate_accuracy * 100).toFixed(1)}%
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Baseline: {(verificationResult.baseline_accuracy * 100).toFixed(1)}%
                </div>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border/80">
                <div className="text-[10px] uppercase font-bold text-muted-foreground">F1-Score</div>
                <div className="text-xl font-mono font-black text-primary mt-0.5">
                  {(verificationResult.candidate_f1 * 100).toFixed(1)}%
                </div>
                <div className="text-[10px] text-muted-foreground">Macro Average</div>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border/80">
                <div className="text-[10px] uppercase font-bold text-muted-foreground">Precision</div>
                <div className="text-base font-mono font-bold text-foreground mt-0.5">
                  {(verificationResult.candidate_precision * 100).toFixed(1)}%
                </div>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border/80">
                <div className="text-[10px] uppercase font-bold text-muted-foreground">Recall / Sensitivity</div>
                <div className="text-base font-mono font-bold text-foreground mt-0.5">
                  {(verificationResult.candidate_recall * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Pinata IPFS Model Artifact CID & Decentralized Broadcast Card */}
            {verificationResult.pinata_cid && (
              <div className="flex flex-col gap-2.5 p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-primary/5 to-card border border-emerald-500/30 text-xs shadow-sm animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                    </span>
                    <Globe className="w-4 h-4" />
                    <span>Decentralized Model Live on Pinata IPFS</span>
                  </div>
                  <a
                    href={verificationResult.gateway_url || `https://gateway.pinata.cloud/ipfs/${verificationResult.pinata_cid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                  >
                    Gateway Explorer <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  ✅ <strong className="text-foreground">Global Sync Complete:</strong> Updated neural weights have been uploaded to IPFS. All participating hospitals in the federation can now download and run inferences with this new model checkpoint.
                </p>

                <div className="flex items-center justify-between gap-2 bg-background/80 p-2.5 rounded-xl border border-border/80 font-mono text-[11px]">
                  <span className="truncate text-foreground font-bold select-all">
                    {verificationResult.pinata_cid}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (verificationResult?.pinata_cid) {
                        navigator.clipboard.writeText(verificationResult.pinata_cid);
                        setCopiedCid(true);
                        setTimeout(() => setCopiedCid(false), 2000);
                      }
                    }}
                    className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary px-2.5 py-1 text-[10px] font-bold transition-colors"
                  >
                    {copiedCid ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> Copy CID
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Provenance Proof */}
            <div className="flex items-center gap-2 pt-2 border-t border-border/60 text-xs text-muted-foreground">
              <Lock className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="font-bold">Provenance Hash:</span>
              <span className="font-mono text-[10px] bg-muted px-2 py-0.5 rounded truncate">
                {verificationResult.provenance_hash}
              </span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowResultModal(false)}
                className="rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-primary/25 hover:bg-primary/90"
              >
                Close &amp; View Audit History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TrainingPanel;
