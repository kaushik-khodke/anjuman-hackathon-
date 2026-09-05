"""
FedBN Manager for Local BatchNorm Parameter Isolation.
Resolves domain shift across heterogenous hospital medical imaging scanners (GE, Siemens, Philips, etc.).
"""

from typing import Dict
import numpy as np

class FedBNManager:
    """Partitions network weights into shared global weights vs private local BatchNorm layers."""

    BN_PREFIXES = ("bn", "batch_norm", "running_mean", "running_var", "gamma", "beta")

    @staticmethod
    def is_bn_param(param_name: str) -> bool:
        return any(p in param_name.lower() for p in FedBNManager.BN_PREFIXES)

    @classmethod
    def filter_global_weights(cls, weights: Dict[str, np.ndarray]) -> Dict[str, np.ndarray]:
        """Return only Conv and Linear layers for global aggregation."""
        return {k: v for k, v in weights.items() if not cls.is_bn_param(k)}

    @classmethod
    def filter_local_bn_weights(cls, weights: Dict[str, np.ndarray]) -> Dict[str, np.ndarray]:
        """Return only Batch Normalization parameters to keep locally on-premise."""
        return {k: v for k, v in weights.items() if cls.is_bn_param(k)}
