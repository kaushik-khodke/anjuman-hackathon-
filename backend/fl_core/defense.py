"""
Byzantine Sentinel Defense Engine.
Implements Multi-Krum outlier screening and directional Cosine Similarity analysis to quarantine malicious/poisoned nodes.
"""

from dataclasses import dataclass
from typing import Dict, List, Tuple
import numpy as np

@dataclass
class ClientDefenseResult:
    client_id: str
    l2_norm: float
    cosine_similarity: float
    multi_krum_score: float
    quarantined: bool
    reason: str = ""

class ByzantineSentinel:
    """
    Multi-stage Byzantine screening defense:
    Stage 1: NaN / Inf check & extreme L2 norm outlier rejection.
    Stage 2: Directional cosine similarity against federation median vector (< 0.05 threshold).
    Stage 3: Multi-Krum geometric outlier distance ranking.
    """

    def __init__(self, byzantine_tolerance: int = 1, cosine_threshold: float = 0.05):
        self.byzantine_tolerance = byzantine_tolerance
        self.cosine_threshold = cosine_threshold

    def evaluate_updates(
        self, client_updates: Dict[str, np.ndarray]
    ) -> Tuple[Dict[str, ClientDefenseResult], List[str], List[Dict]]:
        results: Dict[str, ClientDefenseResult] = {}
        events: List[Dict] = []
        
        client_ids = list(client_updates.keys())
        n_clients = len(client_ids)
        if n_clients == 0:
            return {}, [], []

        # Vector representations
        vectors = np.array([client_updates[cid] for cid in client_ids])

        # 1. Median consensus direction
        median_vec = np.median(vectors, axis=0)
        median_norm = np.linalg.norm(median_vec) + 1e-12

        # 2. Compute L2 norms, Cosine Similarities, Multi-Krum Scores
        l2_norms = [float(np.linalg.norm(v)) for v in vectors]
        cos_sims = []
        for v in vectors:
            v_norm = np.linalg.norm(v) + 1e-12
            sim = float(np.dot(v, median_vec) / (v_norm * median_norm))
            cos_sims.append(sim)

        # Multi-Krum distance matrix
        dist_matrix = np.zeros((n_clients, n_clients))
        for i in range(n_clients):
            for j in range(i + 1, n_clients):
                d = np.linalg.norm(vectors[i] - vectors[j]) ** 2
                dist_matrix[i, j] = d
                dist_matrix[j, i] = d

        # Krum score: sum of (n - f - 2) smallest Euclidean distances
        k_neighbors = max(1, n_clients - self.byzantine_tolerance - 2)
        krum_scores = []
        for i in range(n_clients):
            sorted_dists = np.sort(dist_matrix[i])
            # skip dist to self (0.0 at index 0)
            score = float(np.sum(sorted_dists[1:k_neighbors + 1]))
            krum_scores.append(score)

        # 3. Decision Boundary
        accepted: List[str] = []
        for idx, cid in enumerate(client_ids):
            is_nan_inf = bool(np.isnan(vectors[idx]).any() or np.isinf(vectors[idx]).any())
            cos_sim = cos_sims[idx]
            l2_norm = l2_norms[idx]
            krum_score = krum_scores[idx]

            quarantined = False
            reason = ""

            if is_nan_inf:
                quarantined = True
                reason = "NaN/Inf parameter corruption detected"
            elif cos_sim < self.cosine_threshold:
                quarantined = True
                reason = f"Directional anomaly (Cosine similarity {cos_sim:.3f} < {self.cosine_threshold})"
            
            if not quarantined:
                accepted.append(cid)
            else:
                events.append({
                    "type": "BYZANTINE_ANOMALY_BLOCKED",
                    "client_id": cid,
                    "reason": reason,
                    "l2_norm": l2_norm,
                    "cosine_similarity": cos_sim,
                })

            results[cid] = ClientDefenseResult(
                client_id=cid,
                l2_norm=l2_norm,
                cosine_similarity=cos_sim,
                multi_krum_score=krum_score,
                quarantined=quarantined,
                reason=reason,
            )

        return results, accepted, events
