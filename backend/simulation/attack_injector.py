"""
Byzantine Attack Injector.
Simulates label-flipping attacks and malicious gradient scaling to verify Byzantine Sentinel defense.
"""

from typing import Dict
import numpy as np

class AttackInjector:
    """Injects simulated adversarial perturbations into client updates."""

    @staticmethod
    def poison_update(
        clean_update: np.ndarray, attack_type: str = "gradient_inversion", scale: float = -3.5
    ) -> np.ndarray:
        if attack_type == "gradient_inversion":
            # Invert direction and scale up magnitude
            return clean_update * scale + np.random.normal(0, 0.2, size=clean_update.shape)
        elif attack_type == "random_noise":
            return np.random.randn(*clean_update.shape) * 10.0
        elif attack_type == "sign_flip":
            return -1.0 * clean_update
        return clean_update
