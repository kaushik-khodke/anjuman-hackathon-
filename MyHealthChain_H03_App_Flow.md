# MyHealthChain H-03 — Application Flow

**Project:** MyHealthChain — Federated Clinical Intelligence Network  
**Problem Statement:** H-03 — Privacy-Preserving Collaborative Medical Imaging Network  
**Version:** 1.0.0

---

## 1. Overall Application Flow

```text
LOGIN
  │
  ▼
HOSPITAL COMMAND CENTER
  │
  ├── Existing Hospital Operations
  │      ├── Triage
  │      ├── Beds
  │      ├── Resources
  │      └── Forecasting
  │
  └── FEDERATED CLINICAL INTELLIGENCE
           │
           ▼
      FEDERATION OVERVIEW
           │
     ┌─────┼─────────────┐
     │     │             │
     ▼     ▼             ▼
  Nodes  Training     Global Model
     │     │             │
     └─────┼─────────────┘
           │
           ▼
   COLLABORATIVE IMAGING
           │
           ▼
      LOCAL TRAINING
           │
           ▼
        DP-SGD
           │
           ▼
    PROTECTED UPDATE
           │
           ▼
   BYZANTINE SENTINEL
           │
      ┌────┴────┐
      │         │
   Trusted    Suspicious
      │         │
      ▼         ▼
 Aggregation  Quarantine
      │
      ▼
 DOMAIN DRIFT CHECK
      │
      ▼
 SHADOW VALIDATION
      │
   ┌──┴─────┐
   │        │
 PASS     FAIL
   │        │
   ▼        ▼
COMMIT   ROLLBACK
   │
   ▼
MODEL PROVENANCE
   │
   ▼
GLOBAL MODEL v++
```

---

# 2. Login → Hospital Command Center

```text
User Login
    ↓
Authentication
    ↓
Role Verification
    ↓
Hospital Portal
    ↓
Hospital Command Center
```

The Hospital Command Center remains the main operational workspace.

Existing functionality remains available:

- Emergency triage.
- Bed occupancy.
- Resource management.
- Patient inflow forecasting.
- Existing hospital analytics.

The H-03 functionality is accessed through:

> **Federated Clinical Intelligence**

---

# 3. Hospital Command Center → Federated Intelligence

The existing dashboard contains a summary card:

```text
FEDERATED CLINICAL INTELLIGENCE

● Federation Healthy

Round
18 / 50

Global Model
v18.4

Global AUC
91.4%

Active Nodes
4 / 5

Privacy
ε = 3.0

Raw Images Shared
0

[ OPEN FEDERATION → ]
```

User clicks:

**Open Federation**

↓

Federation Overview.

---

# 4. Federation Overview

The user enters the central H-03 dashboard.

```text
FEDERATION OVERVIEW

┌──────────────────────────────────────────────────┐
│ Federation Status     ● OPERATIONAL             │
│ Round                 18 / 50                    │
│ Global Model          v18.4                      │
│ Global AUC            91.4%                      │
│ Privacy               ε = 3.0                    │
│ Active Nodes          4 / 5                      │
└──────────────────────────────────────────────────┘
```

The screen provides access to:

```text
Hospital Nodes
Training Rounds
Global Model
Privacy
Trust & Security
Domain Drift
Validation
Model Registry
Experiments
Audit
```

---

# 5. Hospital Node Flow

From Federation Overview:

```text
Federation Overview
       ↓
Hospital Nodes
       ↓
Select Hospital
       ↓
Hospital Node Details
```

Node details include:

```text
Hospital A

Status
● TRUSTED

Scanner
GE Healthcare

Samples
1,240

Training
ACTIVE

Gradient Norm
1.04

Cosine Similarity
0.92

MMD
0.14

Privacy
ε = 1.45

FedBN
ACTIVE
```

The user can return to:

**Federation Overview**

or inspect another node.

---

# 6. Collaborative Imaging Flow

```text
Federation Overview
       ↓
Collaborative Imaging
       ↓
Local Dataset
       ↓
Local Model
       ↓
Start Local Training
```

### Local Dataset

```text
PneumoniaMNIST

8,420 images

Images Uploaded
0

🔒 LOCAL ONLY
```

The user selects:

**Start Local Training**

↓

The local client begins model training.

---

# 7. Local Training Flow

```text
Global Model Wt
      ↓
Local Hospital
      ↓
Local Dataset
      ↓
Local Training
      ↓
DP-SGD
      ↓
FedBN
      ↓
Protected Model Update
```

The UI displays:

```text
LOCAL TRAINING

Epoch
7 / 10

Loss
0.214

AUC
89.2%

Privacy
ε = 1.45

FedBN
ACTIVE

Images Shared
0
```

The raw images remain inside the hospital client runtime.

---

# 8. Privacy Flow

After local training:

```text
Local Gradients
      ↓
Per-Sample Gradient Clipping
      ↓
Gaussian Noise
      ↓
DP-SGD
      ↓
Protected Model Update
```

The user can open:

**Privacy Vault**

to view:

```text
Privacy Status
● PROTECTED

ε
3.00

δ
0.00001

Noise Multiplier
0.82

Gradient Clipping
1.0

Budget Consumed
78%

Raw Images Shared
0
```

---

# 9. Protected Update → Federation

```text
Hospital A ─────┐
Hospital B ─────┤
Hospital C ─────┼──→ Federation Coordinator
Hospital D ─────┤
Hospital E ─────┘
```

The coordinator receives protected model updates and telemetry.

It does not receive raw medical images.

---

# 10. Byzantine Update Sentinel Flow

Every incoming update passes through the defense pipeline.

```text
Protected Update
       ↓
Tensor Validation
       ↓
L2 Norm Check
       ↓
Cosine Similarity
       ↓
Multi-Krum
       ↓
Decision
```

### Trusted update

```text
Update
  ↓
Validation ✓
  ↓
L2 ✓
  ↓
Cosine ✓
  ↓
Multi-Krum ✓
  ↓
ACCEPTED
```

### Suspicious update

```text
Update
  ↓
Validation
  ↓
L2 Anomaly
  ↓
Cosine Divergence
  ↓
Multi-Krum
  ↓
REJECTED
  ↓
QUARANTINED
```

---

# 11. Attack Simulation Flow

The demo can intentionally introduce a malicious client.

```text
Trust & Security
       ↓
Attack Simulation
       ↓
Inject Label-Flip Attack
       ↓
Rogue Hospital Trains
       ↓
Malicious Model Update
       ↓
Byzantine Sentinel
       ↓
Detection
       ↓
Quarantine
```

Example:

```text
Hospital D

Gradient Norm
5.82σ

Cosine Similarity
0.08

Multi-Krum
REJECTED

Status
🔴 QUARANTINED
```

The federation must continue operating with trusted nodes.

---

# 12. Domain Drift Flow

After update validation:

```text
Client Latent Statistics
       ↓
Feature Distribution Comparison
       ↓
MMD Calculation
       ↓
Domain Drift Classification
```

Example:

```text
Hospital A
LOW

Hospital B
MODERATE

Hospital C
HIGH
```

The user can open:

**Clinical Domain Drift Monitor**

to inspect:

- Scanner profiles.
- MMD values.
- Hospital-to-hospital distribution differences.
- Domain-shift status.

---

# 13. Aggregation Flow

After defense and domain analysis:

```text
Accepted Updates
       ↓
Trust-Aware Aggregation
       ↓
Candidate Global Model W(t+1)
```

Quarantined clients are excluded.

```text
Hospital A ✓
Hospital B ✓
Hospital C ✓
Hospital D ✕
Hospital E ✓

        ↓

Candidate Model
```

---

# 14. Shadow Validation Flow

The candidate model is not immediately promoted.

```text
Candidate Global Model
        ↓
Hospital A Local Validation
        ↓
Hospital B Local Validation
        ↓
Hospital C Local Validation
        ↓
Aggregate Scalar Metrics
        ↓
Validation Gate
```

Metrics:

```text
AUC-ROC
F1 Score
Validation Loss
```

---

# 15. Commit / Rollback Flow

## Successful Validation

```text
Candidate Model
      ↓
Validation
      ↓
Performance Within Threshold
      ↓
COMMIT
      ↓
Global Model v++
      ↓
Provenance Ledger
```

UI:

```text
✓ MODEL COMMITTED

Model
v18.4

AUC
91.4%

F1
89.2%
```

## Failed Validation

```text
Candidate Model
      ↓
Validation
      ↓
Performance Degradation
      ↓
ROLLBACK
      ↓
Restore Previous Stable Model
      ↓
Audit Event
```

UI:

```text
⚠ MODEL ROLLBACK

Candidate
v18.5

Reason
Validation performance below threshold

Restored
v18.4
```

---

# 16. Model Provenance Flow

After a successful commit:

```text
Committed Model
      ↓
Generate SHA-256 Hash
      ↓
Link Parent Model Hash
      ↓
Record Federation Round
      ↓
Record Participants
      ↓
Record Rejected Clients
      ↓
Record Privacy Budget
      ↓
Record Validation Metrics
      ↓
Model Provenance Ledger
```

Example:

```text
MODEL v18.4

Round
18

Participants
A · B · C · E

Rejected
D

Privacy
ε = 3.0

AUC
91.4%

Parent
v17.9

SHA-256
8F9A21D7...
```

---

# 17. Complete Federation Round Flow

```text
ROUND START
     │
     ▼
Client Selection
     │
     ▼
Global Model Broadcast
     │
     ▼
Local Training
     │
     ▼
DP-SGD
     │
     ▼
Protected Updates
     │
     ▼
Update Validation
     │
     ▼
Byzantine Defense
     │
     ▼
Domain Shift Analysis
     │
     ▼
Trust-Aware Aggregation
     │
     ▼
Candidate Global Model
     │
     ▼
Shadow Validation
     │
     ├───────────────┐
     ▼               ▼
  PASS              FAIL
     │               │
     ▼               ▼
  COMMIT          ROLLBACK
     │               │
     └───────┬───────┘
             ▼
      Provenance Ledger
             │
             ▼
       Round Completed
```

---

# 18. Main Navigation Flow

```text
Hospital Command Center
        │
        ▼
Federated Clinical Intelligence
        │
        ├── Federation Overview
        │       ├── Hospital Nodes
        │       └── Training Rounds
        │
        ├── Collaborative Imaging
        │       ├── Local Dataset
        │       ├── Local Training
        │       └── Global Model
        │
        ├── Privacy Vault
        │       └── Privacy / Utility
        │
        ├── Trust & Security
        │       ├── Byzantine Sentinel
        │       ├── Client Trust
        │       └── Attack Simulation
        │
        ├── Domain Drift
        │       ├── Scanner Profiles
        │       └── MMD Matrix
        │
        ├── Model Registry
        │       ├── Model Versions
        │       └── Provenance
        │
        ├── Validation
        │       └── Cross-Site Validation
        │
        └── Experiments
                ├── Clean
                ├── Domain Shift
                ├── Poisoning
                ├── Privacy
                └── Client Failure
```

---

# 19. Recommended Live Demo Flow

The application should support the following exact judge-facing flow:

### Step 1 — Show Federation

```text
5 Hospital Nodes
A 🟢
B 🟢
C 🟢
D 🟢
E 🟢
```

### Step 2 — Start Training

```text
START FEDERATED ROUND
        ↓
Local Training
        ↓
DP-SGD
        ↓
Aggregation
```

### Step 3 — Prove Privacy

Open Privacy Vault.

Highlight:

```text
RAW IMAGES SHARED
0
```

### Step 4 — Introduce Scanner Shift

```text
ENABLE DOMAIN SHIFT
        ↓
Hospital C
🟢 → 🟡
        ↓
MMD increases
```

### Step 5 — Inject Attack

```text
INJECT LABEL-FLIP ATTACK
        ↓
Hospital D
        ↓
L2 anomaly
        ↓
Cosine divergence
        ↓
Multi-Krum rejection
        ↓
QUARANTINED
```

### Step 6 — Show Resilience

```text
A ✓
B ✓
C ✓
D ✕
E ✓

Aggregation continues.
```

### Step 7 — Validate

```text
Candidate Model
        ↓
Cross-Site Validation
        ↓
PASS
        ↓
MODEL COMMITTED
```

### Step 8 — Show Provenance

```text
Model v18.4
      ↓
Round 18
      ↓
A B C E
      ↓
D rejected
      ↓
ε = 3.0
      ↓
AUC = 91.4%
      ↓
SHA-256
```

---

# 20. Failure and Recovery Flows

## Client Dropout

```text
Training
   ↓
Hospital C disconnects
   ↓
Coordinator detects timeout
   ↓
Client marked OFFLINE
   ↓
Remaining trusted clients continue
   ↓
Round completes
```

## Malicious Client

```text
Training
   ↓
Abnormal update
   ↓
Byzantine Sentinel
   ↓
Client quarantined
   ↓
Excluded from aggregation
   ↓
Federation continues
```

## Model Degradation

```text
Candidate Model
   ↓
Validation
   ↓
Performance below threshold
   ↓
Rollback
   ↓
Previous stable model restored
```

---

# 21. End-to-End Product Flow

```text
                 MYHEALTHCHAIN
                       │
                       ▼
              HOSPITAL COMMAND
                  CENTER
                       │
                       ▼
       FEDERATED CLINICAL INTELLIGENCE
                       │
                       ▼
              FEDERATION OVERVIEW
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
       CLIENTS      TRAINING      MODELS
          │            │            │
          └────────────┼────────────┘
                       ▼
              COLLABORATIVE IMAGING
                       │
                       ▼
                LOCAL TRAINING
                       │
                       ▼
                    DP-SGD
                       │
                       ▼
              PROTECTED UPDATE
                       │
                       ▼
             BYZANTINE SENTINEL
                       │
                ┌──────┴──────┐
                ▼             ▼
             TRUSTED       SUSPICIOUS
                │             │
                ▼             ▼
            AGGREGATE     QUARANTINE
                │
                ▼
             DOMAIN DRIFT
                │
                ▼
          CANDIDATE MODEL
                │
                ▼
         CROSS-SITE VALIDATION
                │
          ┌─────┴─────┐
          ▼           ▼
        COMMIT      ROLLBACK
          │           │
          └─────┬─────┘
                ▼
        MODEL PROVENANCE
                │
                ▼
         GLOBAL MODEL v++
                │
                ▼
        NEXT FEDERATION ROUND
```

---

# 22. Core Application Principle

The complete application should tell one continuous story:

> **Private Medical Data → Local Learning → Privacy Protection → Trust Validation → Domain Intelligence → Secure Federation → Clinical Validation → Auditable Model**

The user should never feel like they are navigating unrelated features.

Every screen should answer one of four questions:

1. **What is the federation doing?**
2. **Can we trust the participating updates?**
3. **Is the model actually improving across hospitals?**
4. **Can we prove how the current model was created?**
