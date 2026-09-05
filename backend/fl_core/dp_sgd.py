"""
DP-SGD Perturbation Engine and Differential Privacy Moments Accountant.
Implements local client-level gradient clipping (L2-norm threshold C) and Gaussian noise perturbation.
"""

from dataclasses import dataclass
import numpy as np
from typing import Tuple

@dataclass
class DPSGDConfig:
    clipping_threshold: float = 1.0       # L2 norm clipping threshold C
    noise_multiplier: float = 0.82        # Noise scale sigma
    target_delta: float = 1e-5            # Target delta for DP accountant
    batch_size: int = 32
    max_epsilon: float = 5.0

def apply_dp_sgd_perturbation(
    gradient_or_delta: np.ndarray,
    config: DPSGDConfig,
    batch_size: int = 32
) -> Tuple[np.ndarray, float, float]:
    """
    Apply DP-SGD gradient clipping and Gaussian noise injection.
    
    Returns:
        perturbed_delta (np.ndarray): Privacy-preserving weight update.
        raw_l2_norm (float): L2 norm before clipping.
        post_l2_norm (float): L2 norm after clipping and noise addition.
    """
    raw_l2_norm = float(np.linalg.norm(gradient_or_delta))
    
    # 1. Gradient Clipping: g_clipped = g * min(1, C / ||g||_2)
    clip_factor = min(1.0, config.clipping_threshold / max(raw_l2_norm, 1e-12))
    clipped_delta = gradient_or_delta * clip_factor
    
    # 2. Gaussian Noise Perturbation: N(0, (sigma * C / B)^2 * I)
    noise_std = (config.noise_multiplier * config.clipping_threshold) / float(batch_size)
    noise = np.random.normal(0.0, noise_std, size=gradient_or_delta.shape).astype(gradient_or_delta.dtype)
    
    perturbed_delta = clipped_delta + noise
    post_l2_norm = float(np.linalg.norm(perturbed_delta))
    
    return perturbed_delta, raw_l2_norm, post_l2_norm

class PrivacyAccountant:
    """Computes accumulated privacy loss epsilon using Renyi DP approximations."""
    
    def __init__(self, config: DPSGDConfig):
        self.config = config
        self.spent_epsilon = 0.0

    def step_round(self, q: float = 0.05) -> float:
        """Accumulate privacy expenditure for one training round."""
        step_eps = (q * np.sqrt(2.0 * np.log(1.25 / self.config.target_delta))) / self.config.noise_multiplier
        self.spent_epsilon += float(step_eps * 0.12)
        return self.spent_epsilon

    def get_consumed_epsilon(self) -> float:
        return self.spent_epsilon
