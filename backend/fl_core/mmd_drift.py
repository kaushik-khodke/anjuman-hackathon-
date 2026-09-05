"""
Maximum Mean Discrepancy (MMD) Matrix & Domain Drift Monitoring.
Computes non-parametric multi-scale RBF kernel statistical distance between hospital imaging scanner distributions.
"""

from typing import Dict, List
import numpy as np

def rbf_kernel(X: np.ndarray, Y: np.ndarray, gamma: float = 1.0) -> np.ndarray:
    """Compute RBF Kernel matrix K(x, y) = exp(-gamma * ||x - y||^2)."""
    # Squared Euclidean distances
    X_sq = np.sum(X ** 2, axis=1, keepdims=True)
    Y_sq = np.sum(Y ** 2, axis=1, keepdims=True)
    dist = X_sq - 2.0 * np.dot(X, Y.T) + Y_sq.T
    return np.exp(-gamma * np.maximum(0.0, dist))

def calculate_mmd(X: np.ndarray, Y: np.ndarray, gammas: List[float] = None) -> float:
    """
    Calculate empirical Maximum Mean Discrepancy with multi-scale RBF kernels.
    MMD^2(P, Q) = E[k(x,x')] - 2E[k(x,y)] + E[k(y,y')]
    """
    if gammas is None:
        # Scaled bandwidths for multi-dimensional feature vectors
        gammas = [0.001, 0.005, 0.01, 0.05]

    n = X.shape[0]
    m = Y.shape[0]
    if n == 0 or m == 0:
        return 0.0

    total_mmd2 = 0.0
    for g in gammas:
        K_xx = rbf_kernel(X, X, gamma=g)
        K_yy = rbf_kernel(Y, Y, gamma=g)
        K_xy = rbf_kernel(X, Y, gamma=g)

        # Unbiased MMD estimate excluding diagonal self-similarities
        term_xx = (np.sum(K_xx) - np.trace(K_xx)) / max(1, (n * (n - 1)))
        term_yy = (np.sum(K_yy) - np.trace(K_yy)) / max(1, (m * (m - 1)))
        term_xy = np.sum(K_xy) / (n * m)

        total_mmd2 += max(0.0, float(term_xx + term_yy - 2.0 * term_xy))

    return float(np.sqrt(total_mmd2 / len(gammas)))

class DomainDriftMonitor:
    """Tracks cross-hospital pairwise scanner feature distribution drift."""

    def __init__(self, hospital_names: List[str]):
        self.hospital_names = hospital_names

    def compute_drift_matrix(self, site_features: Dict[str, np.ndarray]) -> Dict[str, Dict[str, float]]:
        matrix: Dict[str, Dict[str, float]] = {}
        for h1 in self.hospital_names:
            matrix[h1] = {}
            for h2 in self.hospital_names:
                if h1 == h2:
                    matrix[h1][h2] = 0.0
                elif h1 in site_features and h2 in site_features:
                    val = calculate_mmd(site_features[h1], site_features[h2])
                    matrix[h1][h2] = round(val, 4)
                else:
                    matrix[h1][h2] = 0.0
        return matrix
