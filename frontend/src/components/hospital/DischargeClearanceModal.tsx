import React, { useState } from "react";
import {
  X,
  CheckCircle2,
  Clock,
  Pill,
  FlaskConical,
  HeartPulse,
  CreditCard,
  Bed,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface AdmissionRecord {
  id: string;
  uhid: string;
  patient_name?: string;
  bed_number: string;
  ward_type: string;
  admitted_at: string;
  pharmacy_cleared: boolean;
  pharmacy_cleared_by?: string;
  lab_cleared: boolean;
  lab_cleared_by?: string;
  nursing_cleared: boolean;
  nursing_cleared_by?: string;
  billing_cleared: boolean;
  billing_cleared_by?: string;
  status: string;
}

interface DischargeClearanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  admission: AdmissionRecord;
  onStatusChange?: () => void;
}

export function DischargeClearanceModal({
  isOpen,
  onClose,
  admission,
  onStatusChange,
}: DischargeClearanceModalProps) {
  const [currentAdmission, setCurrentAdmission] = useState<AdmissionRecord>(admission);
  const [signingDept, setSigningDept] = useState<string | null>(null);

  if (!isOpen) return null;

  const allCleared =
    currentAdmission.pharmacy_cleared &&
    currentAdmission.lab_cleared &&
    currentAdmission.nursing_cleared &&
    currentAdmission.billing_cleared;

  async function handleSignOff(dept: "pharmacy" | "lab" | "nursing" | "billing") {
    setSigningDept(dept);
    try {
      const res = await fetch(`${API_BASE_URL}/hms/ipd/clearance/sign-off`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admission_id: currentAdmission.id,
          department: dept,
          signed_by: `Officer (${dept.toUpperCase()})`,
        }),
      });

      if (res.ok) {
        setCurrentAdmission((prev) => ({
          ...prev,
          [`${dept}_cleared`]: true,
          [`${dept}_cleared_by`]: `Authorized ${dept.toUpperCase()} Officer`,
        }));
        onStatusChange?.();
      }
    } catch (err) {
      console.error("Failed to sign off clearance:", err);
    } finally {
      setSigningDept(null);
    }
  }

  const clearanceSteps = [
    {
      id: "pharmacy",
      title: "Pharmacy Dispensary Clearance",
      desc: "Unused inpatient medications reconciled, take-home discharge prescriptions dispensed.",
      icon: Pill,
      cleared: currentAdmission.pharmacy_cleared,
      clearedBy: currentAdmission.pharmacy_cleared_by,
    },
    {
      id: "lab",
      title: "Laboratory Diagnostic Clearance",
      desc: "All active specimen orders processed, delta checks verified, signed by pathologist.",
      icon: FlaskConical,
      cleared: currentAdmission.lab_cleared,
      clearedBy: currentAdmission.lab_cleared_by,
    },
    {
      id: "nursing",
      title: "Bedside Nursing Clearance",
      desc: "Peripheral IV cannulas/catheters removed, discharge summary & wound care explained.",
      icon: HeartPulse,
      cleared: currentAdmission.nursing_cleared,
      clearedBy: currentAdmission.nursing_cleared_by,
    },
    {
      id: "billing",
      title: "Revenue Cycle & Billing Clearance",
      desc: "Daily bed tariff, CPOE procedures, medication ledger settled; insurance pre-auth approved.",
      icon: CreditCard,
      cleared: currentAdmission.billing_cleared,
      clearedBy: currentAdmission.billing_cleared_by,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-2xl rounded-3xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 px-6 py-4 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Bed className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground font-heading">
                Inpatient Digital Discharge Clearance
              </h3>
              <p className="text-xs text-muted-foreground font-mono">
                Bed: <strong className="text-foreground">{currentAdmission.bed_number}</strong> ({currentAdmission.ward_type}) · UHID: <strong className="text-foreground">{currentAdmission.uhid}</strong>
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

        {/* Status Summary */}
        <div className="px-6 py-3 bg-muted/30 border-b border-border/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground">Clearance Status:</span>
            <span
              className={`rounded-full px-2.5 py-0.5 font-bold font-mono text-[11px] border ${
                allCleared
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
              }`}
            >
              {allCleared ? "ALL 4 DEPARTMENTS CLEARED" : "DISCHARGE IN PROGRESS (PENDING SIGN-OFF)"}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Admitted: {new Date(currentAdmission.admitted_at).toLocaleDateString()}
          </span>
        </div>

        {/* Clearance Checklist */}
        <div className="p-6 space-y-3.5 text-xs overflow-y-auto max-h-[60vh]">
          {clearanceSteps.map((step) => {
            const Icon = step.icon;
            const isSigning = signingDept === step.id;

            return (
              <div
                key={step.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  step.cleared
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-border/80 bg-muted/20"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border ${
                      step.cleared
                        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                        : "bg-muted border-border text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 font-bold text-foreground text-sm">
                      {step.title}
                      {step.cleared && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      {step.desc}
                    </p>
                    {step.cleared && step.clearedBy && (
                      <div className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 mt-1">
                        ✓ Authorized by: {step.clearedBy}
                      </div>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center justify-end">
                  {step.cleared ? (
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Cleared
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSignOff(step.id as any)}
                      disabled={isSigning}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-primary hover:bg-primary/90 px-4 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50"
                    >
                      {isSigning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      Sign-off Clearance
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border/80 px-6 py-4 bg-muted/20">
          <div className="text-[11px] text-muted-foreground">
            {allCleared
              ? "Bed will automatically release into available pool upon closing."
              : "All 4 departments must sign off before bed release."}
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-xl px-5 py-2 text-xs font-bold transition-all ${
              allCleared
                ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/25"
                : "border border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {allCleared ? "Finalize Discharge & Release Bed" : "Close Checklist"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DischargeClearanceModal;
