"""
Trust-Aware FedAvg Aggregation Engine.
Performs sample-weighted federated averaging exclusively over verified, non-quarantined hospital nodes.
"""

from typing import Dict, List, Tuple, Any, Union
import numpy as np

class TrustAwareAggregator:
    """Aggregates local parameter updates weighted by sample cohorts, excluding Byzantine nodes."""

    @classmethod
    def aggregate(
        cls,
        base_weights: Union[np.ndarray, Dict[str, np.ndarray]],
        client_updates: Dict[str, Union[np.ndarray, Dict[str, np.ndarray]]],
        accepted_clients: List[str],
        sample_weights: Dict[str, int],
    ) -> Tuple[Union[np.ndarray, Dict[str, np.ndarray]], Dict[str, Any]]:
        if not accepted_clients:
            return base_weights, {
                "status": "AGGREGATION_ABORTED_NO_VALID_NODES",
                "participants_count": 0,
                "weights_applied": {},
            }

        # Calculate normalized cohort weights among accepted clients
        total_samples = sum(sample_weights.get(cid, 100) for cid in accepted_clients)
        norm_weights = {
            cid: sample_weights.get(cid, 100) / float(total_samples)
            for cid in accepted_clients
        }

        # If updates are 1D numpy vectors
        first_key = accepted_clients[0]
        first_update = client_updates[first_key]

        if isinstance(first_update, np.ndarray):
            aggregated = np.zeros_like(first_update, dtype=np.float32)
            for cid in accepted_clients:
                aggregated += np.array(client_updates[cid], dtype=np.float32) * norm_weights[cid]

            info = {
                "status": "AGGREGATION_SUCCESSFUL",
                "participants_count": len(accepted_clients),
                "total_cohort_samples": total_samples,
                "weights_applied": norm_weights,
            }
            return aggregated, info

        # If updates are dictionaries of parameter tensors
        aggregated_dict: Dict[str, np.ndarray] = {}
        for param_name in first_update.keys():
            param_accum = np.zeros_like(first_update[param_name], dtype=np.float32)
            for cid in accepted_clients:
                node_param = np.array(client_updates[cid][param_name], dtype=np.float32)
                param_accum += node_param * norm_weights[cid]
            aggregated_dict[param_name] = param_accum

        info = {
            "status": "AGGREGATION_SUCCESSFUL",
            "participants_count": len(accepted_clients),
            "total_cohort_samples": total_samples,
            "weights_applied": norm_weights,
        }
        return aggregated_dict, info
