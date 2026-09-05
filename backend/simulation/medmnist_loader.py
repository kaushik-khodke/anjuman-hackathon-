"""
Non-IID Pneumonia X-Ray Scanner Partitioning Loader.
Simulates GE, Siemens, Philips, Rogue, and Mayo imaging scanner noise, contrast, and resolution profiles.
"""

from typing import Dict, Tuple
import numpy as np

def generate_scanner_cohort(
    site_code: str, num_samples: int = 100, is_domain_shifted: bool = False
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Generate synthetic non-IID 16-dimensional feature representations for hospital scanners.
    
    Returns:
        features (np.ndarray): Shape (num_samples, 16)
        labels (np.ndarray): Binary labels 0 (Normal) or 1 (Pneumonia)
        scanner_profile (np.ndarray): Mean feature bias
    """
    np.random.seed(abs(hash(site_code)) % (2**31))
    
    # Scanner-specific feature bias
    biases: Dict[str, float] = {
        "GE_XR": 0.25,
        "SIEMENS_LUM": -0.15,
        "PHILIPS_DUO": 0.40,
        "ROGUE_NODE": 1.20,
        "MAYO_CANON": -0.30,
    }
    bias = biases.get(site_code, 0.0)
    if is_domain_shifted:
        bias += 1.5  # Heavy domain shift perturbation

    # Features: (N, 16) with scanner contrast and noise
    base = np.random.randn(num_samples, 16).astype(np.float32)
    features = base * 0.8 + bias
    features = np.maximum(0.0, features)  # Non-negative intensities

    # Synthetic labels correlated with feature magnitude
    logits = np.sum(features[:, :8], axis=1) - 4.0
    probs = 1.0 / (1.0 + np.exp(-logits))
    labels = (probs > 0.5).astype(np.int32)

    return features, labels, np.array([bias], dtype=np.float32)
