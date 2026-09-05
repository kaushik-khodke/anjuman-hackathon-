import { supabase } from "@/lib/supabase";
import { API_BASE_URL } from "@/lib/api";
import { sha256Hex } from "@/lib/fl-simulation";

export interface FLModel {
  id: string;
  name: string;
  short_name: string;
  modality: string;
  task: string;
  summary: string;
  description: string;
  architecture: string;
  parameters_count: string;
  classes: string[];
  input_spec: {
    resolution?: string;
    channels?: string;
    format?: string;
    ipfs_cid?: string;
    ipfs_gateway_url?: string;
    sample_dataset_cid?: string;
    sample_dataset_url?: string;
    sample_dataset_filename?: string;
    model_checkpoint_filename?: string;
    [key: string]: any;
  };
  data_requirements: Array<{ label: string; value: string }>;
  preprocessing_steps: string[];
  training_steps: Array<{ title: string; detail: string }>;
  base_accuracy: number;
  target_accuracy: number;
  current_accuracy: number;
  current_round: number;
  max_rounds: number;
  epsilon_max: number;
  current_epsilon: number;
  current_loss: number;
  current_mmd: number;
  status: "recruiting" | "training" | "converged";
  min_samples: number;
  accent: string;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface FLHospitalNode {
  id: string;
  model_id: string;
  hospital_id: string;
  hospital_name: string;
  hospital_code: string;
  region: string;
  scanner_model: string;
  local_samples_count: number;
  dataset_name?: string | null;
  dataset_size_mb?: number | null;
  node_status: "ready" | "synced" | "harmonized" | "quarantined" | "training" | "idle";
  is_adversarial: boolean;
  last_round_participated: number;
  local_loss?: number | null;
  local_accuracy?: number | null;
  joined_at?: string;
  updated_at?: string;
}

export interface FLTrainingJob {
  id: string;
  model_id: string;
  category?: string;
  modality?: string;
  hospital_id: string;
  hospital_name: string;
  dataset_name: string;
  sample_count: number;
  epochs: number;
  batch_size: number;
  baseline_accuracy: number;
  candidate_accuracy: number;
  candidate_f1: number;
  candidate_precision: number;
  candidate_recall: number;
  candidate_loss: number;
  gate_decision: "ACCEPTED" | "REJECTED" | "TRAINING" | "FAILED";
  gate_reason: string;
  duration_seconds: number;
  epoch_metrics: Array<{
    epoch: number;
    total_epochs: number;
    train_loss: number;
    train_accuracy: number;
    epoch_duration_seconds: number;
    eta_seconds: number;
    phase: string;
  }>;
  provenance_hash: string;
  pinata_cid?: string;
  gateway_url?: string;
  created_at?: string;
}

export interface FLAuditEvent {
  id: string;
  model_id: string;
  hospital_id?: string | null;
  event_type: string;
  event_description: string;
  source_node: string;
  provenance_hash: string;
  status: "Success" | "Harmonized" | "Blocked" | "Warning";
  created_at: string;
}

/** Fetch all models directly from Supabase fl_models table. */
export async function getFLModels(): Promise<FLModel[]> {
  try {
    const { data, error } = await supabase
      .from("fl_models")
      .select("*")
      .order("created_at", { ascending: true });

    if (error || !data) {
      return [];
    }
    return data as FLModel[];
  } catch (err) {
    console.error("Failed to load fl_models from Supabase:", err);
    return [];
  }
}

/** Fetch a single model by ID */
export async function getFLModelById(id: string): Promise<FLModel | undefined> {
  try {
    const { data, error } = await supabase
      .from("fl_models")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return undefined;
    return data as FLModel;
  } catch (err) {
    return undefined;
  }
}

/** Fetch participating hospital nodes for a model */
export async function getFLHospitalNodes(modelId: string): Promise<FLHospitalNode[]> {
  try {
    const { data, error } = await supabase
      .from("fl_hospital_nodes")
      .select("*")
      .eq("model_id", modelId)
      .order("joined_at", { ascending: true });

    if (error || !data) return [];
    return data as FLHospitalNode[];
  } catch (err) {
    console.error("Failed to fetch fl_hospital_nodes:", err);
    return [];
  }
}

/** Fetch the currently logged-in hospital's node record for a model */
export async function getMyHospitalNode(modelId: string): Promise<FLHospitalNode | null> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;

    const { data, error } = await supabase
      .from("fl_hospital_nodes")
      .select("*")
      .eq("model_id", modelId)
      .eq("hospital_id", userData.user.id)
      .maybeSingle();

    if (error || !data) return null;
    return data as FLHospitalNode;
  } catch (err) {
    return null;
  }
}

/** Register or update current hospital's local node and dataset stats */
export async function upsertMyHospitalNode(
  modelId: string,
  nodeDetails: {
    hospitalName?: string;
    hospitalCode?: string;
    scannerModel?: string;
    region?: string;
    localSamplesCount: number;
    datasetName?: string;
    datasetSizeMb?: number;
    nodeStatus?: "ready" | "synced" | "harmonized" | "quarantined" | "training" | "idle";
    isAdversarial?: boolean;
  }
): Promise<FLHospitalNode | null> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error("Hospital authentication required");

    let resolvedName = nodeDetails.hospitalName;
    if (!resolvedName) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", userData.user.id)
        .maybeSingle();
      resolvedName = profile?.full_name || userData.user.email?.split("@")[0] || "Hospital Node";
    }

    const hospitalCode = nodeDetails.hospitalCode || (resolvedName || "HOS").slice(0, 3).toUpperCase();

    const payload = {
      model_id: modelId,
      hospital_id: userData.user.id,
      hospital_name: resolvedName || "Hospital Node",
      hospital_code: hospitalCode,
      region: nodeDetails.region || "Local Secure Perimeter",
      scanner_model: nodeDetails.scannerModel || "Standard DICOM Clinical Scanner",
      local_samples_count: nodeDetails.localSamplesCount,
      dataset_name: nodeDetails.datasetName || null,
      dataset_size_mb: nodeDetails.datasetSizeMb || null,
      node_status: nodeDetails.nodeStatus || "ready",
      is_adversarial: nodeDetails.isAdversarial ?? false,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("fl_hospital_nodes")
      .upsert(payload, { onConflict: "model_id,hospital_id" })
      .select()
      .single();

    if (error) throw error;
    return data as FLHospitalNode;
  } catch (err) {
    console.error("Failed to upsert hospital node:", err);
    return null;
  }
}

/** Trigger PyTorch CNN Training Job in Backend API with Real File Upload */
export async function startBackendTrainingJob(params: {
  modelId: string;
  datasetFile?: File | null;
  datasetName: string;
  modality?: string;
  classes?: string[];
  sampleCount: number;
  epochs?: number;
  batchSize?: number;
  baselineAccuracy?: number;
  isAdversarial?: boolean;
}): Promise<{ success: boolean; jobId: string }> {
  const { data: userData } = await supabase.auth.getUser();
  const hospitalId = userData?.user?.id || "demo-hospital-node";

  let hospitalName = "Local Hospital Node";
  if (userData?.user?.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userData.user.id)
      .maybeSingle();
    hospitalName = profile?.full_name || userData.user.email?.split("@")[0] || hospitalName;
  }

  const formData = new FormData();
  formData.append("model_id", params.modelId);
  formData.append("category", params.modality || params.modelId);
  formData.append("hospital_id", hospitalId);
  formData.append("hospital_name", hospitalName);
  formData.append("modality", params.modality || "Chest X-ray");
  formData.append("classes_json", JSON.stringify(params.classes || ["Normal", "Pneumonia / Infiltration"]));
  formData.append("epochs", String(params.epochs || 5));
  formData.append("batch_size", String(params.batchSize || 8));
  formData.append("baseline_accuracy", String(params.baselineAccuracy || 0.76));
  formData.append("is_adversarial", String(params.isAdversarial || false));

  if (params.datasetFile) {
    formData.append("file", params.datasetFile);
  }

  const res = await fetch(`${API_BASE_URL}/fl/train-job`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Failed to start backend training job: ${res.statusText}`);
  }

  const data = await res.json();
  return { success: true, jobId: data.job_id };
}

/** Connect to SSE Stream for live epoch-by-epoch visual telemetry & background logs */
export function streamTrainingProgress(
  jobId: string,
  onProgress: (data: any) => void,
  onLog: (logMessage: string) => void,
  onComplete: (data: FLTrainingJob) => void,
  onError: (err: any) => void
): () => void {
  const eventSource = new EventSource(`${API_BASE_URL}/fl/train-stream/${jobId}`);

  eventSource.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      if (payload.type === "progress") {
        onProgress(payload.data);
      } else if (payload.type === "phase") {
        onProgress(payload.data);
      } else if (payload.type === "log") {
        onLog(payload.data.message);
      } else if (payload.type === "validation_error") {
        onLog(`[ERROR] ${payload.data.gate_reason}`);
        onError(payload.data);
        eventSource.close();
      } else if (payload.type === "complete") {
        onComplete(payload.data);
        eventSource.close();
      } else if (payload.type === "error") {
        onLog(`[ERROR] ${payload.data.error}`);
        onError(payload.data);
        eventSource.close();
      }
    } catch (e) {
      console.error("SSE parse error:", e);
    }
  };

  eventSource.onerror = (err) => {
    console.warn("SSE connection closed or completed:", err);
    eventSource.close();
  };

  return () => {
    eventSource.close();
  };
}

/** Fetch historical training jobs for the hospital */
export async function getHospitalTrainingHistory(hospitalId?: string): Promise<FLTrainingJob[]> {
  try {
    let resolvedHospitalId = hospitalId;
    if (!resolvedHospitalId) {
      const { data: userData } = await supabase.auth.getUser();
      resolvedHospitalId = userData?.user?.id || "demo-hospital-node";
    }

    const res = await fetch(`${API_BASE_URL}/fl/history/${resolvedHospitalId}`);
    if (res.ok) {
      const data = await res.json();
      if (data.history) return data.history as FLTrainingJob[];
    }

    // Supabase fallback query
    const { data } = await supabase
      .from("fl_training_jobs")
      .select("*")
      .eq("hospital_id", resolvedHospitalId)
      .order("created_at", { ascending: false });

    return (data || []) as FLTrainingJob[];
  } catch (err) {
    console.error("Failed to load hospital training history:", err);
    return [];
  }
}

/** Fetch audit ledger events for a model */
export async function getFLAuditLedger(modelId: string): Promise<FLAuditEvent[]> {
  try {
    const { data, error } = await supabase
      .from("fl_audit_ledger")
      .select("*")
      .eq("model_id", modelId)
      .order("created_at", { ascending: false })
      .limit(60);

    if (error || !data) return [];
    return data as FLAuditEvent[];
  } catch (err) {
    return [];
  }
}

/** Persist a completed training round and audit checkpoint to Supabase */
export async function recordTrainingRoundCommit(params: {
  modelId: string;
  roundNumber: number;
  accuracy: number;
  loss: number;
  epsilon: number;
  mmd: number;
  participatingCount: number;
  acceptedCount: number;
  rejectedCount: number;
  auditEvents: Array<{
    eventType: string;
    description: string;
    sourceNode: string;
    hash: string;
    status: "Success" | "Harmonized" | "Blocked" | "Warning";
  }>;
}) {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id || null;

    const commitSummary = `model=${params.modelId}|round=${params.roundNumber}|acc=${params.accuracy.toFixed(4)}|loss=${params.loss.toFixed(4)}`;
    const checkpointHash = await sha256Hex(commitSummary);

    await supabase.from("fl_training_rounds").upsert({
      model_id: params.modelId,
      round_number: params.roundNumber,
      global_accuracy: params.accuracy,
      global_loss: params.loss,
      epsilon_spent: params.epsilon,
      mmd_drift: params.mmd,
      participating_nodes_count: params.participatingCount,
      accepted_nodes_count: params.acceptedCount,
      rejected_nodes_count: params.rejectedCount,
      checkpoint_hash: checkpointHash,
      triggered_by: userId,
      aggregated_at: new Date().toISOString(),
    }, { onConflict: "model_id,round_number" });

    await supabase.from("fl_models").update({
      current_round: params.roundNumber,
      current_accuracy: params.accuracy,
      current_loss: params.loss,
      current_epsilon: params.epsilon,
      current_mmd: params.mmd,
      status: params.roundNumber >= 50 ? "converged" : "training",
      updated_at: new Date().toISOString(),
    }).eq("id", params.modelId);

    if (params.auditEvents.length > 0) {
      const ledgerRows = params.auditEvents.map((evt) => ({
        model_id: params.modelId,
        hospital_id: userId,
        event_type: evt.eventType,
        event_description: evt.description,
        source_node: evt.sourceNode,
        provenance_hash: evt.hash,
        status: evt.status,
        created_at: new Date().toISOString(),
      }));

      await supabase.from("fl_audit_ledger").insert(ledgerRows);
    }
  } catch (err) {
    console.error("Error committing FL training round to Supabase:", err);
  }
}
