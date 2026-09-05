# 🎬 MyHealthChain — Official Hackathon Evaluation & Demo Walkthrough Guide

Welcome evaluators and judges! This guide provides a 5–7 minute step-by-step demonstration sequence to test and evaluate the entire **MyHealthChain** ecosystem across all 4 portals and integrated AI/ML engines.

---

## ⚡ 1-Minute Quick Start

```bash
# 1. Clone & Setup
git clone <repository_url>
cd MyHealthChain
./setup.sh       # Windows: .\setup.ps1

# 2. Launch All Services
./start.sh       # Windows: .\start_all.ps1
```

* **Frontend UI:** `http://localhost:5173`
* **FastAPI Backend:** `http://localhost:8000`
* **Swagger API Docs:** `http://localhost:8000/docs`
* **Health Endpoint:** `http://localhost:8000/health`

---

## 🧭 5–7 Minute Evaluation Demo Sequence

```
  STEP 1                 STEP 2                STEP 3               STEP 4               STEP 5
┌───────────────┐      ┌──────────────┐      ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Hospital      │  ──► │ Patient      │  ──► │ Doctor       │ ──►│ Pharmacist   │ ──►│ Command      │
│ Command       │      │ Intake &     │      │ Verification │    │ Fulfillment  │    │ Forecasting  │
│ Overview      │      │ AI Triage    │      │ & Consent    │    │ & Stripe     │    │ & Surge AI   │
└───────────────┘      └──────────────┘      └──────────────┘     └──────────────┘     └──────────────┘
```

---

### Step 1: Hospital Command Center (Flagship Dashboard)
1. Open `http://localhost:5173` and navigate to **Hospital Command Center**.
2. **Observe Live Capacity:** View ICU beds, General Ward beds, ER Bays, Ventilators, Oxygen cylinders, and Blood Bank inventory.
3. **Observe Live ESI Triage Queue:** Inspect patient queue grouped by ESI priority bands:
   - 🔴 **RED (ESI 1):** Immediate Life Threat
   - 🟠 **ORANGE (ESI 2):** Emergent / High Risk
   - 🟡 **YELLOW (ESI 3):** Urgent
   - 🟢 **GREEN (ESI 4):** Less Urgent
   - 🔵 **BLUE (ESI 5):** Non-Urgent

---

### Step 2: Patient Portal & Real-Time ML Triage
1. Navigate to **Patient Portal** (`http://localhost:5173/patient/health-tracker`).
2. Input patient symptoms: *"Severe acute chest pressure radiating to left arm, shortness of breath"*.
3. Input vitals: `BP: 155/95`, `Heart Rate: 112`, `SpO2: 92%`.
4. Click **Submit Triage Assessment**.
5. **Verify Real ML Execution:** The backend XGBoost model (`/predict-triage`) processes the vitals and outputs **RED (ESI 1 / Urgency 92/100)** with an explicit clinical safety disclaimer badge (`AI-Assisted Assessment — Requires Clinician Confirmation`).

---

### Step 3: Doctor Portal & Consent Verification
1. Navigate to **Doctor Portal** (`http://localhost:5173/doctor/dashboard`).
2. **Observe Instant Sync:** The new RED priority patient immediately appears at the top of the assigned emergency queue.
3. **Smart Health Card QR Scanner:** Test the physical QR scanner interface (`/doctor/scan`) and verify 4-digit PIN authentication before opening encrypted medical history.
4. **Issue Prescription:** Write a digital prescription for *Paracetamol 500mg* and dispatch to pharmacy.

---

### Step 4: Pharmacist Portal & Payment Workflow
1. Navigate to **Pharmacist Portal** (`http://localhost:5173/pharmacist/dashboard`).
2. **Observe Incoming Order:** The digital prescription appears in the order queue.
3. **Test Pharmacist AI:** Ask the AI agent: *"Verify stock for Paracetamol 500mg"*.
4. **Stripe Checkout Test:** Click **Generate Checkout Link** (`/create-checkout-session`) to test the automated payment link.

---

### Step 5: Resource Load Balancing & 4-Signal Forecasting
1. Return to **Hospital Command Center** (`http://localhost:5173/hospital/resource-balancer`).
2. **Run 4-Signal Inflow Forecast:** Click **Generate Inflow Forecast**.
3. **Observe Signal Decomposition:**
   - *Signal 1:* 4-Week Rolling Trend
   - *Signal 2:* Bed Occupancy Pressure Multiplier
   - *Signal 3:* IPFS Disease Vector Scan
   - *Signal 4:* Seasonal Weather Adjustment (Monsoon / Winter Multipliers)
4. **Gemini Strategic Command Analyzer:** View AI-generated bottleneck recommendations and resource re-allocation strategies.

---

## 🧪 Automated Testing Verification

Evaluators can run the full automated test suite at any time:

```bash
cd backend
pytest tests/ -v
```

Expected output: All unit, integration, ML prediction, and fallback resilience tests pass cleanly!
