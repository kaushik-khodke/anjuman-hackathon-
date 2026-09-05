"""
Hospital FL API Router & Live Telemetry WebSocket.
Mounts /api/fl/* endpoints for live collaborative training, attack injection, and model provenance.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import Dict, Any, Optional
import asyncio
import json

from backend.fl_core.coordinator import coordinator_instance

router = APIRouter(prefix="/api/fl", tags=["Federated Learning"])

class AttackRequest(BaseModel):
    site_id: str
    enabled: bool

class DomainShiftRequest(BaseModel):
    site_id: str
    enabled: bool

class TrainingRequest(BaseModel):
    rounds: int = 1

@router.get("/live-metrics")
async def get_live_metrics():
    """Retrieve current federation telemetry."""
    return {
        "round": coordinator_instance.current_round,
        "max_rounds": coordinator_instance.max_rounds,
        "accuracy": coordinator_instance.accuracy,
        "loss": coordinator_instance.loss,
        "epsilon": coordinator_instance.accountant.get_consumed_epsilon(),
        "epsilon_max": coordinator_instance.dp_config.max_epsilon,
        "latest_hash": coordinator_instance.ledger.get_latest_hash(),
    }

@router.post("/step-round")
async def step_training_round(req: TrainingRequest):
    """Trigger a synchronous step round in the federated training loop."""
    result = coordinator_instance.step_round()
    return result

@router.post("/inject-attack")
async def inject_attack(req: AttackRequest):
    """Inject/disable Byzantine poisoning attack on a specific client."""
    coordinator_instance.inject_attack(req.site_id, req.enabled)
    return {"status": "SUCCESS", "site_id": req.site_id, "attack_enabled": req.enabled}

@router.post("/toggle-domain-shift")
async def toggle_domain_shift(req: DomainShiftRequest):
    """Toggle scanner domain shift perturbation on a specific site."""
    coordinator_instance.toggle_domain_shift(req.site_id, req.enabled)
    return {"status": "SUCCESS", "site_id": req.site_id, "domain_shift_enabled": req.enabled}

@router.get("/provenance-ledger")
async def get_provenance_ledger():
    """Return cryptographic SHA-256 parent-child model provenance chain."""
    return coordinator_instance.ledger.get_lineage_chain()

@router.websocket("/ws/fl-coordinator")
async def fl_coordinator_ws(websocket: WebSocket):
    """Live WebSocket stream broadcasting training round telemetry and defense audits."""
    await websocket.accept()
    try:
        while True:
            # Send live telemetry snapshot every 1.5 seconds if active
            snapshot = {
                "round": coordinator_instance.current_round,
                "accuracy": coordinator_instance.accuracy,
                "loss": coordinator_instance.loss,
                "epsilon": coordinator_instance.accountant.get_consumed_epsilon(),
                "latest_hash": coordinator_instance.ledger.get_latest_hash(),
            }
            await websocket.send_json(snapshot)
            await asyncio.sleep(1.5)
    except WebSocketDisconnect:
        pass
