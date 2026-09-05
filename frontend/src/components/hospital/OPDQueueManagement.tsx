import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  UserCheck,
  UserPlus,
  Tv,
  CheckCircle2,
  AlertTriangle,
  Stethoscope,
  Search,
  Filter,
  Plus,
  Loader2,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  Users,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface OPDAppointment {
  id: string;
  uhid: string;
  patient_name: string;
  patient_phone?: string;
  doctor_name: string;
  department: string;
  appointment_date: string;
  slot_time: string;
  token_number: number;
  status: "booked" | "checked_in" | "in_consultation" | "completed" | "cancelled";
  triage_priority: "RED" | "ORANGE" | "YELLOW" | "GREEN" | "BLUE";
  chief_complaint?: string;
}

export function OPDQueueManagement() {
  const [appointments, setAppointments] = useState<OPDAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isTvMode, setIsTvMode] = useState(false);

  // New Appointment Booking Form State
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("1994-05-12");
  const [doctorName, setDoctorName] = useState("Dr. Marcus Vance, MD (Cardiology)");
  const [slotTime, setSlotTime] = useState("10:30:00");
  const [chiefComplaint, setChiefComplaint] = useState("Chest tightness and exertion dyspnea");
  
  // Fuzzy Deduplication State
  const [isCheckingFuzzy, setIsCheckingFuzzy] = useState(false);
  const [fuzzyWarning, setFuzzyWarning] = useState<any | null>(null);

  useEffect(() => {
    fetchQueue();
  }, []);

  async function fetchQueue() {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/hms/opd/queue`);
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.queue || []);
      }
    } catch (e) {
      console.error("Failed to load OPD queue:", e);
    } finally {
      setIsLoading(false);
    }
  }

  // Check fuzzy deduplication before booking
  async function checkFuzzyDuplicates() {
    if (!patientName.trim()) return;
    setIsCheckingFuzzy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/hms/patients/fuzzy-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: patientName,
          phone,
          date_of_birth: dob,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.is_duplicate_suspected) {
          setFuzzyWarning(data.potential_matches[0]);
        } else {
          setFuzzyWarning(null);
        }
      }
    } catch (e) {
      console.error("Fuzzy check failed:", e);
    } finally {
      setIsCheckingFuzzy(false);
    }
  }

  async function handleBookAppointment(e: React.FormEvent) {
    e.preventDefault();
    if (!patientName.trim()) return;

    setIsLoading(true);
    try {
      const payload = {
        uhid: fuzzyWarning?.uhid || `UHID-${patientName.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase() || 'PAT'}-${Date.now().toString().slice(-4)}`,
        patient_name: patientName,
        phone: phone || "0987654321",
        patient_phone: phone || "0987654321",
        date_of_birth: dob || "1994-08-29",
        doctor_id: "doc-01",
        doctor_name: doctorName || "Dr. Marcus Vance, MD (Cardiology)",
        department: "Cardiology",
        appointment_date: new Date().toISOString().split("T")[0],
        slot_time: slotTime || "10:00 AM",
        chief_complaint: chiefComplaint || "General Outpatient Consultation",
      };

      const res = await fetch(`${API_BASE_URL}/hms/opd/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowBookingModal(false);
        setPatientName("");
        setPhone("");
        setDob("");
        setChiefComplaint("");
        setFuzzyWarning(null);
        fetchQueue();
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.error("Booking error response:", errJson);
      }
    } catch (e) {
      console.error("Booking error:", e);
    } finally {
      setIsLoading(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    try {
      await fetch(`${API_BASE_URL}/hms/opd/status/${id}?status=${status}`, {
        method: "POST",
      });
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: status as any } : a))
      );
    } catch (e) {
      console.error("Failed to update status:", e);
    }
  }

  // TV Monitor View Mode
  if (isTvMode) {
    return (
      <div className="fixed inset-0 z-50 bg-background text-foreground p-8 flex flex-col space-y-6 animate-fadeIn">
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <Tv className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-black font-heading tracking-tight">
                Outpatient Department (OPD) Live Queue Monitor
              </h1>
              <p className="text-sm text-muted-foreground font-mono">
                Real-time Clinic Consultation Tokens &amp; Waiting Lounge Status
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsTvMode(false)}
            className="rounded-xl border border-border px-4 py-2 text-xs font-bold hover:bg-muted"
          >
            Exit TV Mode
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
          {/* In Consultation */}
          <div className="rounded-3xl border-2 border-emerald-500/40 bg-emerald-500/5 p-6 space-y-4">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-sm uppercase tracking-wider">
              <Stethoscope className="w-5 h-5" /> Now In Consultation
            </div>
            <div className="space-y-3">
              {appointments.filter((a) => a.status === "in_consultation").length === 0 ? (
                <div className="py-10 text-center text-xs text-muted-foreground">
                  Consultation Room Calling Next Patient…
                </div>
              ) : (
                appointments
                  .filter((a) => a.status === "in_consultation")
                  .map((a) => (
                    <div key={a.id} className="p-4 rounded-2xl bg-card border border-emerald-500/30 shadow-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                          Token #{a.token_number}
                        </span>
                        <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                          Room 101
                        </span>
                      </div>
                      <div className="font-bold text-base text-foreground">{a.patient_name}</div>
                      <div className="text-xs text-muted-foreground">{a.doctor_name}</div>
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* Checked-in Waiting */}
          <div className="rounded-3xl border border-primary/30 bg-primary/5 p-6 space-y-4 md:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary font-black text-sm uppercase tracking-wider">
                <Users className="w-5 h-5" /> Waiting Room Queue
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                {appointments.filter((a) => a.status === "checked_in").length} Patients in Lounge
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {appointments
                .filter((a) => a.status === "checked_in")
                .map((a) => (
                  <div key={a.id} className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-between">
                    <div>
                      <div className="text-xl font-black font-mono text-primary">
                        Token #{a.token_number}
                      </div>
                      <div className="font-bold text-sm text-foreground mt-0.5">{a.patient_name}</div>
                      <div className="text-xs text-muted-foreground">{a.slot_time} · {a.doctor_name}</div>
                    </div>
                    <span className="rounded-xl bg-muted px-3 py-1.5 text-xs font-bold font-mono">
                      ~10m wait
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="glass-card rounded-3xl border border-border/80 bg-white/90 dark:bg-card/90 p-6 backdrop-blur-xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground font-heading">
                Outpatient Department (OPD) &amp; Clinic Queue
              </h2>
              <p className="text-xs text-muted-foreground font-mono">
                Manage doctor availability, walk-in tokens, and fuzzy-matching patient registrations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsTvMode(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground shadow-sm"
            >
              <Tv className="w-4 h-4 text-primary" /> Waiting Lounge TV
            </button>
            <button
              onClick={() => setShowBookingModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-md shadow-primary/25 hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" /> Book OPD Patient Token
            </button>
          </div>
        </div>

        {/* Queue Table */}
        <div className="pt-4 overflow-x-auto">
          {isLoading ? (
            <div className="py-12 flex items-center justify-center text-xs text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2 text-primary" /> Loading live OPD token queue…
            </div>
          ) : appointments.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
              <UserCheck className="w-8 h-8 text-muted-foreground/40 mx-auto" />
              <p className="font-bold text-foreground">No OPD Appointments Booked for Today</p>
              <p className="max-w-sm mx-auto">
                Click "+ Book OPD Patient Token" to register a patient, verify duplicate UHIDs with fuzzy matching, and issue a consultation queue token.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground uppercase text-[10px] font-mono">
                  <th className="py-3 px-3">Token #</th>
                  <th className="py-3 px-3">Patient &amp; UHID</th>
                  <th className="py-3 px-3">Consultant Doctor</th>
                  <th className="py-3 px-3">Slot Time</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Workflow Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-mono">
                {appointments.map((appt) => (
                  <tr key={appt.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-3">
                      <span className="inline-flex items-center justify-center h-8 w-12 rounded-xl bg-primary/10 border border-primary/25 font-black text-primary text-sm">
                        #{appt.token_number}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-foreground font-sans">{appt.patient_name}</div>
                      <div className="text-[11px] text-muted-foreground">{appt.uhid}</div>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-sans font-medium text-foreground">{appt.doctor_name}</div>
                      <div className="text-[11px] text-muted-foreground">{appt.department}</div>
                    </td>
                    <td className="py-3.5 px-3 text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-primary" /> {appt.slot_time}
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                          appt.status === "in_consultation"
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                            : appt.status === "checked_in"
                            ? "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400"
                            : appt.status === "completed"
                            ? "bg-muted border-border text-muted-foreground"
                            : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {appt.status.replace("_", " ").toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      {appt.status === "booked" && (
                        <button
                          onClick={() => updateStatus(appt.id, "checked_in")}
                          className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 text-[11px] font-bold shadow-sm"
                        >
                          Check In
                        </button>
                      )}
                      {appt.status === "checked_in" && (
                        <button
                          onClick={() => updateStatus(appt.id, "in_consultation")}
                          className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 text-[11px] font-bold shadow-sm"
                        >
                          Call Into Room
                        </button>
                      )}
                      {appt.status === "in_consultation" && (
                        <button
                          onClick={() => updateStatus(appt.id, "completed")}
                          className="rounded-lg border border-border hover:bg-muted text-muted-foreground px-3 py-1 text-[11px] font-bold"
                        >
                          Mark Completed
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Book OPD Appointment & Fuzzy Deduplication Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <UserPlus className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-foreground font-heading">
                  Register OPD Patient &amp; Issue Token
                </h3>
              </div>
              <button
                onClick={() => setShowBookingModal(false)}
                className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="text-[11px] font-bold text-foreground block mb-1">
                  Patient Full Name (Triggers Fuzzy Deduplication)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    onBlur={checkFuzzyDuplicates}
                    placeholder="e.g. Alice Smith"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                  {isCheckingFuzzy && (
                    <div className="absolute right-3 top-2 text-[10px] text-primary flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Fuzzy matching…
                    </div>
                  )}
                </div>
              </div>

              {/* Fuzzy Match Warning Banner */}
              {fuzzyWarning && (
                <div className="p-3.5 rounded-2xl border border-amber-500/40 bg-amber-500/10 space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                    <ShieldAlert className="w-4 h-4" /> Potential Existing Master Patient Found ({fuzzyWarning.similarity_score}% Match)
                  </div>
                  <p className="text-[11px] text-amber-900 dark:text-amber-200">
                    Existing Record: <strong>{fuzzyWarning.full_name}</strong> (UHID: <code className="font-mono">{fuzzyWarning.uhid}</code>).
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    This booking will link directly to existing master UHID to prevent duplicate medical records.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onBlur={checkFuzzyDuplicates}
                    placeholder="9876543210"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted-foreground block mb-1">Consulting Doctor</label>
                <select
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold"
                >
                  <option>Dr. Marcus Vance, MD (Cardiology)</option>
                  <option>Dr. Priya Sharma, MBBS (Internal Medicine)</option>
                  <option>Dr. Sarah Jenkins, MD (Pulmonology)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted-foreground block mb-1">Chief Complaint</label>
                <input
                  type="text"
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  placeholder="e.g. Persistent dry cough and fever"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={() => setShowBookingModal(false)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBookAppointment}
                disabled={!patientName.trim()}
                className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-white shadow-md shadow-primary/25 hover:bg-primary/90 disabled:opacity-50"
              >
                Generate Token &amp; Book OPD
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OPDQueueManagement;
