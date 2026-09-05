# ADR-004: XGBoost Emergency Severity Index (ESI) Triage Classification

* **Status:** Accepted
* **Date:** 2026-08-11
* **Deciders:** Lead Software Architect, Clinical ML Leads

## Context
Traditional emergency room triage relies on manual evaluation of physiological vitals (heart rate, blood pressure, SpO2, temperature, age, chief complaint). Manual triage is prone to delay and human error during mass surge events.

## Decision
We implement a real-time XGBoost Classifier (`ml_triage.py`) trained to map vital sign vectors into 5 Emergency Severity Index (ESI) priority tiers:
- **RED (ESI 1 - Resuscitation):** Immediate life threat
- **ORANGE (ESI 2 - Emergent):** High risk, immediate bed allocation
- **YELLOW (ESI 3 - Urgent):** Multiple resources needed, stable vitals
- **GREEN (ESI 4 - Less Urgent):** Single resource / consultation
- **BLUE (ESI 5 - Non-Urgent):** Routine checkup / refill

## Consequences
* **Positives:** Predicts priority in under 5 milliseconds; deterministic physiological threshold bounds; continuous model re-training support.
* **Negatives:** Requires physiological fallback rule-sets when raw vital inputs are incomplete or contain physiological anomalies.
