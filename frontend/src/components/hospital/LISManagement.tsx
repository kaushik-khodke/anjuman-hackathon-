import React, { useState, useEffect } from "react";
import {
  FlaskConical,
  Barcode,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Search,
  Plus,
  Loader2,
  Stethoscope,
  Activity,
  FileCheck,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface Specimen {
  id: string;
  uhid: string;
  patient_name: string;
  test_name: string;
  specimen_type: string;
  barcode: string;
  collection_status: "ordered" | "collected" | "in_analyzer" | "reviewed" | "released";
  collected_by?: string;
  collected_at?: string;
  results_json?: Record<string, any>;
  delta_check_flag: "NORMAL" | "DELTA_WARNING" | "CRITICAL_PANIC";
  delta_details?: string;
  pathologist_name?: string;
  created_at: string;
}

export function LISManagement() {
  const [specimens, setSpecimens] = useState<Specimen[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecimen, setSelectedSpecimen] = useState<Specimen | null>(null);

  // New Collection Form
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [patientName, setPatientName] = useState("Alice Smith");
  const [uhid, setUhid] = useState("UHID-2026-0012");
  const [testName, setTestName] = useState("Complete Blood Count (CBC) with Differential");
  const [specimenType, setSpecimenType] = useState("Whole Blood");

  useEffect(() => {
    fetchSpecimens();
  }, []);

  async function fetchSpecimens() {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/hms/diagnostics-rcm/lis/specimens`);
      if (res.ok) {
        const data = await res.json();
        setSpecimens(data.specimens || []);
        if (data.specimens?.length > 0 && !selectedSpecimen) {
          setSelectedSpecimen(data.specimens[0]);
        }
      }
    } catch (e) {
      console.error("Failed to load LIS specimens:", e);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCollectSpecimen() {
    try {
      const res = await fetch(`${API_BASE_URL}/hms/diagnostics-rcm/lis/collect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: "p1",
          uhid,
          patient_name: patientName,
          test_name: testName,
          specimen_type: specimenType,
          phlebotomist_name: "Phlebotomist Rahul M.",
        }),
      });

      if (res.ok) {
        setShowCollectModal(false);
        fetchSpecimens();
      }
    } catch (e) {
      console.error("Collection failed:", e);
    }
  }

  async function handleReleaseReport(specimenId: string) {
    setSpecimens((prev) =>
      prev.map((s) => (s.id === specimenId ? { ...s, collection_status: "released" } : s))
    );
    if (selectedSpecimen?.id === specimenId) {
      setSelectedSpecimen((prev) => prev ? { ...prev, collection_status: "released" } : null);
    }
  }

  const filtered = specimens.filter(
    (s) =>
      s.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.uhid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.barcode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card rounded-3xl border border-border/80 bg-white/90 dark:bg-card/90 p-6 backdrop-blur-xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <FlaskConical className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground font-heading">
                Laboratory Information System (LIS) &amp; Automated Delta Checks
              </h2>
              <p className="text-xs text-muted-foreground font-mono">
                Track specimen barcode lifecycle from phlebotomy draw to analyzer Delta Check validation and pathologist release
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search barcode, UHID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-xl border border-border bg-background pl-9 pr-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <button
              onClick={() => setShowCollectModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-md shadow-primary/25 hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" /> Collect New Specimen
            </button>
          </div>
        </div>

        {/* Master-Detail LIS Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-5">
          {/* Specimen Worklist Column */}
          <div className="lg:col-span-1 border-r border-border/60 pr-0 lg:pr-6 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              <span>Specimens in Pipeline ({filtered.length})</span>
            </div>

            <div className="space-y-2.5 max-h-[65vh] overflow-y-auto pr-1">
              {isLoading ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary mb-2" /> Loading specimens…
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No specimen records found.
                </div>
              ) : (
                filtered.map((s) => {
                  const isSelected = selectedSpecimen?.id === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => setSelectedSpecimen(s)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border/70 hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-foreground">
                          {s.barcode}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold font-mono border ${
                            s.delta_check_flag === "DELTA_WARNING"
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                              : s.delta_check_flag === "CRITICAL_PANIC"
                              ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {s.delta_check_flag}
                        </span>
                      </div>
                      <div className="font-bold text-sm text-foreground mt-1">{s.patient_name}</div>
                      <div className="text-xs text-muted-foreground truncate">{s.test_name}</div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-2 font-mono">
                        <span>{s.specimen_type}</span>
                        <span className="uppercase font-bold text-primary">{s.collection_status}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Selected Specimen Diagnostic Report & Delta Review Column */}
          <div className="lg:col-span-2 space-y-4">
            {selectedSpecimen ? (
              <div className="space-y-4 animate-fadeIn">
                {/* Specimen Header Card */}
                <div className="p-4 rounded-2xl border border-border/80 bg-muted/20 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="text-base font-bold text-foreground">{selectedSpecimen.test_name}</div>
                    <div className="text-muted-foreground font-mono mt-0.5">
                      Patient: <strong className="text-foreground">{selectedSpecimen.patient_name}</strong> · UHID: <strong className="text-foreground">{selectedSpecimen.uhid}</strong> · Barcode: <strong className="text-foreground">{selectedSpecimen.barcode}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedSpecimen.collection_status === "released" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Released to EMR
                      </span>
                    ) : (
                      <button
                        onClick={() => handleReleaseReport(selectedSpecimen.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 font-bold shadow-md shadow-emerald-600/20"
                      >
                        <FileCheck className="w-4 h-4" /> Pathologist Sign &amp; Release
                      </button>
                    )}
                  </div>
                </div>

                {/* Automated Delta Check Banner */}
                {selectedSpecimen.delta_details && (
                  <div
                    className={`p-4 rounded-2xl border space-y-1 text-xs ${
                      selectedSpecimen.delta_check_flag === "DELTA_WARNING"
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200"
                        : "border-rose-500/40 bg-rose-500/10 text-rose-900 dark:text-rose-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold">
                      <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      Automated Delta Check Alert Triggered ({selectedSpecimen.delta_check_flag})
                    </div>
                    <p className="text-[11px] leading-relaxed font-mono">
                      {selectedSpecimen.delta_details}
                    </p>
                  </div>
                )}

                {/* Analyzer Output Table */}
                <div className="rounded-2xl border border-border/80 bg-card overflow-hidden">
                  <div className="p-4 bg-muted/20 border-b border-border/60 font-bold text-xs flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-primary" /> Automated Hematology / Chemistry Analyzer Parameters
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground">Sysmex XN-1000 Series</span>
                  </div>

                  <table className="w-full text-left text-xs border-collapse font-mono">
                    <thead>
                      <tr className="border-b border-border/60 text-muted-foreground uppercase text-[10px] bg-muted/10">
                        <th className="py-2.5 px-4">Parameter</th>
                        <th className="py-2.5 px-4">Measured Value</th>
                        <th className="py-2.5 px-4">Unit</th>
                        <th className="py-2.5 px-4">Biological Reference Range</th>
                        <th className="py-2.5 px-4 text-right">Diagnostic Flag</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {selectedSpecimen.results_json &&
                        Object.entries(selectedSpecimen.results_json).map(([param, val]: [string, any]) => (
                          <tr key={param} className="hover:bg-muted/20 transition-colors">
                            <td className="py-3 px-4 font-bold text-foreground font-sans">{param}</td>
                            <td className="py-3 px-4 font-bold text-sm">
                              {typeof val.value === "number" ? val.value.toLocaleString() : val.value}
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">{val.unit}</td>
                            <td className="py-3 px-4 text-muted-foreground">{val.ref}</td>
                            <td className="py-3 px-4 text-right">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                                  val.flag === "HIGH"
                                    ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                                    : val.flag === "LOW"
                                    ? "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400"
                                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                                }`}
                              >
                                {val.flag}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* Pathologist Stamp Footer */}
                <div className="p-4 rounded-2xl bg-muted/20 border border-border/60 flex items-center justify-between text-xs font-mono">
                  <div>
                    <div className="text-muted-foreground text-[10px]">Verified &amp; Electronically Signed By:</div>
                    <div className="font-bold text-foreground mt-0.5">{selectedSpecimen.pathologist_name || "Dr. Sunita Rao, MD (Pathology)"}</div>
                  </div>
                  <div className="text-right text-[10px] text-muted-foreground">
                    <div>Delta Tolerance Threshold: ±15%</div>
                    <div className="text-emerald-600 dark:text-emerald-400 font-bold">CAP / NABL Compliant Engine</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-xs text-muted-foreground">
                Select a specimen from the list to view laboratory analyzer parameters and delta checks.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Collect Specimen Modal */}
      {showCollectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Barcode className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-foreground font-heading">
                  Phlebotomy Specimen Draw &amp; Barcode
                </h3>
              </div>
              <button
                onClick={() => setShowCollectModal(false)}
                className="rounded-xl p-1 text-muted-foreground hover:bg-muted"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-bold text-muted-foreground block mb-1">Patient Name</label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted-foreground block mb-1">UHID</label>
                <input
                  type="text"
                  value={uhid}
                  onChange={(e) => setUhid(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted-foreground block mb-1">Laboratory Panel Ordered</label>
                <select
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold"
                >
                  <option>Complete Blood Count (CBC) with Differential</option>
                  <option>Comprehensive Metabolic Panel (CMP)</option>
                  <option>Arterial Blood Gas (ABG)</option>
                  <option>Prothrombin Time / INR Coagulation Panel</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted-foreground block mb-1">Specimen Tube Type</label>
                <select
                  value={specimenType}
                  onChange={(e) => setSpecimenType(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs"
                >
                  <option>Whole Blood (EDTA Purple Top)</option>
                  <option>Serum (SST Gold Top)</option>
                  <option>Plasma (Citrate Blue Top)</option>
                  <option>Clean Catch Midstream Urine</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={() => setShowCollectModal(false)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCollectSpecimen}
                className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-white shadow-md shadow-primary/25 hover:bg-primary/90"
              >
                Generate Barcode &amp; Record Draw
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LISManagement;
