import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { API_BASE_URL } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Loader2, Plus, AlertCircle, Clock, Activity, ScanLine, Users, AlertTriangle, Timer, CheckCircle, X, TrendingUp, BedDouble } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TriageAssessmentModal } from "@/pages/hospital/TriageAssessmentModal";
import { ResourceLoadBalancer } from "@/pages/hospital/ResourceLoadBalancer";
import { FederatedImaging } from "@/components/hospital/fl/FederatedImaging";

export type PriorityLevel = "RED" | "ORANGE" | "YELLOW" | "GREEN" | "BLUE";

export interface TriagePatient {
    id: string;
    patient_name: string;
    patient_id?: string;
    arrival_time: string;
    vitals: {
        hr: string;
        bp: string;
        spo2: string;
        temp: string;
    };
    symptoms?: string;
    priority_level?: PriorityLevel;
    ai_confidence?: number;
    ai_reasoning?: string;
    category?: PriorityLevel;
    chief_complaint?: string;
    ai_summary?: string;
    risk_score?: number;
    recommended_action?: string;
    status: string;
    bed_assigned?: string;
}

const PRIORITY_ORDER: Record<PriorityLevel, number> = {
    RED: 1,
    ORANGE: 2,
    YELLOW: 3,
    GREEN: 4,
    BLUE: 5,
};

const PRIORITY_COLORS: Record<PriorityLevel, string> = {
    RED: "bg-red-500/10 text-red-500 border-red-500/20",
    ORANGE: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    YELLOW: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    GREEN: "bg-green-500/10 text-green-500 border-green-500/20",
    BLUE: "bg-blue-500/10 text-blue-500 border-blue-500/20",
};

export default function HospitalDashboard({ defaultTab = 'queue' }: { defaultTab?: 'queue' | 'resources' | 'federation' }) {
    const navigate = useNavigate();
    const [queue, setQueue] = useState<TriagePatient[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [error, setError] = useState("");
    
    // Assign Bed Bridge State
    const [availableBeds, setAvailableBeds] = useState<any[]>([]);
    const [isBedModalOpen, setIsBedModalOpen] = useState(false);
    const [patientToAssignBed, setPatientToAssignBed] = useState<TriagePatient | null>(null);
    const [selectedBedId, setSelectedBedId] = useState("");

    const openBedModal = async (patient: TriagePatient) => {
        setPatientToAssignBed(patient);
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;
        const BACKEND_URL = API_BASE_URL;
        try {
            const res = await fetch(`${BACKEND_URL}/resource/beds/${userData.user.id}`);
            if (res.ok) {
                const beds = await res.json();
                setAvailableBeds(beds.filter((b: any) => b.status === "available"));
            }
        } catch (e) {
            console.error(e);
        }
        setIsBedModalOpen(true);
    };

    const confirmAssignBed = async () => {
        if (!patientToAssignBed || !selectedBedId) return;
        const BACKEND_URL = API_BASE_URL;
        try {
            await fetch(`${BACKEND_URL}/resource/beds/${selectedBedId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: "occupied",
                    patient_id: patientToAssignBed.patient_id,
                    triage_id: patientToAssignBed.id,
                    priority_assigned: patientToAssignBed.priority_level || patientToAssignBed.category || "YELLOW"
                })
            });
            await markAttended(patientToAssignBed.id);
            setIsBedModalOpen(false);
            setPatientToAssignBed(null);
            setSelectedBedId("");
        } catch (err) {
            console.error("Failed to assign bed:", err);
        }
    };

    const fetchQueue = async () => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) return;

            const { data, error } = await supabase
                .from("triage_queue")
                .select("*")
                .eq("hospital_id", userData.user.id)
                .eq("status", "waiting")
                .order("arrival_time", { ascending: true });

            if (error) throw error;

            // Sort in JS to ensure Priority overrides Arrival Time
            const sorted = (data || []).sort((a, b) => {
                const pA = PRIORITY_ORDER[(a.priority_level || a.category) as PriorityLevel] || 6;
                const pB = PRIORITY_ORDER[(b.priority_level || b.category) as PriorityLevel] || 6;
                if (pA !== pB) return pA - pB;
                return new Date(a.arrival_time).getTime() - new Date(b.arrival_time).getTime();
            });

            setQueue(sorted as TriagePatient[]);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to load triage queue");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchQueue();

        const channel = supabase
            .channel("triage_queue_changes")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "triage_queue" },
                () => { fetchQueue(); }
            )
            .on(
                "postgres_changes",
                { event: "UPDATE", schema: "public", table: "triage_queue" },
                () => { fetchQueue(); }
            )
            .on(
                "postgres_changes",
                { event: "DELETE", schema: "public", table: "triage_queue" },
                () => { fetchQueue(); }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const formatWaitTime = (arrivalTime: string) => {
        const diff = Date.now() - new Date(arrivalTime).getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        return `${hours}h ${minutes % 60}m`;
    };

    const getLoadIndex = () => {
        if (queue.length === 0) return "Low";
        if (queue.length < 5) return "Moderate";
        return "Peak";
    };

    const criticalPatientsCount = queue.filter(p => (p.priority_level === 'RED' || p.category === 'RED' || p.priority_level === 'ORANGE' || p.category === 'ORANGE')).length;

    const markAttended = async (patientId: string) => {
        try {
            const { error } = await supabase
                .from("triage_queue")
                .update({ status: "in_treatment" })
                .eq("id", patientId);

            if (error) throw error;
            // Optimistically remove from local state for instant UI feedback
            setQueue(prev => prev.filter(p => p.id !== patientId));
        } catch (err: any) {
            console.error("Failed to mark patient as attended:", err);
        }
    };

    if (defaultTab === 'resources') {
        return (
            <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
                <ResourceLoadBalancer />
            </div>
        );
    }

    if (defaultTab === 'federation') {
        return (
            <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
                <FederatedImaging />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
            {/* Header with Main Add Patient Action Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-black tracking-tight text-foreground">
                            Emergency Triage Queue
                        </h1>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            Active Live Feed
                        </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        Real-time AI-prioritized patient intake & clinical urgency stream
                    </p>
                </div>

                <Button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-primary hover:bg-primary/90 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-primary/25 flex items-center gap-2 self-start sm:self-auto"
                >
                    <Plus className="w-5 h-5" />
                    Add Patient to Triage
                </Button>
            </div>

            {/* Quick Stats Row */}
            {!isLoading && !error && (
                <div className="flex flex-col md:flex-row gap-6">
                    <Card className="flex-1 glass-card border-l-4 border-l-primary/50 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-2 opacity-5">
                            <Users className="w-16 h-16" />
                        </div>
                        <CardContent className="p-6 flex items-center gap-4 relative z-10">
                            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                                <Users className="w-7 h-7 text-primary" />
                            </div>
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/70">Total in Queue</p>
                                <div className="flex items-baseline gap-2">
                                    <h3 className="text-3xl font-bold tracking-tighter">{queue.length}</h3>
                                    <span className="text-[10px] font-bold text-primary px-1.5 py-0.5 rounded-full bg-primary/10 border border-primary/20">Active</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="flex-1 glass-card border-l-4 border-l-orange-500/50 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-2 opacity-5">
                            <AlertTriangle className="w-16 h-16" />
                        </div>
                        <CardContent className="p-6 flex items-center gap-4 relative z-10">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border transition-all ${criticalPatientsCount > 0 ? 'bg-orange-500/20 border-orange-500/30 animate-pulse' : 'bg-orange-500/10 border-orange-500/20'}`}>
                                <AlertTriangle className="w-7 h-7 text-orange-500" />
                            </div>
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/70">Critical / High Risk</p>
                                <div className="flex items-baseline gap-2">
                                    <h3 className={`text-3xl font-bold tracking-tighter ${criticalPatientsCount > 0 ? 'text-orange-600 dark:text-orange-400' : ''}`}>
                                        {criticalPatientsCount}
                                    </h3>
                                    {criticalPatientsCount > 0 && (
                                        <span className="text-[10px] font-bold text-orange-600 px-1.5 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20">Attention Required</span>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="flex-1 glass-card border-l-4 border-l-indigo-500/50 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-2 opacity-5">
                            <Activity className="w-16 h-16" />
                        </div>
                        <CardContent className="p-6 flex items-center gap-4 relative z-10">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20 group-hover:bg-indigo-500/20 transition-colors">
                                <TrendingUp className="w-7 h-7 text-indigo-500" />
                            </div>
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/70">Average Wait Time</p>
                                <div className="flex items-baseline gap-2">
                                    <h3 className="text-3xl font-bold tracking-tighter">
                                        {queue.length > 0 ? formatWaitTime(queue[0].arrival_time) : "0m"}
                                    </h3>
                                    <span className="text-[10px] font-bold text-indigo-500 px-1.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                                        Estimated
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {/* Loading State */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    <p className="text-sm font-medium text-muted-foreground animate-pulse">Syncing dynamic emergency queue...</p>
                </div>
            ) : queue.length === 0 ? (
                <Card className="glass-card border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 rounded-full bg-muted/40 flex items-center justify-center mb-4">
                            <Clock className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground mb-1">Queue is Currently Empty</h3>
                        <p className="text-sm text-muted-foreground max-w-sm mb-6">
                            No emergency patients are currently waiting for treatment. Click below to add a new triage assessment.
                        </p>
                        <Button onClick={() => setIsModalOpen(true)} className="bg-primary hover:bg-primary/90 text-white font-bold gap-2">
                            <Plus className="w-4 h-4" /> Add Patient to Triage
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    <AnimatePresence>
                        {queue.map((patient, index) => (
                            <motion.div
                                key={patient.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.3, delay: index * 0.05 }}
                            >
                                <Card className={`glass-card overflow-hidden border-2 transition-all hover:shadow-xl hover:scale-[1.01] duration-300 ${(patient.priority_level || patient.category) === 'RED' ? 'border-red-500/30 ring-1 ring-red-500/20' :
                                    (patient.priority_level || patient.category) === 'ORANGE' ? 'border-orange-500/30 ring-1 ring-orange-500/20' :
                                        (patient.priority_level || patient.category) === 'YELLOW' ? 'border-yellow-500/30 ring-1 ring-yellow-500/20' :
                                            (patient.priority_level || patient.category) === 'GREEN' ? 'border-green-500/30 ring-1 ring-green-500/20' :
                                                'border-blue-500/30 ring-1 ring-blue-500/20'
                                    }`}>
                                    <CardContent className="p-0">
                                        <div className="flex flex-col lg:flex-row items-stretch">
                                            {/* Side Priority Indicator (Vertical) */}
                                            <div className={`w-2 shrink-0 ${(patient.priority_level || patient.category) === 'RED' ? 'bg-red-500' :
                                                (patient.priority_level || patient.category) === 'ORANGE' ? 'bg-orange-500' :
                                                    (patient.priority_level || patient.category) === 'YELLOW' ? 'bg-yellow-500' :
                                                        (patient.priority_level || patient.category) === 'GREEN' ? 'bg-green-500' : 'bg-blue-500'
                                                }`} />

                                            <div className="flex-1 p-6">
                                                <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
                                                    {/* Patient Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-3 mb-3">
                                                            <div className="w-12 h-12 rounded-xl bg-muted/50 border border-border/50 flex items-center justify-center shrink-0">
                                                                <Users className="w-6 h-6 text-muted-foreground" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <h3 className="text-xl font-bold text-foreground truncate tracking-tight">
                                                                    {patient.patient_name}
                                                                </h3>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    {(() => {
                                                                        const pLevel = (patient.priority_level || patient.category || 'GREEN') as PriorityLevel;
                                                                        return (
                                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${PRIORITY_COLORS[pLevel] || PRIORITY_COLORS.GREEN}`}>
                                                                                Level {PRIORITY_ORDER[pLevel] || 4} — {pLevel}
                                                                            </span>
                                                                        );
                                                                    })()}
                                                                    <div className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                                                                        <Clock className="w-3 h-3" />
                                                                        {formatWaitTime(patient.arrival_time)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Vitals Readout (Grid) */}
                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                            <div className="p-2 rounded-lg bg-background/40 border border-border/40 flex flex-col">
                                                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Heart Rate</span>
                                                                <span className="text-sm font-bold text-foreground">{patient.vitals?.hr || '--'} <span className="text-[10px] font-normal opacity-60 italic">bpm</span></span>
                                                            </div>
                                                            <div className="p-2 rounded-lg bg-background/40 border border-border/40 flex flex-col">
                                                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Blood Pressure</span>
                                                                <span className="text-sm font-bold text-foreground">{patient.vitals?.bp || '--'} <span className="text-[10px] font-normal opacity-60 italic">mmHg</span></span>
                                                            </div>
                                                            <div className="p-2 rounded-lg bg-background/40 border border-border/40 flex flex-col">
                                                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">SpO2</span>
                                                                <span className="text-sm font-bold text-foreground">{patient.vitals?.spo2 || '--'}<span className="text-[10px] font-normal opacity-60 italic">%</span></span>
                                                            </div>
                                                            <div className="p-2 rounded-lg bg-background/40 border border-border/40 flex flex-col">
                                                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Temp</span>
                                                                <span className="text-sm font-bold text-foreground">{patient.vitals?.temp || '--'}<span className="text-[10px] font-normal opacity-60 italic">°</span></span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* AI Reasoning Box */}
                                                    <div className="flex-[1.2] h-full flex flex-col bg-muted/20 rounded-xl p-4 border border-primary/10 relative overflow-hidden group/box">
                                                        <div className="absolute top-0 right-0 p-1 opacity-10 group-hover/box:opacity-20 transition-opacity">
                                                            <Activity className="w-12 h-12 text-primary" />
                                                        </div>
                                                        <div className="flex items-center gap-2 mb-2 relative z-10">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Clinical Insight</span>
                                                            <span className="text-[10px] ml-auto font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                                                                {patient.ai_confidence || 85}% Confidence
                                                            </span>
                                                        </div>
                                                        <p className="text-xs leading-relaxed text-foreground/90 italic font-medium relative z-10 line-clamp-3">
                                                            "{patient.ai_reasoning || patient.ai_summary || patient.chief_complaint || 'No symptoms reported'}"
                                                        </p>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex flex-row lg:flex-col gap-2 shrink-0 w-full lg:w-36">
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => {
                                                                const targetId = patient.patient_id || patient.id;
                                                                navigate(`/doctor/patient/${targetId}?name=${encodeURIComponent(patient.patient_name)}`);
                                                            }}
                                                            className="flex-1 border-primary/30 hover:bg-primary/5 hover:text-primary gap-2 font-bold text-xs"
                                                        >
                                                            <ScanLine className="w-3.5 h-3.5" /> Full EHR
                                                        </Button>

                                                        <Button
                                                            variant="outline"
                                                            onClick={() => openBedModal(patient)}
                                                            className="flex-1 border-indigo-500/30 hover:bg-indigo-500/5 hover:text-indigo-500 gap-2 font-bold text-xs"
                                                        >
                                                            <BedDouble className="w-3.5 h-3.5" /> Assign Bed
                                                        </Button>

                                                        <Button
                                                            onClick={() => markAttended(patient.id)}
                                                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold text-xs shadow-md shadow-emerald-600/20"
                                                        >
                                                            <CheckCircle className="w-3.5 h-3.5" /> Attend
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Bed Assignment Modal */}
            <AnimatePresence>
                {isBedModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
                        >
                            <div className="p-6 border-b border-border/50 flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-lg text-foreground">Assign Bed Facility</h3>
                                    <p className="text-xs text-muted-foreground">Assigning patient: {patientToAssignBed?.patient_name}</p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setIsBedModalOpen(false)} className="rounded-full w-8 h-8 p-0">
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="p-6 space-y-4">
                                {availableBeds.length === 0 ? (
                                    <div className="text-center py-6 text-muted-foreground text-sm">
                                        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-orange-500 opacity-60" />
                                        No available beds found. Please synchronize beds or free up an occupied bed.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Select Target Bed</label>
                                        <select
                                            value={selectedBedId}
                                            onChange={(e) => setSelectedBedId(e.target.value)}
                                            className="w-full p-3 rounded-xl bg-background border border-border text-foreground font-semibold text-sm"
                                        >
                                            <option value="">-- Choose Available Bed --</option>
                                            {availableBeds.map(b => (
                                                <option key={b.id} value={b.id}>
                                                    [{b.ward_type}] Bed {b.bed_number}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 bg-muted/20 border-t border-border/50 flex justify-end gap-2">
                                <Button variant="ghost" onClick={() => setIsBedModalOpen(false)}>Cancel</Button>
                                <Button
                                    disabled={!selectedBedId}
                                    onClick={confirmAssignBed}
                                    className="bg-primary hover:bg-primary/90 text-white font-bold"
                                >
                                    Confirm Assignment
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Assessment Modal with Live Re-fetch */}
            {isModalOpen && (
                <TriageAssessmentModal
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={fetchQueue}
                />
            )}
        </div>
    );
}
