// H-03 Privacy-Preserving Collaborative Medical Imaging Network
// Frontend-only simulation engine: DP-SGD budget tracking, FedBN harmonization,
// Multi-Krum + cosine-similarity Byzantine defense, and a SHA-256 provenance ledger.
// NOTE: No raw medical images are ever represented here — only scalar metrics and
// synthetic weight-delta vectors, per the zero-raw-image-exposure invariant.

export type SiloId = "A" | "B" | "C";

export interface Silo {
  id: SiloId;
  name: string;
  code: "GE" | "SIE" | "ROG";
  manufacturer: string;
  samples: number;
  status: "synced" | "harmonized" | "filtered";
}

export type LedgerStatus = "Success" | "Harmonized" | "Blocked";

export interface LedgerEvent {
  id: string;
  event: string;
  source: string;
  timestamp: number;
  status: LedgerStatus;
  hash: string;
}

export interface FLState {
  round: number;
  accuracy: number;
  prevAccuracy: number;
  loss: number;
  epsilon: number;
  epsilonMax: number;
  mmd: number;
  attackInjected: boolean;
  domainShift: boolean;
  silos: Silo[];
  accuracyHistory: number[];
  ledger: LedgerEvent[];
}

export const SCANNER_VOLUMES = [
  { manufacturer: "GE", volume: 1200 },
  { manufacturer: "Siemens", volume: 850 },
  { manufacturer: "Philips", volume: 1400 },
  { manufacturer: "Canon", volume: 500 },
];

const START_ACCURACY = 0.781;
const TARGET_ACCURACY = 0.961;
const CONVERGENCE_K = 0.085;

export function createInitialState(): FLState {
  return {
    round: 0,
    accuracy: START_ACCURACY,
    prevAccuracy: START_ACCURACY,
    loss: 0.902,
    epsilon: 0,
    epsilonMax: 5.0,
    mmd: 0.14,
    attackInjected: false,
    domainShift: false,
    silos: [
      { id: "A", name: "Hospital A", code: "GE", manufacturer: "GE Healthcare", samples: 1200, status: "synced" },
      { id: "B", name: "Hospital B", code: "SIE", manufacturer: "Siemens", samples: 850, status: "synced" },
      { id: "C", name: "Hospital C", code: "ROG", manufacturer: "Rogue Node", samples: 640, status: "synced" },
    ],
    accuracyHistory: [START_ACCURACY],
    ledger: [],
  };
}

// ---------------------------------------------------------------------------
// Linear algebra helpers for the Byzantine defense layer
// ---------------------------------------------------------------------------

function randn(): number {
  // Box-Muller transform
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function addNoise(vec: number[], scale: number): number[] {
  return vec.map((x) => x + randn() * scale);
}

function scale(vec: number[], s: number): number[] {
  return vec.map((x) => x * s);
}

function euclidean(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

function dot(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

function norm(a: number[]): number {
  return Math.sqrt(dot(a, a));
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const denom = norm(a) * norm(b);
  return denom === 0 ? 0 : dot(a, b) / denom;
}

// ---------------------------------------------------------------------------
// Multi-Krum: score each client update by the sum of squared distances to its
// closest neighbors, then select the updates with the lowest scores. Poisoned
// updates sit far from the honest consensus and receive high scores → rejected.
// ---------------------------------------------------------------------------

export function multiKrumFilter(clientUpdates: number[][], numToSelect = 2): number[] {
  const n = clientUpdates.length;
  if (n <= numToSelect) return clientUpdates.map((_, i) => i);

  // f = assumed byzantine count; neighbors considered = n - f - 2
  const f = Math.max(1, n - numToSelect);
  const neighborCount = Math.max(1, n - f - 2 >= 1 ? n - f - 2 : 1);

  const scores = clientUpdates.map((update, i) => {
    const dists = clientUpdates
      .map((other, j) => (i === j ? Infinity : euclidean(update, other) ** 2))
      .filter((d) => d !== Infinity)
      .sort((x, y) => x - y);
    const closest = dists.slice(0, neighborCount);
    return { index: i, score: closest.reduce((s, d) => s + d, 0) };
  });

  scores.sort((a, b) => a.score - b.score);
  return scores.slice(0, numToSelect).map((s) => s.index);
}

// Cosine-similarity filter: exclude updates whose direction disagrees with the
// mean consensus direction (classic signature of adversarial label-flipping).
export function cosineSimilarityFilter(clientUpdates: number[][]): boolean[] {
  const dim = clientUpdates[0]?.length ?? 0;
  if (dim === 0 || clientUpdates.length === 0) return clientUpdates.map(() => true);
  const mean = new Array(dim).fill(0);
  for (const u of clientUpdates) for (let i = 0; i < dim; i++) mean[i] += u[i] / clientUpdates.length;
  return clientUpdates.map((u) => cosineSimilarity(u, mean) >= 0);
}

// ---------------------------------------------------------------------------
// SHA-256 provenance hash of a checkpoint's scalar summary
// ---------------------------------------------------------------------------

export async function sha256Hex(input: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const data = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Fallback if crypto.subtle is unavailable
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(16, "0");
}

// ---------------------------------------------------------------------------
// Run a single federated round against the current state
// ---------------------------------------------------------------------------

export interface RoundResult {
  state: FLState;
  newEvents: LedgerEvent[];
}

export async function runRound(prev: FLState): Promise<RoundResult> {
  const round = prev.round + 1;
  const dim = 16;

  // Honest consensus gradient direction shared by non-adversarial silos.
  const base = Array.from({ length: dim }, () => randn());

  // Each silo produces a synthetic weight-delta vector (NOT image data).
  const updates: Record<SiloId, number[]> = {
    A: addNoise(base, 0.15),
    B: addNoise(prev.domainShift ? scale(base, 0.85) : base, prev.domainShift ? 0.35 : 0.15),
    // Adversarial node: label-flip inverts the gradient direction when attacking.
    C: prev.attackInjected ? addNoise(scale(base, -0.9), 0.6) : addNoise(base, 0.2),
  };

  const order: SiloId[] = ["A", "B", "C"];
  const updateMatrix = order.map((id) => updates[id]);

  // Byzantine defense: Multi-Krum selection intersected with cosine consensus.
  const krumSelected = new Set(multiKrumFilter(updateMatrix, 2));
  const cosineOk = cosineSimilarityFilter(updateMatrix);
  const accepted = order.filter((_, i) => krumSelected.has(i) && cosineOk[i]);
  const rejected = order.filter((id) => !accepted.includes(id));

  const newEvents: LedgerEvent[] = [];
  const now = Date.now();

  // FedBN harmonization event for the domain-shifted Siemens silo.
  const silos: Silo[] = prev.silos.map((s) => {
    if (rejected.includes(s.id)) return { ...s, status: "filtered" };
    if (s.id === "B" && prev.domainShift) return { ...s, status: "harmonized" };
    return { ...s, status: "synced" };
  });

  // Accuracy converges with diminishing returns; a well-defended round keeps
  // improving even while the poisoned silo is quarantined.
  const converge = TARGET_ACCURACY - (TARGET_ACCURACY - START_ACCURACY) * Math.exp(-CONVERGENCE_K * round);
  const jitter = randn() * 0.004;
  const accuracy = Math.min(0.985, Math.max(prev.accuracy - 0.01, converge + jitter));
  const loss = Math.max(0.18, 0.9 * Math.exp(-CONVERGENCE_K * round) + 0.18 + randn() * 0.006);
  const epsilon = Math.min(prev.epsilonMax, prev.epsilon + 0.145);
  const mmd = prev.domainShift ? Math.max(0.09, 0.34 - round * 0.004) : Math.max(0.08, 0.14 - round * 0.002);

  // Rejected / blocked events
  for (const id of rejected) {
    const silo = prev.silos.find((s) => s.id === id)!;
    const hash = await sha256Hex(`reject:${round}:${id}:${now}`);
    newEvents.push({
      id: `${round}-${id}-blocked`,
      event: prev.attackInjected && id === "C" ? "Poisoned update rejected (Multi-Krum)" : "Outlier update filtered",
      source: `${silo.name} · ${silo.code}`,
      timestamp: now,
      status: "Blocked",
      hash,
    });
  }

  // Harmonization event
  if (prev.domainShift) {
    const hash = await sha256Hex(`harmonize:${round}:B:${now}`);
    newEvents.push({
      id: `${round}-B-harmonized`,
      event: "FedBN scanner harmonization applied",
      source: "Hospital B · SIE",
      timestamp: now + 1,
      status: "Harmonized",
      hash,
    });
  }

  // Aggregation commit event with checkpoint provenance hash
  const checkpointSummary = `round=${round}|acc=${accuracy.toFixed(4)}|loss=${loss.toFixed(4)}|nodes=${accepted.join(",")}`;
  const commitHash = await sha256Hex(checkpointSummary);
  newEvents.push({
    id: `${round}-commit`,
    event: `Round ${round} checkpoint aggregated (${accepted.length} silos)`,
    source: "FL Coordinator",
    timestamp: now + 2,
    status: "Success",
    hash: commitHash,
  });

  const state: FLState = {
    ...prev,
    round,
    prevAccuracy: prev.accuracy,
    accuracy,
    loss,
    epsilon,
    mmd,
    silos,
    accuracyHistory: [...prev.accuracyHistory, accuracy].slice(-50),
    ledger: [...newEvents, ...prev.ledger].slice(0, 60),
  };

  return { state, newEvents };
}
