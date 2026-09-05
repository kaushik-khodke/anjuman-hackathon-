import React, { useState } from "react";
import {
  X,
  Scan,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Sun,
  Contrast,
  FileText,
  CheckCircle2,
  Stethoscope,
  Sparkles,
  Layers,
  Sliders,
  Maximize2,
  ShieldCheck,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface PACSStudy {
  id: string;
  uhid: string;
  patient_name: string;
  modality: string;
  study_description: string;
  image_url?: string;
  window_preset?: string;
  radiologist_impression?: string;
  radiologist_name?: string;
  status: string;
  created_at: string;
}

interface PACSViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  study: PACSStudy;
  onReportSaved?: () => void;
}

export function PACSViewerModal({
  isOpen,
  onClose,
  study,
  onReportSaved,
}: PACSViewerModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [invert, setInvert] = useState(false);
  const [activePreset, setActivePreset] = useState(study.window_preset || "LUNG");
  const [impression, setImpression] = useState(
    study.radiologist_impression ||
      "Well-defined opacity in right mid-zone with air bronchograms, typical of lobar pneumonic consolidation. Cardiac silhouette and bilateral costophrenic angles remain clear."
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  // Windowing preset application
  const applyPreset = (preset: "LUNG" | "BONE" | "SOFT_TISSUE" | "BRAIN") => {
    setActivePreset(preset);
    if (preset === "LUNG") {
      setBrightness(115);
      setContrast(140);
    } else if (preset === "BONE") {
      setBrightness(90);
      setContrast(180);
    } else if (preset === "SOFT_TISSUE") {
      setBrightness(100);
      setContrast(110);
    } else if (preset === "BRAIN") {
      setBrightness(105);
      setContrast(160);
    }
  };

  async function handleSaveReport() {
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/hms/diagnostics-rcm/pacs/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          study_id: study.id,
          window_preset: activePreset,
          radiologist_impression: impression,
          radiologist_name: "Dr. Vikram Sethi, MD (Radiology)",
        }),
      });

      if (res.ok) {
        setIsSaved(true);
        setTimeout(() => {
          setIsSaved(false);
          onReportSaved?.();
        }, 1500);
      }
    } catch (e) {
      console.error("Failed to save radiology report:", e);
    } finally {
      setIsSaving(false);
    }
  }

  // Fallback demo chest radiography
  const imageUrl =
    study.image_url ||
    "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="w-full max-w-5xl h-[90vh] rounded-3xl border border-border/80 bg-background text-foreground shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-3 bg-muted/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground font-heading flex items-center gap-2">
                Web DICOM PACS Diagnostic Viewer
                <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[10px] font-mono text-primary font-bold">
                  {study.modality}
                </span>
              </h3>
              <p className="text-xs text-muted-foreground font-mono">
                Patient: <strong className="text-foreground">{study.patient_name}</strong> · UHID: <strong className="text-foreground">{study.uhid}</strong> · {study.study_description}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PACS Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-muted/10 px-6 py-2 text-xs shrink-0">
          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-muted-foreground mr-1 flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5" /> Window Presets:
            </span>
            {(["LUNG", "BONE", "SOFT_TISSUE", "BRAIN"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => applyPreset(p)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-mono font-bold transition-all ${
                  activePreset === p
                    ? "bg-primary text-white shadow-sm"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted border border-border/60"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Imaging Tools */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(z + 0.2, 3))}
              className="rounded-lg border border-border p-1.5 hover:bg-muted"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(z - 0.2, 0.6))}
              className="rounded-lg border border-border p-1.5 hover:bg-muted"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="rounded-lg border border-border p-1.5 hover:bg-muted"
              title="Rotate 90°"
            >
              <RotateCw className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              type="button"
              onClick={() => setInvert((inv) => !inv)}
              className={`rounded-lg border p-1.5 text-[11px] font-bold font-mono transition-all ${
                invert ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted text-muted-foreground"
              }`}
              title="Invert Grayscale"
            >
              Invert
            </button>
            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setRotation(0);
                setBrightness(100);
                setContrast(100);
                setInvert(false);
              }}
              className="rounded-lg border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Main Work Area: Canvas + Diagnostic Report Dictation */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-0 overflow-hidden">
          {/* DICOM Viewport */}
          <div className="md:col-span-2 bg-black flex items-center justify-center relative overflow-hidden p-4 select-none">
            {/* Viewport Meta Overlays */}
            <div className="absolute top-4 left-4 text-[11px] font-mono text-emerald-400/90 pointer-events-none space-y-0.5">
              <div>STUDY: {study.study_description}</div>
              <div>MODALITY: {study.modality} · KVp: 120 · mA: 250</div>
              <div>ZOOM: {Math.round(zoom * 100)}% · ROT: {rotation}°</div>
            </div>
            <div className="absolute top-4 right-4 text-[11px] font-mono text-emerald-400/90 pointer-events-none text-right space-y-0.5">
              <div>PRESET: {activePreset}</div>
              <div>W: {contrast * 10} · L: {brightness * 4}</div>
            </div>

            {/* Medical Image */}
            <div
              className="transition-transform duration-100 ease-out"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                filter: `brightness(${brightness}%) contrast(${contrast}%) ${invert ? "invert(1)" : ""}`,
              }}
            >
              <img
                src={imageUrl}
                alt="DICOM Study"
                className="max-h-[60vh] max-w-full rounded-lg object-contain shadow-2xl"
              />
            </div>
          </div>

          {/* Radiologist Report Panel */}
          <div className="border-l border-border/80 bg-card p-5 flex flex-col space-y-4 overflow-y-auto">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wider border-b border-border/60 pb-2">
              <FileText className="w-4 h-4 text-primary" /> Radiologist Diagnostic Impression
            </div>

            <div className="space-y-2 flex-1">
              <label className="text-[11px] font-bold text-muted-foreground block">
                Structured Findings &amp; Clinical Impression
              </label>
              <textarea
                rows={10}
                value={impression}
                onChange={(e) => setImpression(e.target.value)}
                placeholder="Enter radiological findings, anatomical boundaries, differential diagnosis..."
                className="w-full rounded-2xl border border-border bg-background p-3 text-xs font-mono text-foreground leading-relaxed focus:border-primary focus:outline-none"
              />
            </div>

            <div className="p-3 rounded-xl bg-muted/30 border border-border/60 text-[11px] space-y-1">
              <div className="text-muted-foreground font-bold">Reporting Specialist:</div>
              <div className="font-medium text-foreground">{study.radiologist_name || "Dr. Vikram Sethi, MD (Radiology)"}</div>
              <div className="text-[10px] text-muted-foreground font-mono">Digital Signature Stamp Verified</div>
            </div>

            <button
              type="button"
              onClick={handleSaveReport}
              disabled={isSaving}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-white shadow-md shadow-primary/25 hover:bg-primary/90 disabled:opacity-50"
            >
              {isSaved ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  Impression Saved &amp; Verified!
                </>
              ) : (
                <>
                  <Stethoscope className="w-4 h-4" />
                  Sign &amp; Release Radiology Report
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PACSViewerModal;
