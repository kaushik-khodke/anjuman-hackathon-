import React, { useState, useEffect } from "react";
import {
  X,
  Stethoscope,
  Pill,
  FlaskConical,
  Scan,
  HeartPulse,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Loader2,
  Info,
  Layers,
  Sparkles,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface CDSSAlert {
  type: string;
  severity: "HIGH" | "MODERATE" | "LOW";
  interfering_drug?: string;
  message: string;
  action_required: string;
}

interface CPOEOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  uhid: string;
  doctorId: string;
  doctorName: string;
  currentMedications?: string[];
  knownAllergies?: string[];
  onOrderSuccess?: () => void;
}

export function CPOEOrderModal({
  isOpen,
  onClose,
  patientId,
  patientName,
  uhid,
  doctorId,
  doctorName,
  currentMedications = ["Warfarin 5mg (Coumadin)", "Lisinopril 10mg"],
  knownAllergies = ["Penicillin"],
  onOrderSuccess,
}: CPOEOrderModalProps) {
  const [activeTab, setActiveTab] = useState<"MEDICATION" | "LAB" | "RADIOLOGY" | "NURSING_CARE">("MEDICATION");
  const [itemName, setItemName] = useState("");
  const [dosage, setDosage] = useState("500mg");
  const [frequency, setFrequency] = useState("BID (Twice daily)");
  const [route, setRoute] = useState("Oral (PO)");
  const [durationDays, setDurationDays] = useState(5);
  const [urgency, setUrgency] = useState<"ROUTINE" | "URGENT" | "STAT">("ROUTINE");
  const [instructions, setInstructions] = useState("");
  const [icd10Diagnosis, setIcd10Diagnosis] = useState("J18.9 - Pneumonia, unspecified organism");

  // CDSS State
  const [isCheckingCDSS, setIsCheckingCDSS] = useState(false);
  const [cdssAlerts, setCdssAlerts] = useState<CDSSAlert[]>([]);
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Common quick-pick items
  const quickMedications = [
    "Ciprofloxacin 500mg",
    "Amoxicillin-Clavulanate 625mg",
    "Azithromycin 500mg",
    "Paracetamol 650mg",
    "Clarithromycin 500mg",
    "Simvastatin 20mg",
  ];

  const quickLabs = [
    "Complete Blood Count (CBC) with Differential",
    "Comprehensive Metabolic Panel (CMP)",
    "Serum Electrolytes (Na+, K+, Cl-)",
    "Arterial Blood Gas (ABG)",
    "Prothrombin Time / INR",
  ];

  const quickRadiology = [
    "Chest Radiograph (PA & Lateral Views)",
    "CT Chest without Contrast",
    "High-Resolution Computed Tomography (HRCT) Thorax",
    "Ultrasound Whole Abdomen",
  ];

  // Auto-run CDSS rule check when medication changes
  useEffect(() => {
    if (activeTab !== "MEDICATION" || !itemName.trim()) {
      setCdssAlerts([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingCDSS(true);
      try {
        const res = await fetch(`${API_BASE_URL}/hms/cdss/check-interactions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patient_id: patientId,
            new_medication: itemName,
            current_medications: currentMedications,
            known_allergies: knownAllergies,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setCdssAlerts(data.alerts || []);
        }
      } catch (err) {
        console.error("CDSS check error:", err);
      } finally {
        setIsCheckingCDSS(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [itemName, activeTab, patientId, currentMedications, knownAllergies]);

  if (!isOpen) return null;

  async function handleSubmitOrder() {
    if (cdssAlerts.some((a) => a.severity === "HIGH") && !overrideReason.trim()) {
      setShowOverrideDialog(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/hms/cpoe/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patientId,
          doctor_id: doctorId,
          order_type: activeTab,
          item_name: itemName,
          dosage: activeTab === "MEDICATION" ? dosage : undefined,
          frequency: activeTab === "MEDICATION" ? frequency : undefined,
          route: activeTab === "MEDICATION" ? route : undefined,
          duration_days: durationDays,
          urgency,
          instructions: `${icd10Diagnosis ? `[Diagnosis: ${icd10Diagnosis}] ` : ""}${instructions}`,
          cdss_alert_acknowledged: cdssAlerts.length > 0,
          physician_override_reason: overrideReason || undefined,
        }),
      });

      if (res.ok) {
        setSubmitSuccess(true);
        setTimeout(() => {
          setSubmitSuccess(false);
          onOrderSuccess?.();
          onClose();
        }, 1200);
      }
    } catch (err) {
      console.error("Failed to place CPOE order:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-3xl rounded-3xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 px-6 py-4 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground font-heading">
                Computerized Physician Order Entry (CPOE)
              </h3>
              <p className="text-xs text-muted-foreground font-mono">
                Patient: <strong className="text-foreground">{patientName}</strong> · UHID: <strong className="text-foreground">{uhid}</strong>
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

        {/* Patient Profile Banner (Allergies & Current Meds) */}
        <div className="px-6 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="font-bold text-amber-800 dark:text-amber-300">Known Allergies:</span>
            <span className="font-mono bg-amber-500/20 px-2 py-0.5 rounded text-amber-900 dark:text-amber-200">
              {knownAllergies.join(", ") || "None Documented"}
            </span>
          </div>
          <div className="text-muted-foreground text-[11px]">
            Active Meds: <span className="font-mono text-foreground">{currentMedications.join("; ")}</span>
          </div>
        </div>

        {/* Order Category Tabs */}
        <div className="flex border-b border-border/60 bg-muted/10 px-6 pt-3 gap-2">
          {[
            { id: "MEDICATION", label: "Rx Medications", icon: Pill },
            { id: "LAB", label: "Lab Investigations", icon: FlaskConical },
            { id: "RADIOLOGY", label: "Radiology Imaging", icon: Scan },
            { id: "NURSING_CARE", label: "Nursing Instructions", icon: HeartPulse },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setItemName("");
                }}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all ${
                  active
                    ? "border-primary text-primary bg-primary/5 rounded-t-xl"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {/* Quick-Pick Selection */}
          <div>
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Quick Pick Standard Protocols
            </label>
            <div className="flex flex-wrap gap-1.5">
              {(activeTab === "MEDICATION"
                ? quickMedications
                : activeTab === "LAB"
                ? quickLabs
                : quickRadiology
              ).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setItemName(q)}
                  className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all ${
                    itemName === q
                      ? "border-primary bg-primary/10 text-primary font-bold"
                      : "border-border/80 bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  + {q}
                </button>
              ))}
            </div>
          </div>

          {/* Item Name Input */}
          <div>
            <label className="text-xs font-bold text-foreground block mb-1">
              {activeTab === "MEDICATION"
                ? "Medication / Drug Name & Strength"
                : activeTab === "LAB"
                ? "Laboratory Test Name"
                : "Radiology Examination"}
            </label>
            <div className="relative">
              <input
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="e.g. Ciprofloxacin 500mg Tablets"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
              />
              {isCheckingCDSS && (
                <div className="absolute right-3 top-2.5 flex items-center gap-1.5 text-[11px] text-primary">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking CDSS Rules…
                </div>
              )}
            </div>
          </div>

          {/* Real-time CDSS Warnings Alert Box */}
          {cdssAlerts.length > 0 && (
            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 space-y-2 animate-fadeIn">
              <div className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-400 text-xs">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Clinical Decision Support (CDSS) Alert Triggered ({cdssAlerts.length})
              </div>
              {cdssAlerts.map((alert, idx) => (
                <div key={idx} className="text-[11px] leading-relaxed text-rose-800 dark:text-rose-300 border-t border-rose-500/20 pt-1.5">
                  <strong className="uppercase font-mono text-rose-600 dark:text-rose-400">[{alert.severity} RISK] {alert.type}: </strong>
                  {alert.message}
                </div>
              ))}
            </div>
          )}

          {/* Medication Specific Parameters */}
          {activeTab === "MEDICATION" && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-bold text-muted-foreground block mb-1">Dosage</label>
                <input
                  type="text"
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-muted-foreground block mb-1">Frequency</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs"
                >
                  <option>QD (Once daily)</option>
                  <option>BID (Twice daily)</option>
                  <option>TID (Thrice daily)</option>
                  <option>QID (Four times daily)</option>
                  <option>PRN (As needed for pain)</option>
                  <option>STAT (Immediate single dose)</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-muted-foreground block mb-1">Route</label>
                <select
                  value={route}
                  onChange={(e) => setRoute(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs"
                >
                  <option>Oral (PO)</option>
                  <option>Intravenous (IV)</option>
                  <option>Intramuscular (IM)</option>
                  <option>Subcutaneous (SC)</option>
                  <option>Inhalation / Nebulized</option>
                  <option>Topical</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-muted-foreground block mb-1">Duration (Days)</label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={durationDays}
                  onChange={(e) => setDurationDays(parseInt(e.target.value) || 1)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>
          )}

          {/* ICD-10 Coding & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-muted-foreground block mb-1">ICD-10 Diagnostic Code</label>
              <input
                type="text"
                value={icd10Diagnosis}
                onChange={(e) => setIcd10Diagnosis(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted-foreground block mb-1">Priority / Urgency</label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as any)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold"
              >
                <option value="ROUTINE">Routine (Standard)</option>
                <option value="URGENT">Urgent (Within 2 Hours)</option>
                <option value="STAT">STAT (Immediate Emergency)</option>
              </select>
            </div>
          </div>

          {/* Special Instructions */}
          <div>
            <label className="text-[11px] font-bold text-muted-foreground block mb-1">Special Physician Clinical Instructions</label>
            <textarea
              rows={2}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Administer with food. Monitor vitals and urine output every 4 hours."
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none"
            />
          </div>

          {/* Override Reason Dialog if CDSS Triggered */}
          {cdssAlerts.length > 0 && (
            <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-2">
              <div className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" /> Physician Clinical Override Justification Required
              </div>
              <input
                type="text"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Document clinical rationale (e.g., Benefit outweighs INR risk; monitoring PT/INR daily)"
                className="w-full rounded-lg border border-amber-500/40 bg-background px-3 py-2 text-xs text-foreground"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border/80 px-6 py-4 bg-muted/20">
          <div className="text-[11px] font-mono text-muted-foreground">
            Authorizing Doctor: <strong className="text-foreground">{doctorName}</strong>
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
              onClick={handleSubmitOrder}
              disabled={!itemName.trim() || isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-white shadow-md shadow-primary/25 hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : submitSuccess ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              ) : (
                <Stethoscope className="w-3.5 h-3.5" />
              )}
              {submitSuccess ? "Order Transmitted!" : "Sign & Transmit CPOE Order"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CPOEOrderModal;
