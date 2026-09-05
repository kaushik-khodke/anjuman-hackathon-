import React, { useState } from "react";
import {
  X,
  HeartPulse,
  QrCode,
  Barcode,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  Activity,
  Pill,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface BedsideEMARModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  expectedUhid: string;
  orderId: string;
  medicationName: string;
  dosage: string;
  route: string;
  nurseName?: string;
  onAdministerSuccess?: () => void;
}

export function BedsideEMARModal({
  isOpen,
  onClose,
  patientId,
  patientName,
  expectedUhid,
  orderId,
  medicationName,
  dosage,
  route,
  nurseName = "Staff Nurse Priya S.",
  onAdministerSuccess,
}: BedsideEMARModalProps) {
  const [scannedUhid, setScannedUhid] = useState(expectedUhid);
  const [scannedMedCode, setScannedMedCode] = useState(`MED-${medicationName.slice(0, 4).toUpperCase()}-500`);
  const [systolic, setSystolic] = useState("120");
  const [diastolic, setDiastolic] = useState("80");
  const [pulse, setPulse] = useState("76");
  const [spo2, setSpo2] = useState("98");
  const [temperature, setTemperature] = useState("98.6");
  const [notes, setNotes] = useState("Patient confirmed identity verbally and tolerated dose well.");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const isPatientMatch = scannedUhid.trim().toUpperCase() === expectedUhid.trim().toUpperCase();

  async function handleAdminister() {
    if (!isPatientMatch) {
      setErrorMsg(`WRONG PATIENT: Scanned UHID '${scannedUhid}' does not match expected UHID '${expectedUhid}'.`);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${API_BASE_URL}/hms/emar/verify-and-administer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cpoe_order_id: orderId,
          patient_id: patientId,
          nurse_id: "nurse-001",
          nurse_name: nurseName,
          scanned_patient_uhid: scannedUhid,
          scanned_medication_code: scannedMedCode,
          expected_patient_uhid: expectedUhid,
          expected_medication_name: medicationName,
          dosage,
          route,
          vitals: {
            systolic: parseInt(systolic),
            diastolic: parseInt(diastolic),
            pulse: parseInt(pulse),
            spo2: parseInt(spo2),
            temperature: parseFloat(temperature),
          },
          notes,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to record eMAR administration");
      }

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onAdministerSuccess?.();
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to record eMAR administration");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-xl rounded-3xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 px-6 py-4 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground font-heading">
                Bedside Nursing eMAR · 5-Rights Verification
              </h3>
              <p className="text-xs text-muted-foreground font-mono">
                Patient: <strong className="text-foreground">{patientName}</strong> ({expectedUhid})
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

        {/* 5-Rights Checklist Indicators */}
        <div className="px-6 py-3 bg-muted/30 border-b border-border/60 text-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            The 5 Rights of Safe Medication Administration
          </div>
          <div className="grid grid-cols-5 gap-2 text-center text-[11px] font-bold font-mono">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
              ✓ Right Patient
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
              ✓ Right Drug
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
              ✓ Right Dose
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
              ✓ Right Route
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
              ✓ Right Time
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4 text-xs overflow-y-auto max-h-[65vh]">
          {errorMsg && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-rose-700 dark:text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Barcode Scanners Simulation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl bg-muted/20 border border-border/80 space-y-1.5">
              <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-primary" /> Scan Patient Wristband (UHID)
              </label>
              <input
                type="text"
                value={scannedUhid}
                onChange={(e) => setScannedUhid(e.target.value)}
                className={`w-full rounded-xl border px-3 py-2 text-xs font-mono font-bold ${
                  isPatientMatch
                    ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
                    : "border-rose-500/40 bg-rose-500/5 text-rose-600"
                }`}
              />
              <span className="text-[10px] text-muted-foreground">
                {isPatientMatch ? "✓ Identity Match Confirmed" : "⚠️ UHID Mismatch"}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-muted/20 border border-border/80 space-y-1.5">
              <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                <Barcode className="w-3.5 h-3.5 text-primary" /> Scan Medication Barcode
              </label>
              <input
                type="text"
                value={scannedMedCode}
                onChange={(e) => setScannedMedCode(e.target.value)}
                className="w-full rounded-xl border border-emerald-500/40 bg-emerald-500/5 px-3 py-2 text-xs font-mono text-emerald-700 dark:text-emerald-300 font-bold"
              />
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                ✓ Verified: {medicationName} ({dosage})
              </span>
            </div>
          </div>

          {/* Vitals Recording Prior to Administration */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <HeartPulse className="w-4 h-4 text-rose-500" /> Bedside Vital Signs at Administration
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
              <div>
                <label className="text-[10px] text-muted-foreground uppercase font-bold">BP (Sys/Dia)</label>
                <div className="flex gap-1 mt-0.5">
                  <input
                    type="text"
                    value={systolic}
                    onChange={(e) => setSystolic(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background py-1.5 text-center font-mono text-xs font-bold"
                  />
                  <input
                    type="text"
                    value={diastolic}
                    onChange={(e) => setDiastolic(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background py-1.5 text-center font-mono text-xs font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase font-bold">Pulse (BPM)</label>
                <input
                  type="text"
                  value={pulse}
                  onChange={(e) => setPulse(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background py-1.5 text-center font-mono text-xs font-bold mt-0.5"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase font-bold">SpO2 (%)</label>
                <input
                  type="text"
                  value={spo2}
                  onChange={(e) => setSpo2(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background py-1.5 text-center font-mono text-xs font-bold mt-0.5"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase font-bold">Temp (°F)</label>
                <input
                  type="text"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background py-1.5 text-center font-mono text-xs font-bold mt-0.5"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase font-bold">Route</label>
                <div className="py-1.5 font-mono text-xs font-bold text-primary mt-0.5 truncate">
                  {route}
                </div>
              </div>
            </div>
          </div>

          {/* Nurse Observations */}
          <div>
            <label className="text-[11px] font-bold text-muted-foreground block mb-1">Nurse Bedside Observation Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border/80 px-6 py-4 bg-muted/20">
          <div className="text-[11px] font-mono text-muted-foreground">
            Attending Nurse: <strong className="text-foreground">{nurseName}</strong>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAdminister}
              disabled={!isPatientMatch || isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/25 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isSuccess ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5" />
              )}
              {isSuccess ? "Administered & Verified!" : "Confirm 5-Rights & Administer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BedsideEMARModal;
