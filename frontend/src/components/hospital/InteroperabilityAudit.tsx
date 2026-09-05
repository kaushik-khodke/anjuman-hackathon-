import React, { useState, useEffect } from "react";
import {
  Share2,
  ShieldAlert,
  FileCode,
  QrCode,
  CheckCircle2,
  Download,
  Search,
  Copy,
  Check,
  ShieldCheck,
  Building,
  Key,
  Lock,
  Layers,
  Sparkles,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface AuditLog {
  id: string;
  timestamp: string;
  user_id: string;
  user_role: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details_json: Record<string, any>;
  ip_address: string;
  integrity_hash: string;
}

interface ABHAProfile {
  uhid: string;
  abha_number: string;
  abha_address: string;
  full_name: string;
  gender: string;
  dob: string;
  mobile: string;
  hip_name: string;
  consent_status: string;
}

export function InteroperabilityAudit() {
  const [activeTab, setActiveTab] = useState<"FHIR" | "ABDM" | "AUDIT">("FHIR");

  // FHIR State
  const [fhirJson, setFhirJson] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  // ABDM State
  const [abha, setAbha] = useState<ABHAProfile | null>(null);

  // Audit State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    fetchFHIR();
    fetchABDM();
    fetchAuditLogs();
  }, []);

  async function fetchFHIR() {
    try {
      const res = await fetch(`${API_BASE_URL}/hms/surgical-interop/fhir/r4/Bundle/UHID-2026-0012`);
      if (res.ok) {
        const data = await res.json();
        setFhirJson(data);
      }
    } catch (e) {
      console.error("FHIR fetch error:", e);
    }
  }

  async function fetchABDM() {
    try {
      const res = await fetch(`${API_BASE_URL}/hms/surgical-interop/abdm/profile/UHID-2026-0012`);
      if (res.ok) {
        const data = await res.json();
        setAbha(data);
      }
    } catch (e) {
      console.error("ABDM error:", e);
    }
  }

  async function fetchAuditLogs() {
    try {
      const res = await fetch(`${API_BASE_URL}/hms/surgical-interop/compliance/audit-logs`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch (e) {
      console.error("Audit log error:", e);
    }
  }

  function handleCopyFHIR() {
    if (!fhirJson) return;
    navigator.clipboard.writeText(JSON.stringify(fhirJson, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownloadFHIR() {
    if (!fhirJson) return;
    const blob = new Blob([JSON.stringify(fhirJson, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "FHIR-R4-Bundle-UHID-2026-0012.json";
    a.click();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card rounded-3xl border border-border/80 bg-white/90 dark:bg-card/90 p-6 backdrop-blur-xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Share2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground font-heading">
                Interoperability (HL7 FHIR v4.0), ABDM &amp; Compliance Audit Trail
              </h2>
              <p className="text-xs text-muted-foreground font-mono">
                Certified HL7 FHIR Release 4.0 Bundle generator, Ayushman Bharat (ABDM/ABHA) gateway, and tamper-evident HIPAA/NABH access logs
              </p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-1.5 rounded-2xl bg-muted/40 p-1.5 border border-border/60 text-xs font-bold">
            <button
              onClick={() => setActiveTab("FHIR")}
              className={`rounded-xl px-3.5 py-1.5 transition-all ${
                activeTab === "FHIR"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              🔥 HL7 FHIR v4.0
            </button>
            <button
              onClick={() => setActiveTab("ABDM")}
              className={`rounded-xl px-3.5 py-1.5 transition-all ${
                activeTab === "ABDM"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              🇮🇳 ABDM &amp; ABHA
            </button>
            <button
              onClick={() => setActiveTab("AUDIT")}
              className={`rounded-xl px-3.5 py-1.5 transition-all ${
                activeTab === "AUDIT"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              🔒 Compliance Audit Trail
            </button>
          </div>
        </div>

        {/* 1. HL7 FHIR v4.0 Bundle Inspector */}
        {activeTab === "FHIR" && (
          <div className="pt-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-border/80 bg-muted/20 text-xs">
              <div>
                <div className="text-sm font-bold text-foreground">Certified HL7 FHIR Document Bundle (Release 4.0.1)</div>
                <div className="text-muted-foreground font-mono mt-0.5">
                  Resources Included: <code>Patient</code> · <code>Encounter</code> · <code>Condition (ICD-10)</code> · <code>MedicationRequest (RxNorm)</code> · <code>Observation (LOINC)</code>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyFHIR}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-muted-foreground hover:text-foreground shadow-sm"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied!" : "Copy JSON"}
                </button>
                <button
                  onClick={handleDownloadFHIR}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-md shadow-primary/25 hover:bg-primary/90"
                >
                  <Download className="w-4 h-4" /> Download FHIR Bundle
                </button>
              </div>
            </div>

            {/* Code Viewport */}
            <div className="rounded-3xl border border-border/80 bg-zinc-950 p-5 text-zinc-200 font-mono text-xs overflow-x-auto max-h-[60vh] shadow-inner leading-relaxed">
              <pre>{JSON.stringify(fhirJson, null, 2)}</pre>
            </div>
          </div>
        )}

        {/* 2. ABDM & ABHA Card Gateway */}
        {activeTab === "ABDM" && (
          <div className="pt-5 space-y-6">
            <div className="text-xs text-muted-foreground font-mono">
              National Health Authority (NHA) Ayushman Bharat Digital Mission (ABDM) Integration Gateway
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Digital ABHA Card */}
              {abha && (
                <div className="p-6 rounded-3xl border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card space-y-4 shadow-xl text-xs relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <div className="flex items-center gap-2 font-bold text-foreground">
                      <ShieldCheck className="w-5 h-5 text-primary" />
                      <div>
                        <div className="text-sm font-black font-heading tracking-tight">ABHA HEALTH CARD</div>
                        <div className="text-[10px] text-muted-foreground font-mono">Ayushman Bharat Digital Mission</div>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      ✓ NHA VERIFIED
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-2">
                    <div className="col-span-2 space-y-2">
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase font-bold">Full Name</div>
                        <div className="text-base font-bold text-foreground">{abha.full_name}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase font-bold">14-Digit ABHA Number</div>
                        <div className="text-sm font-black font-mono text-primary">{abha.abha_number}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase font-bold">ABHA Address</div>
                        <div className="font-mono text-foreground font-bold">{abha.abha_address}</div>
                      </div>
                      <div className="flex gap-4 pt-1 font-mono text-[11px] text-muted-foreground">
                        <span>DOB: {abha.dob}</span>
                        <span>Gender: {abha.gender}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white text-black border border-border shadow-md">
                      <QrCode className="w-20 h-20 text-slate-900" />
                      <span className="text-[8px] font-mono text-muted-foreground mt-1">Scan to link EMR</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border/60 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                    <span>Facility HIP: {abha.hip_name}</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{abha.consent_status}</span>
                  </div>
                </div>
              )}

              {/* ABDM Consent Manager Simulator */}
              <div className="p-6 rounded-3xl border border-border/80 bg-card space-y-4 text-xs">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground border-b border-border/60 pb-3">
                  <Key className="w-4 h-4 text-primary" /> ABDM Consent Manager (HIP / HIU Gateway)
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-muted/20 border border-border/60 space-y-1">
                    <div className="font-bold text-foreground">Health Information User (HIU) Access Request</div>
                    <p className="text-[11px] text-muted-foreground">
                      Consents to securely share Diagnostic Reports, CPOE Prescriptions, and Inpatient Discharge Summaries with registered ABDM health locker apps (e.g. Aarogya Setu / ABHA App).
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-mono text-[11px]">
                    <span>Consent Artifact Status:</span>
                    <strong>ACTIVE (Valid till 2027-08-25)</strong>
                  </div>

                  <div className="text-[11px] text-muted-foreground space-y-1">
                    <div>• Data Types: DiagnosticReport, Prescription, DischargeSummary</div>
                    <div>• Cryptographic Envelope: RSA-OAEP + AES-GCM Encryption</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. Immutable Compliance Audit Trail */}
        {activeTab === "AUDIT" && (
          <div className="pt-5 space-y-4">
            <div className="text-xs text-muted-foreground font-mono">
              Tamper-evident, cryptographically hashed access and transaction log for HIPAA Security Rule and NABH standard compliance.
            </div>

            <div className="rounded-2xl border border-border/80 bg-card overflow-hidden">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground uppercase text-[10px] bg-muted/10">
                    <th className="py-3 px-4">Timestamp (UTC)</th>
                    <th className="py-3 px-4">Operator &amp; Role</th>
                    <th className="py-3 px-4">Action Performed</th>
                    <th className="py-3 px-4">Resource Target</th>
                    <th className="py-3 px-4">IP Address</th>
                    <th className="py-3 px-4 text-right">SHA-256 Checksum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3.5 px-4 text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-foreground">{log.user_id}</span>
                        <span className="text-[10px] text-muted-foreground block uppercase">[{log.user_role}]</span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-primary">{log.action}</td>
                      <td className="py-3.5 px-4 text-muted-foreground">{log.resource_type} ({log.resource_id})</td>
                      <td className="py-3.5 px-4 text-muted-foreground">{log.ip_address}</td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="rounded bg-muted px-2 py-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold truncate max-w-[120px] inline-block">
                          {log.integrity_hash.slice(0, 16)}…
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
    </div>
  );
}

export default InteroperabilityAudit;
