# MyHealthChain --- H-03 Technical Requirements Document (TRD)

**Project:** MyHealthChain --- Federated Clinical Intelligence Network\
**Problem Statement:** H-03 --- Privacy-Preserving Collaborative Medical
Imaging Network\
**Project Code:** H-03-MHC-V1\
**Version:** 1.0.0\
**Status:** Hackathon Production Prototype\
**Target Environment:** Localhost / Linux / Node.js 18+ / Python 3.12 /
Supabase PostgreSQL / PyTorch 2.2+

------------------------------------------------------------------------

## 1. Technical Objective

Extend the existing MyHealthChain Hospital Command Center with a
privacy-preserving Federated Learning infrastructure for collaborative
pediatric pneumonia medical-imaging classification.

The system must allow multiple hospital client silos to collaboratively
improve a shared model while:

-   Keeping raw medical images inside each hospital runtime.
-   Keeping patient identifiers and individual patient metadata local.
-   Preventing unmasked gradients from leaving a hospital runtime.
-   Applying Differentially Private SGD (DP-SGD).
-   Preserving scanner-specific normalization through FedBN.
-   Measuring scanner/domain shift using latent feature statistics and
    MMD.
-   Detecting malicious/poisoned model updates using deterministic
    Multi-Krum and cosine-similarity defenses.
-   Validating candidate models through decentralized held-out
    evaluation.
-   Rolling back degraded candidate models.
-   Maintaining a SHA-256 cryptographic model-provenance ledger.
-   Streaming live training and governance telemetry to the Hospital
    Command Center.

------------------------------------------------------------------------

# 2. Scope

## 2.1 Active Scope

The implementation is restricted to:

``` text
frontend/src/pages/hospital/Dashboard.tsx
frontend/src/components/hospital/*
backend/app/fl_core/*
backend/app/routers/hospital_fl.py
backend/app/simulation/*
```

The existing hospital operational capabilities must remain functional:

-   XGBoost Emergency Severity Index (ESI) triage.
-   Multi-ward bed occupancy and resource balancing.
-   Patient inflow forecasting.
-   Existing Gemini-based strategic analysis.

## 2.2 Frozen Scope

The following modules must not be modified, deleted, or have their
dependencies altered:

``` text
src/pages/patient/*
src/pages/doctor/*
src/pages/pharmacist/*
whatsapp-gateway/*
Voice AI / Twilio services
Stripe checkout
Pinata IPFS records
```

------------------------------------------------------------------------

# 3. System Architecture

``` text
                    ┌───────────────────────────────┐
                    │     HOSPITAL COMMAND CENTER    │
                    │        React / TypeScript      │
                    └───────────────┬───────────────┘
                                    │
                             REST / WebSocket
                                    │
                    ┌───────────────▼───────────────┐
                    │  FEDERATION GOVERNANCE SERVER │
                    │            FastAPI             │
                    │                               │
                    │  Coordinator / State Machine  │
                    │  Aggregation                  │
                    │  Byzantine Defense            │
                    │  Domain Shift Monitor         │
                    │  Validation Gate              │
                    │  Rollback Controller          │
                    │  Provenance Ledger            │
                    └───────┬──────────┬────────────┘
                            │          │
                  Model W_t │          │ Telemetry
                            │          │
          ┌─────────────────┼──────────┼─────────────────┐
          │                 │          │                 │
          ▼                 ▼          ▼                 ▼
   ┌─────────────┐   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
   │ Hospital A  │   │ Hospital B  │ │ Hospital C  │ │ Hospital N  │
   │ GE Profile  │   │ Siemens     │ │ Rogue Node  │ │ Future Node  │
   │ Local Data  │   │ Local Data  │ │ Attack Sim  │ │ Local Data  │
   │ DP-SGD      │   │ DP-SGD      │ │ Poisoning   │ │ DP-SGD      │
   │ Local BN    │   │ Local BN    │ │ Injection   │ │ Local BN    │
   └─────────────┘   └─────────────┘ └─────────────┘ └─────────────┘
```

------------------------------------------------------------------------

# 4. Technology Requirements

  Layer           Technology                     Requirement
  --------------- ------------------------------ --------------------------------------
  Frontend        React 18 + Vite + TypeScript   Hospital command UI
  Routing         React Router                   Existing portal navigation
  Styling         Tailwind CSS                   Formal command-center UI
  Icons           Lucide React                   Consistent interface icons
  Charts          Chart.js / Recharts            Real-time convergence and telemetry
  Backend         FastAPI                        FL APIs and coordinator
  Runtime         Python 3.12                    Backend/ML execution
  Communication   WebSockets                     Bidirectional FL telemetry
  Database        Supabase PostgreSQL 15         Round, node, audit metadata
  ML              PyTorch 2.2+                   Model training and aggregation
  Vision          Torchvision                    CNN/ResNet support
  Privacy         Opacus                         DP-SGD
  Dataset         MedMNIST v2 / PneumoniaMNIST   Prototype imaging dataset
  Numerical       NumPy / SciPy                  Defense and statistical calculations
  Provenance      Python hashlib                 SHA-256 model hashes

------------------------------------------------------------------------

# 5. Data Boundary Requirements

These are non-negotiable system invariants.

### TR-DB-001 --- Raw Image Isolation

Raw medical images must never be transmitted to the central federation
server.

### TR-DB-002 --- Patient Metadata Isolation

Patient identifiers and individual patient metadata must remain inside
the local hospital runtime.

### TR-DB-003 --- Gradient Protection

Unmasked gradients must never leave the hospital runtime.

### TR-DB-004 --- Central Data Limitation

The central server may receive:

-   Model parameter deltas after local privacy processing.
-   Aggregate telemetry.
-   Scalar validation metrics.
-   Latent/statistical summaries required for domain monitoring.
-   Node status information.
-   Provenance metadata.

### TR-DB-005 --- Existing Portal Isolation

No H-03 endpoint may access or mutate patient/doctor/pharmacist portal
data unless an existing supported interface already provides that
capability.

------------------------------------------------------------------------

# 6. Federated Learning Requirements

## 6.1 Federation Coordinator

The coordinator must:

1.  Maintain the current global model `W_t`.
2.  Maintain federation round state.
3.  Register participating client nodes.
4.  Broadcast model parameters.
5.  Receive client updates.
6.  Execute defense checks.
7.  Aggregate accepted updates.
8.  Trigger decentralized validation.
9.  Commit or rollback candidate models.
10. Record provenance.
11. Stream telemetry to the dashboard.

## 6.2 Federation Round States

The state machine should expose:

``` text
IDLE
↓
INITIALIZING
↓
BROADCASTING
↓
LOCAL_TRAINING
↓
UPDATES_RECEIVING
↓
DEFENSE_ANALYSIS
↓
AGGREGATING
↓
SHADOW_VALIDATION
↓
COMMITTING
       OR
ROLLING_BACK
↓
COMPLETED
```

A failed round should transition to:

``` text
ERROR
↓
RECOVERY
↓
IDLE
```

------------------------------------------------------------------------

# 7. Local Hospital Client Requirements

Each hospital silo must run independently.

A client must:

1.  Load its local dataset partition.
2.  Receive the global model.
3.  Preserve local BatchNorm parameters.
4.  Train locally using DP-SGD.
5.  Compute a model delta.
6.  Calculate permitted local telemetry.
7.  Upload the protected update.
8.  Validate candidate models locally.
9.  Return scalar validation metrics.

### Client Payload

Conceptually:

``` json
{
  "node_id": "HOSPITAL_GE_01",
  "round_id": 14,
  "model_delta": "<protected_tensor_payload>",
  "gradient_norm": 1.04,
  "privacy_epsilon": 1.45,
  "latent_statistics": {
    "mean": [],
    "variance": []
  }
}
```

Raw image arrays must never be included.

------------------------------------------------------------------------

# 8. Differential Privacy Requirements

## 8.1 DP-SGD Pipeline

``` text
Local Batch
    ↓
Forward Pass
    ↓
Per-Sample Gradients
    ↓
L2 Gradient Clipping
    ↓
Gaussian Noise
    ↓
Private Gradient
    ↓
Optimizer Update
```

## 8.2 Gradient Clipping

For each sample gradient `g_i`:

``` text
ḡ_i = g_i / max(1, ||g_i||₂ / C)
```

where `C` is the configured clipping threshold.

## 8.3 Gaussian Noise

The batch gradient must include calibrated Gaussian noise according to
the configured privacy parameters:

``` text
g̃ = 1/|B| ×
     ( Σ ḡ_i + N(0, σ² C² I) )
```

## 8.4 Privacy Telemetry

The system must expose:

-   Privacy budget `ε`.
-   `δ`.
-   Noise multiplier.
-   Gradient clipping threshold.
-   Consumed privacy budget per round.
-   Cumulative privacy expenditure.

The UI must clearly indicate whether privacy protection is active.

------------------------------------------------------------------------

# 9. FedBN / Scanner Domain Requirements

Different imaging hardware can produce different image distributions.

The system must therefore separate parameters into:

### Globally Shared

``` text
conv*.weight
conv*.bias
fc*.weight
fc*.bias
```

### Locally Preserved

``` text
bn*.weight
bn*.bias
bn*.running_mean
bn*.running_var
```

BatchNorm parameters must not be globally averaged.

## Domain Shift Monitoring

Each client should calculate permitted latent feature statistics.

The coordinator calculates pairwise Maximum Mean Discrepancy (MMD):

``` text
MMD(Hospital A, Hospital B)
MMD(Hospital A, Hospital C)
MMD(Hospital B, Hospital C)
```

The dashboard must classify domain shift, for example:

``` text
LOW
MODERATE
HIGH
ANOMALOUS
```

------------------------------------------------------------------------

# 10. Byzantine / Model Poisoning Defense

The defense engine must use deterministic mathematical checks.

## 10.1 Tensor Sanity

Reject updates containing:

-   Invalid tensor shapes.
-   NaN values.
-   Infinite values.
-   Missing required parameters.

## 10.2 L2 Norm Screening

Let:

``` text
||ΔW_k||₂
```

be the client update norm.

Updates exceeding:

``` text
3 × running median norm
```

should be quarantined.

## 10.3 Cosine Similarity

Calculate similarity between each update and the median update
direction.

Negative cosine similarity indicates strong directional disagreement and
must trigger rejection/quarantine.

## 10.4 Multi-Krum

For clients `i` and `j`:

``` text
d(i,j) = ||ΔW_i - ΔW_j||²
```

For each client:

``` text
S(i) = Σ d(i,j)
```

over its closest trusted neighbors.

The lowest-scoring updates are retained and outliers are discarded
according to the configured Byzantine tolerance.

------------------------------------------------------------------------

# 11. Attack Simulation

The prototype must support a controlled adversarial node.

## Attack Types

### Label-Flipping Attack

The rogue client intentionally inverts diagnostic labels before local
training.

### Gradient Poisoning

The rogue client injects abnormal/noisy model updates.

### Attack Flow

``` text
Inject Attack
     ↓
Rogue Local Training
     ↓
Malicious Update
     ↓
Coordinator
     ↓
L2 Check
     ↓
Cosine Check
     ↓
Multi-Krum
     ↓
QUARANTINE
     ↓
Clean Aggregation
```

The dashboard must show:

-   Node name.
-   Attack type.
-   Detection reason.
-   Defense score.
-   Action taken.
-   Aggregation status.

------------------------------------------------------------------------

# 12. Trust & Client Status

Each client should have an operational status:

``` text
ONLINE
TRAINING
WAITING
ACCEPTED
SUSPICIOUS
QUARANTINED
OFFLINE
```

Recommended telemetry:

``` text
Node ID
Scanner Type
Sample Count
Connection Latency
Training Status
Gradient Norm
Cosine Similarity
Multi-Krum Score
Domain Shift
Privacy Budget
Quarantine State
```

------------------------------------------------------------------------

# 13. Decentralized Validation & Rollback

The system must not rely exclusively on centralized validation data.

## Validation Flow

``` text
Candidate Model W(t+1)
        │
        ├── Hospital A local validation
        ├── Hospital B local validation
        └── Hospital C local validation
                    │
                    ▼
             Scalar Metrics
                    │
                    ▼
             Consensus Gate
```

Required metrics:

-   Validation Loss.
-   AUC-ROC.
-   F1 Score.

## Commit Rule

Conceptually:

``` text
mean_AUC(Wt+1) >= mean_AUC(Wt) - τ
```

→ Commit.

Otherwise:

``` text
mean_AUC(Wt+1) < mean_AUC(Wt) - τ
```

→ Rollback.

The previous stable model must remain available for recovery.

------------------------------------------------------------------------

# 14. Model Registry & Provenance

Every committed model must have:

``` text
model_id
round_id
timestamp
global_model_hash_sha256
parent_model_hash_sha256
participating_clients
rejected_clients
domain_shift_index
consumed_epsilon
validation_metrics
commit_or_rollback_status
```

## SHA-256 Chain

``` text
Model v1
   ↓
SHA-256
   ↓
Model v2
   ↓
SHA-256
   ↓
Model v3
   ↓
SHA-256
```

The UI must allow a reviewer to inspect model lineage.

------------------------------------------------------------------------

# 15. Database Requirements

## 15.1 `fl_training_rounds`

Recommended fields:

``` text
id
round_id
global_model_hash
parent_model_hash
mean_loss
mean_auc_roc
f1_score
consumed_epsilon
domain_shift_index
round_status
created_at
```

## 15.2 `fl_node_registry`

Recommended fields:

``` text
id
node_id
scanner_type
sample_count
connection_status
is_quarantined
last_seen
current_round
```

## 15.3 `fl_audit_ledger`

Recommended fields:

``` text
id
round_id
timestamp_utc
global_model_hash
parent_model_hash
participating_clients
rejected_clients
domain_shift_index
privacy_epsilon
validation_metrics
governance_action
```

------------------------------------------------------------------------

# 16. Backend API Requirements

## WebSocket

### `WS /ws/fl-coordinator`

Responsibilities:

-   Client connection.
-   Training commands.
-   Model update streaming.
-   Round telemetry.
-   Defense events.
-   Validation results.
-   Dashboard live updates.

## REST

### `POST /api/fl/start-training`

Starts a multi-round federation.

### `POST /api/fl/inject-attack`

Triggers a controlled adversarial attack on the rogue node.

### `POST /api/fl/toggle-domain-shift`

Applies/removes scanner-specific contrast/blur domain shift.

### `GET /api/fl/provenance-ledger`

Returns model provenance and audit records.

### `GET /api/fl/live-metrics`

Returns:

-   Current round.
-   Model metrics.
-   Client status.
-   Privacy expenditure.
-   Domain shift.
-   Defense events.

------------------------------------------------------------------------

# 17. Frontend Requirements

## 17.1 New Navigation

Add:

``` text
Federated Imaging Network
```

to the existing Hospital Command Center.

## 17.2 Dashboard Header

Show:

``` text
FEDERATION STATUS
ROUND 14 / 50
GLOBAL AUC
PRIVACY ε
DOMAIN SHIFT
ACTIVE CLIENTS
```

## 17.3 Client Nodes Grid

Each node card should show:

``` text
Hospital A
GE Healthcare

● ONLINE
1,200 scans
Latency: 12 ms

Gradient Norm: 1.04
Multi-Krum: ACCEPTED
FedBN: ACTIVE
```

## 17.4 Convergence Panel

Display:

-   Global AUC-ROC.
-   Local AUC.
-   Loss.
-   Round number.
-   Candidate vs baseline.

## 17.5 Domain Shift Panel

Display an MMD matrix:

``` text
             A       B       C
A            —      0.14    0.91
B           0.14      —     0.83
C           0.91     0.83     —
```

## 17.6 Byzantine Defense Panel

Show live events:

``` text
10:04:14  Multi-Krum Analysis
Hospital A   ACCEPTED
Hospital B   ACCEPTED
Hospital C   ISOLATED

Reason:
Cosine divergence < 0
```

## 17.7 Provenance Panel

Show:

``` text
Model v14
SHA-256
Parent Model
Participants
Rejected Clients
Privacy Budget
Domain Shift
Validation
Commit Status
```

------------------------------------------------------------------------

# 18. UI Design Requirements

The UI must use a formal clinical/incident-command aesthetic.

### Requirements

-   Dark monochrome base.
-   Strong information hierarchy.
-   Minimal decorative elements.
-   Consistent typography.
-   Compact telemetry cards.
-   Clear status indicators.
-   Responsive charts.
-   No excessive gradients or gaming-style visuals.
-   Critical alerts must remain visually distinct.
-   Technical data must remain readable at presentation distance.

### Recommended Product Labels

  UI Label                        Technical Meaning
  ------------------------------- -------------------------------
  Federated Intelligence Fabric   Complete FL control plane
  Federation Orchestrator         Central FL state machine
  Privacy Vault                   DP-SGD and privacy telemetry
  Byzantine Update Sentinel       Malicious-update defense
  Clinical Domain Drift           MMD scanner/domain monitoring
  Trust-Aware Aggregation         Filtered model aggregation
  Model Provenance Ledger         SHA-256 model lineage
  Cross-Site Validation           Decentralized evaluation

These labels should be accompanied by concise technical descriptions so
that terminology does not replace actual technical evidence.

------------------------------------------------------------------------

# 19. Telemetry Contract

The frontend should receive a normalized telemetry structure similar to:

``` json
{
  "round_id": 14,
  "status": "DEFENSE_ANALYSIS",
  "global_model": {
    "version": "v14",
    "auc_roc": 0.948,
    "loss": 0.214
  },
  "privacy": {
    "epsilon": 1.45,
    "delta": 0.00001,
    "noise_multiplier": 0.82
  },
  "nodes": [
    {
      "node_id": "HOSPITAL_GE_01",
      "status": "ACCEPTED",
      "gradient_norm": 1.04,
      "krum_score": 1.12,
      "cosine_similarity": 0.92,
      "domain_shift": 0.14
    }
  ],
  "defense_events": [],
  "provenance": {
    "model_hash": "sha256...",
    "parent_hash": "sha256..."
  }
}
```

------------------------------------------------------------------------

# 20. Performance Requirements

## PR-001

Dashboard telemetry should update without requiring page refresh.

## PR-002

Charts should remain responsive during training.

## PR-003

The prototype should prioritize lightweight PneumoniaMNIST training for
rapid demonstration.

## PR-004

Federated rounds should have explicit timeout/error states.

## PR-005

A disconnected or failed client must not crash the coordinator.

## PR-006

A quarantined client must not contribute to the accepted global
aggregation.

## PR-007

Model rollback must restore the last known stable model.

------------------------------------------------------------------------

# 21. Reliability Requirements

The system must support:

### Client Dropout

``` text
A ✓
B ✓
C ✕
D ✓
```

The coordinator continues with available trusted clients when the
minimum participation requirement is satisfied.

### Malicious Client

``` text
A ✓
B ✓
C ⚠
D ✓
```

The malicious client is isolated without terminating the round.

### Validation Failure

``` text
Candidate Model
      ↓
Validation ↓
      ↓
ROLLBACK
```

The stable model remains active.

------------------------------------------------------------------------

# 22. Experimental Requirements

The implementation must generate reproducible evidence for:

## Experiment A --- Clean Convergence

Compare:

``` text
FedAvg
vs
Standard FL + DP
vs
Robust FedBN + DP
```

## Experiment B --- Scanner Shift

Measure performance before and after domain shift.

## Experiment C --- Poisoning

Compare global performance:

``` text
without defense
vs
with Byzantine defense
```

## Experiment D --- Privacy/Utility

Evaluate:

``` text
ε = high privacy budget
ε = medium
ε = low
```

and plot:

``` text
Privacy ↔ Model Quality
```

## Experiment E --- Client Failure

Remove one client during training and measure federation continuity.

------------------------------------------------------------------------

# 23. Benchmark Metrics

Primary metrics:

``` text
AUC-ROC
F1 Score
Validation Loss
```

Federation metrics:

``` text
Round Duration
Client Participation
Client Latency
Gradient Norm
Multi-Krum Score
Cosine Similarity
MMD Domain Shift
```

Privacy metrics:

``` text
ε
δ
Noise Multiplier
Consumed Privacy Budget
```

Security metrics:

``` text
Detected Attacks
Quarantined Clients
False Rejection Rate
Model Performance Under Attack
```

Governance metrics:

``` text
Model Version
Model Hash
Parent Hash
Round Provenance
Commit/Rollback Status
```

------------------------------------------------------------------------

# 24. Reference Benchmark Targets

The architecture specification provides the following reference targets:

  Condition                 FedAvg   Standard FL + DP   Robust FedBN + DP
  ----------------------- -------- ------------------ -------------------
  Clean Convergence AUC      91.2%              89.4%               94.8%
  Scanner Shift AUC          68.5%              66.2%               93.2%
  Poisoning Attack AUC       52.1%              50.8%               94.1%
  Privacy                     None      ε=1.5, δ=10⁻⁵       ε=1.5, δ=10⁻⁵
  Audit                       None               None             SHA-256

**Important:** these are specification/reference values. They must not
be presented as measured results unless the implementation reproduces
them.

------------------------------------------------------------------------

# 25. Security Requirements

The system must:

-   Reject malformed tensors.
-   Reject NaN/Inf updates.
-   Apply deterministic anomaly checks.
-   Prevent quarantined clients from contributing to aggregation.
-   Preserve local medical images.
-   Protect individual patient metadata.
-   Track privacy expenditure.
-   Generate cryptographic provenance records.
-   Keep the attack simulator isolated from production data.
-   Avoid exposing raw patient information in logs or telemetry.

------------------------------------------------------------------------

# 26. Error Handling

The coordinator must handle:

``` text
Client Timeout
Invalid Tensor
NaN / Inf Update
Insufficient Participants
Defense Rejection
Validation Failure
Database Failure
WebSocket Disconnect
Training Runtime Error
```

Each error must produce:

``` text
error_code
timestamp
round_id
node_id (if applicable)
human-readable reason
recovery action
```

------------------------------------------------------------------------

# 27. Implementation File Structure

``` text
MyHealthChain/
├── backend/
│   ├── app/
│   │   ├── routers/
│   │   │   ├── hospital_fl.py
│   │   │   ├── triage.py
│   │   │   └── resources.py
│   │   ├── fl_core/
│   │   │   ├── coordinator.py
│   │   │   ├── aggregation.py
│   │   │   ├── defense.py
│   │   │   ├── ledger.py
│   │   │   └── models.py
│   │   ├── simulation/
│   │   │   ├── client_silo.py
│   │   │   ├── medmnist_loader.py
│   │   │   └── attack_injector.py
│   │   └── main.py
│   └── requirements.txt
│
├── frontend/
│   └── src/
│       ├── components/
│       │   └── hospital/
│       │       ├── FederatedImaging.tsx
│       │       ├── ClientNodesGrid.tsx
│       │       ├── ConvergencePlot.tsx
│       │       ├── DomainShiftCard.tsx
│       │       └── ProvenanceAudit.tsx
│       ├── pages/
│       │   └── hospital/
│       │       └── Dashboard.tsx
│       └── types/
│           └── fl_telemetry.ts
│
└── README.md
```

------------------------------------------------------------------------

# 28. Acceptance Criteria

The implementation is technically complete when:

-   [ ] Two or more hospital silos can participate in training.
-   [ ] A federated round can be started from the Hospital Command
    Center.
-   [ ] Raw images never leave a local silo.
-   [ ] Patient identifiers never enter the FL service.
-   [ ] DP-SGD is enabled and privacy expenditure is measurable.
-   [ ] FedBN keeps BatchNorm parameters local.
-   [ ] MMD domain shift can be calculated and visualized.
-   [ ] A malicious client can be injected for demonstration.
-   [ ] Multi-Krum and cosine defenses can identify/reject the malicious
    update.
-   [ ] Quarantined clients are excluded from aggregation.
-   [ ] Candidate models are evaluated on decentralized validation data.
-   [ ] Degraded models trigger rollback.
-   [ ] Successful models are registered with SHA-256 provenance.
-   [ ] Live WebSocket telemetry reaches the dashboard.
-   [ ] Existing hospital functionality remains operational.
-   [ ] Frozen patient, doctor, pharmacist, WhatsApp, and voice modules
    remain unchanged.
-   [ ] Baseline comparison experiments are reproducible.

------------------------------------------------------------------------

# 29. 48-Hour Development Priority

## P0 --- Must Work

1.  Federation coordinator.
2.  Two/three simulated hospital clients.
3.  PneumoniaMNIST loader and local training.
4.  DP-SGD.
5.  FedBN parameter separation.
6.  Basic aggregation.
7.  Byzantine attack injection.
8.  Multi-Krum + cosine defense.
9.  Hospital Federated Imaging dashboard.
10. Live WebSocket telemetry.

## P1 --- High Value

1.  MMD domain-shift monitor.
2.  Decentralized validation.
3.  Rollback.
4.  SHA-256 provenance ledger.
5.  Benchmark experiments.
6.  Privacy/utility visualization.

## P2 --- Polish

1.  Advanced UI animations.
2.  Expanded audit filtering.
3.  Additional resilience simulations.
4.  Advanced model lineage visualization.
5.  Presentation-focused UX refinements.

------------------------------------------------------------------------

# 30. Recommended Live Demo Flow

``` text
1. Open Hospital Command Center
        ↓
2. Open Federated Imaging Network
        ↓
3. Show 3 hospital silos
        ↓
4. Start Federated Training
        ↓
5. Show local training + convergence
        ↓
6. Show Raw Images Shared = 0
        ↓
7. Toggle Scanner Domain Shift
        ↓
8. Show MMD divergence
        ↓
9. Inject Label-Flip Attack
        ↓
10. Multi-Krum + Cosine detects rogue node
        ↓
11. Node becomes QUARANTINED
        ↓
12. Clean updates are aggregated
        ↓
13. Candidate model undergoes local validation
        ↓
14. Model is committed or rolled back
        ↓
15. Open Provenance Ledger
        ↓
16. Verify SHA-256 model lineage
        ↓
17. Show benchmark comparison
```

------------------------------------------------------------------------

# 31. Technical Defense Narrative

The system should be defensible using the following concise technical
story:

> MyHealthChain extends its Hospital Command Center with a federated
> clinical AI governance layer. Each hospital trains locally on private
> medical images using DP-SGD. Shared feature layers are federated while
> BatchNorm remains local through FedBN to handle scanner-specific
> distributions. The central coordinator validates incoming updates
> using tensor sanity checks, L2 norms, cosine consensus, and
> Multi-Krum. Candidate models are then evaluated independently on local
> held-out datasets before promotion. Domain divergence is quantified
> using MMD, and every accepted model is linked through SHA-256
> provenance records.

The central engineering claim is:

> **The system does not merely perform federated training; it provides a
> measurable trust, privacy, robustness, validation, and provenance
> layer around the federation.**

------------------------------------------------------------------------

# 32. Final Technical Principle

The prototype should optimize for **credible technical depth**, not
feature count.

The most important chain is:

``` text
Private Medical Data
        ↓
Local DP-SGD
        ↓
Protected Model Update
        ↓
Byzantine Defense
        ↓
FedBN / Domain Harmonization
        ↓
Trust-Aware Aggregation
        ↓
Decentralized Validation
        ↓
Commit / Rollback
        ↓
SHA-256 Provenance
        ↓
Auditable Global Model
```

Every stage must have:

1.  A real implementation.
2.  A visible telemetry signal.
3.  A measurable experiment.
4.  A clear explanation for the judge.
