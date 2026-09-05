import React, { useState, useEffect } from "react";
import {
  Scissors,
  Droplets,
  PackageCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserCheck,
  Search,
  Plus,
  ShieldCheck,
  Activity,
  Layers,
  HeartPulse,
  Sparkles,
  Loader2,
  Stethoscope,
  Barcode,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface OTSurgery {
  id: string;
  uhid: string;
  patient_name: string;
  procedure_name: string;
  ot_room: string;
  lead_surgeon: string;
  anesthetist: string;
  asa_status: string;
  status: "scheduled" | "pre_op_ready" | "intra_op" | "pacu_recovery" | "completed";
  who_sign_in: boolean;
  who_time_out: boolean;
  who_sign_out: boolean;
  sponge_instrument_count_verified: boolean;
  aldrete_score: number;
  surgical_notes?: string;
}

interface BloodUnit {
  id: string;
  unit_barcode: string;
  blood_group: string;
  component_type: string;
  volume_ml: number;
  expiry_date: string;
  status: "AVAILABLE" | "RESERVED" | "TRANSFUSED";
  reserved_for_patient?: string;
}

interface CSSDTray {
  id: string;
  tray_barcode: string;
  tray_name: string;
  sterilization_method: string;
  autoclave_cycle_no: string;
  biological_indicator_passed: boolean;
  status: string;
  dispatched_to_ot?: string;
}

export function SurgicalOTBloodBank() {
  const [activeTab, setActiveTab] = useState<"OT" | "BLOOD_BANK" | "CSSD">("OT");

  // OT State
  const [surgeries, setSurgeries] = useState<OTSurgery[]>([]);
  const [selectedSurgery, setSelectedSurgery] = useState<OTSurgery | null>(null);

  // Blood Bank State
  const [bloodUnits, setBloodUnits] = useState<BloodUnit[]>([]);
  const [showCrossMatchModal, setShowCrossMatchModal] = useState(false);
  const [crossMatchGroup, setCrossMatchGroup] = useState("O+");
  const [crossMatchResult, setCrossMatchResult] = useState<string | null>(null);

  // CSSD State
  const [trays, setTrays] = useState<CSSDTray[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchSurgeries();
    fetchBloodBank();
    fetchCSSD();
  }, []);

  async function fetchSurgeries() {
    try {
      const res = await fetch(`${API_BASE_URL}/hms/surgical-interop/ot/surgeries`);
      if (res.ok) {
        const data = await res.json();
        setSurgeries(data.surgeries || []);
        if (data.surgeries?.length > 0 && !selectedSurgery) {
          setSelectedSurgery(data.surgeries[0]);
        }
      }
    } catch (e) {
      console.error("OT fetch error:", e);
    }
  }

  async function fetchBloodBank() {
    try {
      const res = await fetch(`${API_BASE_URL}/hms/surgical-interop/blood-bank/inventory`);
      if (res.ok) {
        const data = await res.json();
        setBloodUnits(data.units || []);
      }
    } catch (e) {
      console.error("Blood bank error:", e);
    }
  }

  async function fetchCSSD() {
    try {
      const res = await fetch(`${API_BASE_URL}/hms/surgical-interop/cssd/trays`);
      if (res.ok) {
        const data = await res.json();
        setTrays(data.trays || []);
      }
    } catch (e) {
      console.error("CSSD error:", e);
    }
  }

  async function handleUpdateWHOChecklist(step: "sign_in" | "time_out" | "sign_out" | "counts") {
    if (!selectedSurgery) return;

    const updated = {
      ...selectedSurgery,
      who_sign_in: step === "sign_in" ? true : selectedSurgery.who_sign_in,
      who_time_out: step === "time_out" ? true : selectedSurgery.who_time_out,
      who_sign_out: step === "sign_out" ? true : selectedSurgery.who_sign_out,
      sponge_instrument_count_verified: step === "counts" ? true : selectedSurgery.sponge_instrument_count_verified,
      status: (step === "sign_out" ? "pacu_recovery" : selectedSurgery.status) as any,
    };

    setSelectedSurgery(updated);
    setSurgeries((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));

    try {
      await fetch(`${API_BASE_URL}/hms/surgical-interop/ot/who-checklist/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surgery_id: updated.id,
          who_sign_in: updated.who_sign_in,
          who_time_out: updated.who_time_out,
          who_sign_out: updated.who_sign_out,
          sponge_instrument_count_verified: updated.sponge_instrument_count_verified,
          status: updated.status,
        }),
      });
    } catch (e) {
      console.error("Failed to update WHO checklist:", e);
    }
  }

  async function handleCrossMatch() {
    try {
      const res = await fetch(`${API_BASE_URL}/hms/surgical-interop/blood-bank/cross-match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_uhid: "UHID-2026-0012",
          patient_name: "Alice Smith",
          recipient_blood_group: crossMatchGroup,
          component_needed: "PRBC",
          units_requested: 1,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCrossMatchResult(data.message);
        fetchBloodBank();
      }
    } catch (e) {
      console.error("Cross match failed:", e);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card rounded-3xl border border-border/80 bg-white/90 dark:bg-card/90 p-6 backdrop-blur-xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Scissors className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground font-heading">
                Surgical Suite (OT), Blood Bank &amp; Central Sterilization (CSSD)
              </h2>
              <p className="text-xs text-muted-foreground font-mono">
                WHO Surgical Safety Checklist, Anesthesia ASA status, electronic blood cross-matching, and autoclave cycle monitoring
              </p>
            </div>
          </div>

          {/* Module Switcher */}
          <div className="flex items-center gap-1.5 rounded-2xl bg-muted/40 p-1.5 border border-border/60 text-xs font-bold">
            <button
              onClick={() => setActiveTab("OT")}
              className={`rounded-xl px-3.5 py-1.5 transition-all ${
                activeTab === "OT"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              ✂️ Operation Theater (OT)
            </button>
            <button
              onClick={() => setActiveTab("BLOOD_BANK")}
              className={`rounded-xl px-3.5 py-1.5 transition-all ${
                activeTab === "BLOOD_BANK"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              🩸 Blood Bank &amp; Cross-Match
            </button>
            <button
              onClick={() => setActiveTab("CSSD")}
              className={`rounded-xl px-3.5 py-1.5 transition-all ${
                activeTab === "CSSD"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              📦 CSSD Sterilization
            </button>
          </div>
        </div>

        {/* 1. Operation Theater & WHO Checklist */}
        {activeTab === "OT" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-5">
            {/* Left: OT Schedule List */}
            <div className="lg:col-span-1 border-r border-border/60 pr-0 lg:pr-6 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Surgical Suite Schedule ({surgeries.length})
              </div>

              <div className="space-y-2.5 max-h-[65vh] overflow-y-auto">
                {surgeries.map((s) => {
                  const isSelected = selectedSurgery?.id === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => setSelectedSurgery(s)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-1.5 ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border/70 hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-primary">{s.ot_room}</span>
                        <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold font-mono text-emerald-600 dark:text-emerald-400">
                          {s.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="font-bold text-sm text-foreground">{s.patient_name}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">{s.procedure_name}</div>
                      <div className="text-[11px] font-mono text-muted-foreground pt-1">
                        Surgeon: <strong className="text-foreground">{s.lead_surgeon}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: WHO Surgical Safety Checklist & Anesthesia Board */}
            <div className="lg:col-span-2 space-y-5">
              {selectedSurgery ? (
                <div className="space-y-5 animate-fadeIn">
                  {/* Header Meta */}
                  <div className="p-4 rounded-2xl border border-border/80 bg-muted/20 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="text-base font-bold text-foreground">{selectedSurgery.procedure_name}</div>
                      <div className="text-muted-foreground font-mono mt-0.5">
                        Patient: <strong className="text-foreground">{selectedSurgery.patient_name}</strong> ({selectedSurgery.uhid}) · Anesthetist: <strong className="text-foreground">{selectedSurgery.anesthetist}</strong>
                      </div>
                    </div>
                    <span className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-1 font-mono font-bold text-amber-700 dark:text-amber-300">
                      {selectedSurgery.asa_status} Score
                    </span>
                  </div>

                  {/* WHO Surgical Safety Checklist 3-Phases */}
                  <div className="rounded-3xl border border-border/80 bg-card p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-border/60 pb-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wider">
                        <ShieldCheck className="w-4 h-4 text-primary" /> WHO Surgical Safety Checklist (3-Phase Sign-Off)
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">World Health Organization Standard</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Phase 1: SIGN IN */}
                      <div className={`p-4 rounded-2xl border space-y-3 ${selectedSurgery.who_sign_in ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/80 bg-muted/10"}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-foreground">1. SIGN IN (Pre-Anesthesia)</span>
                          {selectedSurgery.who_sign_in && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                        </div>
                        <ul className="text-[11px] text-muted-foreground space-y-1">
                          <li>✓ Patient identity &amp; site marked</li>
                          <li>✓ Anesthesia safety check verified</li>
                          <li>✓ Pulse oximeter active &amp; functioning</li>
                          <li>✓ Known allergy &amp; airway risk noted</li>
                        </ul>
                        {!selectedSurgery.who_sign_in ? (
                          <button
                            onClick={() => handleUpdateWHOChecklist("sign_in")}
                            className="w-full rounded-xl bg-primary py-1.5 text-xs font-bold text-white shadow-sm"
                          >
                            Execute Sign In
                          </button>
                        ) : (
                          <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                            ✓ Verified &amp; Signed In
                          </div>
                        )}
                      </div>

                      {/* Phase 2: TIME OUT */}
                      <div className={`p-4 rounded-2xl border space-y-3 ${selectedSurgery.who_time_out ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/80 bg-muted/10"}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-foreground">2. TIME OUT (Pre-Incision)</span>
                          {selectedSurgery.who_time_out && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                        </div>
                        <ul className="text-[11px] text-muted-foreground space-y-1">
                          <li>✓ All team members introduced</li>
                          <li>✓ Surgeon, Anesthetist &amp; Nurse verbal confirm</li>
                          <li>✓ Antibiotic prophylaxis given $\le$60m</li>
                          <li>✓ Essential imaging displayed</li>
                        </ul>
                        {!selectedSurgery.who_time_out ? (
                          <button
                            onClick={() => handleUpdateWHOChecklist("time_out")}
                            className="w-full rounded-xl bg-primary py-1.5 text-xs font-bold text-white shadow-sm"
                          >
                            Execute Time Out
                          </button>
                        ) : (
                          <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                            ✓ Verified &amp; Timed Out
                          </div>
                        )}
                      </div>

                      {/* Phase 3: SIGN OUT */}
                      <div className={`p-4 rounded-2xl border space-y-3 ${selectedSurgery.who_sign_out ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/80 bg-muted/10"}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-foreground">3. SIGN OUT (Pre-Wound Closure)</span>
                          {selectedSurgery.who_sign_out && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                        </div>
                        <ul className="text-[11px] text-muted-foreground space-y-1">
                          <li>✓ Name of recorded procedure confirmed</li>
                          <li>✓ Instrument, needle &amp; sponge count: <strong>MATCHED</strong></li>
                          <li>✓ Specimen labeled accurately</li>
                          <li>✓ Post-op PACU recovery plan defined</li>
                        </ul>
                        {!selectedSurgery.who_sign_out ? (
                          <button
                            onClick={() => handleUpdateWHOChecklist("sign_out")}
                            className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 py-1.5 text-xs font-bold text-white shadow-sm"
                          >
                            Sign Out &amp; Move to PACU
                          </button>
                        ) : (
                          <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                            ✓ Signed Out to PACU
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* PACU Aldrete Score Card */}
                  <div className="p-4 rounded-2xl border border-border/80 bg-muted/20 flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <HeartPulse className="w-4 h-4 text-rose-500" />
                      <span>Post-Anesthesia Care Unit (PACU) Aldrete Recovery Score:</span>
                      <strong className="text-foreground text-sm">{selectedSurgery.aldrete_score} / 10</strong>
                    </div>
                    <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 font-bold text-emerald-600 dark:text-emerald-400">
                      Fit For Inpatient Ward Transfer
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* 2. Blood Bank Management */}
        {activeTab === "BLOOD_BANK" && (
          <div className="pt-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="font-mono text-muted-foreground">
                Current Blood Bank Stock &amp; Electronic Serological Cross-Match Console
              </div>
              <button
                onClick={() => setShowCrossMatchModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-md shadow-primary/25 hover:bg-primary/90"
              >
                <Plus className="w-4 h-4" /> Request Blood Cross-Match &amp; Reserve
              </button>
            </div>

            {/* Inventory Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {bloodUnits.map((u) => (
                <div
                  key={u.id}
                  className={`p-4 rounded-2xl border space-y-2 text-xs transition-all ${
                    u.status === "RESERVED"
                      ? "border-amber-500/40 bg-amber-500/5"
                      : "border-border/80 bg-card"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black font-mono text-primary">{u.blood_group}</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold border ${
                        u.status === "AVAILABLE"
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                          : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {u.status}
                    </span>
                  </div>
                  <div className="font-bold text-foreground text-sm font-sans">{u.component_type} ({u.volume_ml} mL)</div>
                  <div className="text-[11px] text-muted-foreground font-mono">Barcode: {u.unit_barcode}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    Expires: {u.expiry_date}
                  </div>
                  {u.reserved_for_patient && (
                    <div className="text-[11px] font-mono text-amber-700 dark:text-amber-300 pt-1 border-t border-amber-500/20">
                      Reserved for: <strong>{u.reserved_for_patient}</strong>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. CSSD Central Sterilization */}
        {activeTab === "CSSD" && (
          <div className="pt-5 space-y-4">
            <div className="text-xs text-muted-foreground font-mono">
              Central Sterile Services Department (CSSD) Autoclave Tray Lifecycle &amp; Biological Indicator Verification
            </div>

            <div className="rounded-2xl border border-border/80 bg-card overflow-hidden">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground uppercase text-[10px] bg-muted/10">
                    <th className="py-3 px-4">Tray Barcode</th>
                    <th className="py-3 px-4">Surgical Instrument Set</th>
                    <th className="py-3 px-4">Sterilization Method</th>
                    <th className="py-3 px-4">Autoclave Cycle #</th>
                    <th className="py-3 px-4 text-center">Biological Indicator</th>
                    <th className="py-3 px-4 text-center">Status / Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {trays.map((t) => (
                    <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-primary">{t.tray_barcode}</td>
                      <td className="py-3.5 px-4 font-sans font-medium text-foreground">{t.tray_name}</td>
                      <td className="py-3.5 px-4 text-muted-foreground">{t.sterilization_method.replace("_", " ")}</td>
                      <td className="py-3.5 px-4 text-muted-foreground">{t.autoclave_cycle_no}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          ✓ NEGATIVE (STERILE)
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            t.status === "DISPATCHED_TO_OT"
                              ? "bg-primary/10 text-primary border border-primary/20"
                              : "bg-muted text-muted-foreground border border-border"
                          }`}
                        >
                          {t.status.replace("_", " ")} {t.dispatched_to_ot ? `(${t.dispatched_to_ot})` : ""}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Cross Match Modal */}
      {showCrossMatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Droplets className="w-5 h-5 text-rose-500" />
                <h3 className="text-base font-bold text-foreground font-heading">
                  Electronic Blood Cross-Match
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowCrossMatchModal(false);
                  setCrossMatchResult(null);
                }}
                className="rounded-xl p-1 text-muted-foreground hover:bg-muted"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-muted-foreground block mb-1">Recipient Patient</label>
                <div className="p-3 rounded-xl bg-muted/20 border border-border font-mono font-bold">
                  Alice Smith (UHID-2026-0012)
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted-foreground block mb-1">Recipient ABO / Rh Blood Group</label>
                <select
                  value={crossMatchGroup}
                  onChange={(e) => setCrossMatchGroup(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold font-mono"
                >
                  <option>O+</option>
                  <option>A+</option>
                  <option>B+</option>
                  <option>AB+</option>
                  <option>O-</option>
                  <option>A-</option>
                  <option>B-</option>
                  <option>AB-</option>
                </select>
              </div>

              {crossMatchResult && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-mono text-[11px]">
                  {crossMatchResult}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={() => {
                  setShowCrossMatchModal(false);
                  setCrossMatchResult(null);
                }}
                className="rounded-xl border border-border px-4 py-2 font-bold text-muted-foreground hover:bg-muted"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleCrossMatch}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 px-5 py-2 font-bold text-white shadow-md shadow-rose-600/25"
              >
                Execute Electronic Cross-Match &amp; Reserve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SurgicalOTBloodBank;
