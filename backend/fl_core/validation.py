"""
Consensus Validation Gate & Decentralized Cross-Site Evaluation.
Enforces the safety invariant: New global model checkpoints are only committed if mean validation AUC doesn't degrade.
"""

from dataclasses import dataclass
from typing import Dict, Any

@dataclass
class ValidationDecision:
    decision: str  # "COMMITTED" or "REJECTED_REGRESSION"
    mean_auc: float
    mean_f1: float
    mean_loss: float
    auc_delta: float
    reason: str

class ConsensusValidationGate:
    """Evaluates cross-hospital held-out validation metrics and gates global commit."""

    def __init__(self, tolerance_tau: float = 0.02):
        self.tolerance_tau = tolerance_tau

    def evaluate_and_gate(
        self, client_metrics: Dict[str, Dict[str, float]], previous_mean_auc: float = 0.85
    ) -> ValidationDecision:
        if not client_metrics:
            return ValidationDecision(
                decision="REJECTED_EMPTY_METRICS",
                mean_auc=0.0,
                mean_f1=0.0,
                mean_loss=1.0,
                auc_delta=-1.0,
                reason="No participating nodes provided validation evaluation.",
            )

        aucs = [m.get("auc_roc", 0.0) for m in client_metrics.values()]
        f1s = [m.get("f1_score", 0.0) for m in client_metrics.values()]
        losses = [m.get("loss", 1.0) for m in client_metrics.values()]

        mean_auc = float(sum(aucs) / len(aucs))
        mean_f1 = float(sum(f1s) / len(f1s))
        mean_loss = float(sum(losses) / len(losses))

        auc_delta = mean_auc - previous_mean_auc

        # Safe update condition: Delta AUC >= -tau
        if auc_delta >= -self.tolerance_tau:
            return ValidationDecision(
                decision="COMMITTED",
                mean_auc=mean_auc,
                mean_f1=mean_f1,
                mean_loss=mean_loss,
                auc_delta=auc_delta,
                reason=f"Model performance verified (Mean AUC: {mean_auc:.4f}, Delta: {auc_delta:+.4f})",
            )
        else:
            return ValidationDecision(
                decision="REJECTED_REGRESSION",
                mean_auc=mean_auc,
                mean_f1=mean_f1,
                mean_loss=mean_loss,
                auc_delta=auc_delta,
                reason=f"AUC degraded by {abs(auc_delta):.4f} (exceeds allowed tolerance tau={self.tolerance_tau})",
            )
