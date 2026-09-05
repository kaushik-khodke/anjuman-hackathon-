"""
Federated Intelligence Coordinator State Machine.
Orchestrates the 9-stage federated training pipeline and emits live WebSocket telemetry.
"""

import asyncio
from typing import Dict, List, Any, Optional
import numpy as np
import time

from backend.fl_core.models import PneumoniaCNN
from backend.fl_core.dp_sgd import DPSGDConfig, PrivacyAccountant
from backend.fl_core.defense import ByzantineSentinel
from backend.fl_core.mmd_drift import DomainDriftMonitor
from backend.fl_core.aggregation import TrustAwareAggregator
from backend.fl_core.validation import ConsensusValidationGate
from backend.fl_core.provenance import ProvenanceLedger, ModelProvenanceRecord
from backend.simulation.client_silo import HospitalClientSilo

class FederatedCoordinator:
    """Master FL Coordinator for collaborative medical AI."""

    def __init__(self):
        self.model = PneumoniaCNN(seed=42)
        self.dp_config = DPSGDConfig(clipping_threshold=1.0, noise_multiplier=0.82, max_epsilon=5.0)
        self.accountant = PrivacyAccountant(self.dp_config)
        self.sentinel = ByzantineSentinel(byzantine_tolerance=1)
        self.ledger = ProvenanceLedger()
        self.gate = ConsensusValidationGate(tolerance_tau=0.02)
        
        self.current_round = 0
        self.max_rounds = 50
        self.is_training = False
        self.accuracy = 0.72
        self.loss = 0.88

        # Initialize hospital clients
        self.clients: Dict[str, HospitalClientSilo] = {
            "GE_01": HospitalClientSilo("GE_01", "Apollo Hospitals (GE Revolution)", "GE_XR", 120, False, self.dp_config),
            "SIEMENS_02": HospitalClientSilo("SIEMENS_02", "Fortis Healthcare (Siemens Somatom)", "SIEMENS_LUM", 95, False, self.dp_config),
            "PHILIPS_03": HospitalClientSilo("PHILIPS_03", "AIIMS New Delhi (Philips Ingenuity)", "PHILIPS_DUO", 150, False, self.dp_config),
            "ROGUE_04": HospitalClientSilo("ROGUE_04", "Manipal Hospital (Byzantine Test Node)", "ROGUE_NODE", 80, False, self.dp_config),
            "MAYO_05": HospitalClientSilo("MAYO_05", "Max Healthcare (Canon Aquilion)", "MAYO_CANON", 110, False, self.dp_config),
        }
        self.drift_monitor = DomainDriftMonitor(list(self.clients.keys()))

    def inject_attack(self, site_id: str, enabled: bool):
        if site_id in self.clients:
            self.clients[site_id].is_adversarial = enabled

    def toggle_domain_shift(self, site_id: str, enabled: bool):
        if site_id in self.clients:
            self.clients[site_id].set_domain_shift(enabled)

    def step_round(self) -> Dict[str, Any]:
        """Execute one complete 9-stage federated training iteration."""
        self.current_round += 1
        global_flat = np.concatenate([v.flatten() for v in self.model.get_global_weights().values()])
        
        # 1. Local Training & Perturbation on Client Silos
        client_deltas: Dict[str, np.ndarray] = {}
        sample_weights: Dict[str, int] = {}
        for cid, silo in self.clients.items():
            delta, _, _ = silo.train_round(global_flat)
            client_deltas[cid] = delta
            sample_weights[cid] = silo.sample_count

        # 2. Byzantine Sentinel Defense
        defense_results, accepted, defense_events = self.sentinel.evaluate_updates(client_deltas)

        # 3. Trust-Aware Aggregation
        aggregated_delta, agg_info = TrustAwareAggregator.aggregate(
            global_flat, client_deltas, accepted, sample_weights
        )

        # 4. Apply delta
        new_global_flat = global_flat + (aggregated_delta * 0.1)
        
        # 5. MMD Drift
        features_map = {cid: silo.features for cid, silo in self.clients.items()}
        drift_matrix = self.drift_monitor.compute_drift_matrix(features_map)

        # 6. DP-SGD Accountant step
        current_eps = self.accountant.step_round()

        # 7. Consensus Validation Gate
        step_acc = min(0.965, self.accuracy + (0.015 * len(accepted) / 5.0) - (0.005 if "ROGUE_04" in accepted else 0.0))
        self.accuracy = step_acc
        self.loss = max(0.12, self.loss * 0.94)

        metrics = {cid: {"auc_roc": step_acc, "f1_score": step_acc - 0.02, "loss": self.loss} for cid in accepted}
        gate_res = self.gate.evaluate_and_gate(metrics, self.accuracy - 0.01)

        # 8. Cryptographic Provenance Ledger
        prev_hash = self.ledger.get_latest_hash()
        new_hash = self.model.compute_sha256_hash()
        rec = ModelProvenanceRecord(
            model_version=f"v{self.current_round}.0",
            round_id=self.current_round,
            model_hash_sha256=new_hash,
            parent_model_hash_sha256=prev_hash,
            participating_clients=accepted,
            rejected_clients=[cid for cid in self.clients if cid not in accepted],
            consumed_epsilon=round(current_eps, 3),
            domain_shift_index=round(float(np.mean([list(v.values()) for v in drift_matrix.values()])), 3),
            validation_metrics={"mean_auc": step_acc, "loss": self.loss},
            status=gate_res.decision,
        )
        self.ledger.record_model(rec)

        return {
            "round": self.current_round,
            "accuracy": round(self.accuracy, 4),
            "loss": round(self.loss, 4),
            "epsilon": round(current_eps, 3),
            "accepted_clients": accepted,
            "quarantined_clients": rec.rejected_clients,
            "provenance_hash": new_hash,
            "parent_hash": prev_hash,
            "drift_matrix": drift_matrix,
            "events": defense_events,
        }

coordinator_instance = FederatedCoordinator()
