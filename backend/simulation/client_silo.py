"""
Hospital Client Silo Simulation.
Models an on-premise hospital training node running local DP-SGD, preserving zero-raw-image sharing.
"""

from typing import Dict, Tuple
import numpy as np
from backend.fl_core.dp_sgd import apply_dp_sgd_perturbation, DPSGDConfig
from backend.simulation.medmnist_loader import generate_scanner_cohort
from backend.simulation.attack_injector import AttackInjector

class HospitalClientSilo:
    """Isolated hospital clinical workstation."""

    def __init__(
        self,
        site_id: str,
        hospital_name: str,
        scanner_code: str,
        sample_count: int = 100,
        is_adversarial: bool = False,
        dp_config: DPSGDConfig = None,
    ):
        self.site_id = site_id
        self.hospital_name = hospital_name
        self.scanner_code = scanner_code
        self.sample_count = sample_count
        self.is_adversarial = is_adversarial
        self.dp_config = dp_config or DPSGDConfig()
        self.domain_shifted = False

        # Generate local private cohort
        self.features, self.labels, self.profile = generate_scanner_cohort(
            self.scanner_code, self.sample_count, self.domain_shifted
        )

    def set_domain_shift(self, enabled: bool):
        self.domain_shifted = enabled
        self.features, self.labels, self.profile = generate_scanner_cohort(
            self.scanner_code, self.sample_count, self.domain_shifted
        )

    def train_round(self, global_weights: np.ndarray) -> Tuple[np.ndarray, float, float]:
        """
        Execute local epochs on private features and return privacy-perturbed delta.
        Zero raw images or patient features leave this client silo.
        """
        # Simulated clean gradient pointing towards scanner local optimum
        target_direction = np.random.randn(*global_weights.shape).astype(np.float32) * 0.1
        clean_delta = target_direction - (global_weights * 0.05)

        if self.is_adversarial:
            clean_delta = AttackInjector.poison_update(clean_delta, attack_type="gradient_inversion")

        # Apply DP-SGD perturbation
        perturbed_delta, raw_norm, post_norm = apply_dp_sgd_perturbation(
            clean_delta, self.dp_config, batch_size=self.dp_config.batch_size
        )
        return perturbed_delta, raw_norm, post_norm
