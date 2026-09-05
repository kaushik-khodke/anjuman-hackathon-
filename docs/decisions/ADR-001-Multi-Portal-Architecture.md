# ADR-001: Multi-Portal Role-Based Architecture

* **Status:** Accepted
* **Date:** 2026-08-11
* **Deciders:** Lead Software Architect, Healthcare Domain Leads

## Context
Emergency healthcare platforms serve distinct stakeholders with fundamentally different operational priorities, security boundaries, and user workflows:
1. **Patients:** Require transparent access to personal vitals, prescriptions, and granular consent management.
2. **Doctors:** Require rapid patient history lookup, bedside QR scanning, and digital prescription issuance.
3. **Pharmacists:** Require stock tracking, order fulfillment, and medicine interaction verification.
4. **Hospital Command Centers:** Require high-density real-time ER triage management and resource load balancing.

## Decision
We implement a unified multi-portal architecture using a single React/Vite single-page application with role-based routing and a consolidated FastAPI backend.

## Consequences
* **Positives:** Shared UI components and design systems; centralized authentication and WebSocket event streams; consistent API contracts across all portals.
* **Negatives:** Requires strict role-based access control (RBAC) and server-side authorization to prevent unauthorized cross-portal data access.
