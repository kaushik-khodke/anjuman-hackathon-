import {
  getFLModels,
  getFLHospitalNodes,
  getFLAuditLedger,
  getMyHospitalNode,
  recordTrainingRoundCommit,
  type FLModel,
  type FLHospitalNode,
  type FLAuditEvent,
} from "./fl-service";
import {
  cosineSimilarityFilter,
  multiKrumFilter,
  sha256Hex,
} from "./fl-simulation";

export type SiteStatus = "idle" | "synced" | "harmonized" | "filtered";

export interface SiteState {
  id: string;
  name: string;
  code: string;
  region: string;
  scanner: string;
  samples: number;
  adversarial?: boolean;
  status: SiteStatus;
}

export interface ModelRuntimeState {
  id: string;
  round: number;
  maxRounds: number;
  accuracy: number;
  prevAccuracy: number;
  loss: number;
  epsilon: number;
  epsilonMax: number;
  mmd: number;
  attackInjected: boolean;
  domainShift: boolean;
  sites: SiteState[];
  accuracyHistory: number[];
  ledger: Array<{
    id: string;
    event: string;
    source: string;
    timestamp: number;
    status: "Success" | "Harmonized" | "Blocked" | "Warning";
    hash: string;
  }>;
  isTraining: boolean;
  roundsRemaining: number;
  isLoading?: boolean;
}

const MAX_ROUNDS = 50;
const CONVERGENCE_K = 0.085;
const ROUND_INTERVAL_MS = 850;

type Store = {
  models: FLModel[];
  runtime: Record<string, ModelRuntimeState>;
  isLoading: boolean;
};

let storeState: Store = {
  models: [],
  runtime: {},
  isLoading: true,
};

const listeners = new Set<() => void>();
const timers: Record<string, ReturnType<typeof setTimeout> | undefined> = {};
let isInitialized = false;

function emit() {
  storeState = { ...storeState };
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!isInitialized) {
    initStore();
  }
  return () => listeners.delete(listener);
}

export function getSnapshot(): Store {
  return storeState;
}

export function getServerSnapshot(): Store {
  return storeState;
}

/** Initialize dynamic database-backed store */
export async function initStore() {
  if (isInitialized) return;
  isInitialized = true;
  storeState = { ...storeState, isLoading: true };
  emit();

  try {
    const models = await getFLModels();
    const runtimeMap: Record<string, ModelRuntimeState> = {};

    for (const m of models) {
      const [nodes, ledger] = await Promise.all([
        getFLHospitalNodes(m.id),
        getFLAuditLedger(m.id),
      ]);

      const sites: SiteState[] = nodes.length > 0
        ? nodes.map((n) => ({
            id: n.id,
            name: n.hospital_name,
            code: n.hospital_code,
            region: n.region,
            scanner: n.scanner_model,
            samples: n.local_samples_count,
            adversarial: n.is_adversarial,
            status: n.node_status as SiteStatus,
          }))
        : [];

      const ledgerEvents = ledger.map((l) => ({
        id: l.id,
        event: l.event_description,
        source: l.source_node,
        timestamp: new Date(l.created_at).getTime(),
        status: l.status,
        hash: l.provenance_hash,
      }));

      runtimeMap[m.id] = {
        id: m.id,
        round: m.current_round || 0,
        maxRounds: m.max_rounds || MAX_ROUNDS,
        accuracy: m.current_accuracy || m.base_accuracy,
        prevAccuracy: m.current_accuracy || m.base_accuracy,
        loss: m.current_loss || 0.9,
        epsilon: m.current_epsilon || 0,
        epsilonMax: m.epsilon_max || 5.0,
        mmd: m.current_mmd || 0.14,
        attackInjected: false,
        domainShift: false,
        sites,
        accuracyHistory: [m.base_accuracy, m.current_accuracy || m.base_accuracy],
        ledger: ledgerEvents,
        isTraining: false,
        roundsRemaining: 0,
        isLoading: false,
      };
    }

    storeState = {
      models,
      runtime: runtimeMap,
      isLoading: false,
    };
    emit();
  } catch (err) {
    console.error("Error initializing FL marketplace store:", err);
    storeState = { ...storeState, isLoading: false };
    emit();
  }
}

function randn(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function addNoise(vec: number[], s: number): number[] {
  return vec.map((x) => x + randn() * s);
}

function scaleVec(vec: number[], s: number): number[] {
  return vec.map((x) => x * s);
}

async function runRound(prev: ModelRuntimeState, def: FLModel): Promise<ModelRuntimeState> {
  const round = prev.round + 1;
  const dim = 16;
  const now = Date.now();

  const base = Array.from({ length: dim }, () => randn());

  // Synthetic DP-SGD weight deltas per hospital node
  const activeSites = prev.sites.length > 0 ? prev.sites : [
    { id: "local", name: "Your Hospital Node", code: "HOS", region: "Local Node", scanner: "DICOM Scanner", samples: 1000, status: "synced" as SiteStatus }
  ];

  const updateMatrix = activeSites.map((site) => {
    if (site.adversarial && prev.attackInjected) {
      return addNoise(scaleVec(base, -0.9), 0.6);
    }
    const shift = prev.domainShift && site.code !== "GE";
    return addNoise(shift ? scaleVec(base, 0.85) : base, shift ? 0.32 : 0.16);
  });

  const keep = Math.max(1, activeSites.length - 1);
  const krum = new Set(multiKrumFilter(updateMatrix, keep));
  const cosineOk = cosineSimilarityFilter(updateMatrix);
  const acceptedIdx = activeSites
    .map((_, i) => i)
    .filter((i) => krum.has(i) && cosineOk[i]);
  const rejectedIdx = activeSites.map((_, i) => i).filter((i) => !acceptedIdx.includes(i));

  const sites: SiteState[] = activeSites.map((s, i) => {
    if (rejectedIdx.includes(i)) return { ...s, status: "filtered" };
    if (prev.domainShift && s.code !== "GE") return { ...s, status: "harmonized" };
    return { ...s, status: "synced" };
  });

  const converge =
    def.target_accuracy - (def.target_accuracy - def.base_accuracy) * Math.exp(-CONVERGENCE_K * round);
  const jitter = randn() * 0.004;
  const accuracy = Math.min(def.target_accuracy + 0.01, Math.max(prev.accuracy - 0.008, converge + jitter));
  const loss = Math.max(0.16, 0.9 * Math.exp(-CONVERGENCE_K * round) + 0.17 + randn() * 0.006);
  const epsilon = Math.min(prev.epsilonMax, prev.epsilon + prev.epsilonMax / 34);
  const mmd = prev.domainShift ? Math.max(0.09, 0.34 - round * 0.004) : Math.max(0.08, 0.14 - round * 0.002);

  const newEvents: Array<{
    id: string;
    event: string;
    source: string;
    timestamp: number;
    status: "Success" | "Harmonized" | "Blocked" | "Warning";
    hash: string;
  }> = [];

  const dbAuditEvents: Array<{
    eventType: string;
    description: string;
    sourceNode: string;
    hash: string;
    status: "Success" | "Harmonized" | "Blocked" | "Warning";
  }> = [];

  for (const i of rejectedIdx) {
    const s = activeSites[i];
    const hash = await sha256Hex(`reject:${def.id}:${round}:${s.id}:${now}`);
    const desc = s.adversarial && prev.attackInjected ? "Poisoned update quarantined (Multi-Krum)" : "Outlier update filtered";
    newEvents.push({
      id: `${def.id}-${round}-${s.id}-blocked`,
      event: desc,
      source: `${s.name} · ${s.code}`,
      timestamp: now,
      status: "Blocked",
      hash,
    });
    dbAuditEvents.push({
      eventType: "UPDATE_QUARANTINED",
      description: desc,
      sourceNode: `${s.name} (${s.code})`,
      hash,
      status: "Blocked",
    });
  }

  if (prev.domainShift) {
    const hash = await sha256Hex(`harmonize:${def.id}:${round}:${now}`);
    newEvents.push({
      id: `${def.id}-${round}-harmonized`,
      event: "FedBN scanner domain harmonization applied",
      source: "Cross-site batch-norm",
      timestamp: now + 1,
      status: "Harmonized",
      hash,
    });
    dbAuditEvents.push({
      eventType: "FEDBN_HARMONIZED",
      description: "FedBN scanner domain harmonization applied",
      sourceNode: "FL Coordinator",
      hash,
      status: "Harmonized",
    });
  }

  const summary = `model=${def.id}|round=${round}|acc=${accuracy.toFixed(4)}|sites=${acceptedIdx.length}`;
  const commitHash = await sha256Hex(summary);
  const commitDesc = `Round ${round} checkpoint aggregated (${acceptedIdx.length} sites)`;
  newEvents.push({
    id: `${def.id}-${round}-commit`,
    event: commitDesc,
    source: "FL Coordinator",
    timestamp: now + 2,
    status: "Success",
    hash: commitHash,
  });
  dbAuditEvents.push({
    eventType: "CHECKPOINT_COMMITTED",
    description: commitDesc,
    sourceNode: "FL Coordinator",
    hash: commitHash,
    status: "Success",
  });

  // Persist to Supabase in background
  recordTrainingRoundCommit({
    modelId: def.id,
    roundNumber: round,
    accuracy,
    loss,
    epsilon,
    mmd,
    participatingCount: activeSites.length,
    acceptedCount: acceptedIdx.length,
    rejectedCount: rejectedIdx.length,
    auditEvents: dbAuditEvents,
  }).catch((e: any) => console.warn("Supabase FL round persistence warning:", e));

  return {
    ...prev,
    round,
    prevAccuracy: prev.accuracy,
    accuracy,
    loss,
    epsilon,
    mmd,
    sites,
    accuracyHistory: [...prev.accuracyHistory, accuracy].slice(-50),
    ledger: [...newEvents, ...prev.ledger].slice(0, 60),
  };
}

function schedule(modelId: string) {
  if (timers[modelId]) return;
  const def = storeState.models.find((m) => m.id === modelId);
  if (!def) return;

  const tick = async () => {
    const current = storeState.runtime[modelId];
    if (!current || current.roundsRemaining <= 0 || current.round >= current.maxRounds) {
      timers[modelId] = undefined;
      storeState.runtime[modelId] = {
        ...storeState.runtime[modelId],
        isTraining: false,
        roundsRemaining: 0,
      };
      emit();
      return;
    }
    const next = await runRound(current, def);
    storeState.runtime[modelId] = {
      ...next,
      isTraining: true,
      roundsRemaining: current.roundsRemaining - 1,
    };
    emit();
    timers[modelId] = setTimeout(tick, ROUND_INTERVAL_MS);
  };

  timers[modelId] = setTimeout(tick, ROUND_INTERVAL_MS);
}

export function trainModel(modelId: string, rounds = 10) {
  const current = storeState.runtime[modelId];
  if (!current) return;
  const remaining = Math.min(current.maxRounds - current.round, current.roundsRemaining + rounds);
  storeState.runtime[modelId] = {
    ...current,
    roundsRemaining: remaining,
    isTraining: remaining > 0,
  };
  emit();
  schedule(modelId);
}

export function toggleAttack(modelId: string) {
  const current = storeState.runtime[modelId];
  if (!current) return;
  storeState.runtime[modelId] = {
    ...current,
    attackInjected: !current.attackInjected,
  };
  emit();
}

export function toggleDomainShift(modelId: string) {
  const current = storeState.runtime[modelId];
  if (!current) return;
  storeState.runtime[modelId] = {
    ...current,
    domainShift: !current.domainShift,
  };
  emit();
}

export function resetModel(modelId: string) {
  const def = storeState.models.find((m) => m.id === modelId);
  if (!def) return;
  if (timers[modelId]) {
    clearTimeout(timers[modelId]);
    timers[modelId] = undefined;
  }
  const current = storeState.runtime[modelId];
  if (current) {
    storeState.runtime[modelId] = {
      ...current,
      round: 0,
      accuracy: def.base_accuracy,
      prevAccuracy: def.base_accuracy,
      loss: 0.9,
      epsilon: 0,
      mmd: 0.14,
      attackInjected: false,
      domainShift: false,
      accuracyHistory: [def.base_accuracy],
      ledger: [],
      isTraining: false,
      roundsRemaining: 0,
    };
    emit();
  }
}
