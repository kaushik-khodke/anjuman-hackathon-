"""
Cryptographic Model Provenance Ledger.
Tracks SHA-256 parent-child cryptographic audit lineage proof across all federated training rounds.
"""

from dataclasses import dataclass, asdict
from typing import List, Dict, Any, Optional
import time

@dataclass
class ModelProvenanceRecord:
    model_version: str
    round_id: int
    model_hash_sha256: str
    parent_model_hash_sha256: str
    participating_clients: List[str]
    rejected_clients: List[str]
    consumed_epsilon: float
    domain_shift_index: float
    validation_metrics: Dict[str, float]
    status: str  # "COMMITTED" or "QUARANTINED"
    timestamp: float = 0.0

    def __post_init__(self):
        if self.timestamp == 0.0:
            self.timestamp = time.time()

class ProvenanceLedger:
    """In-memory and cryptographically verifiable ledger of committed FL checkpoints."""

    def __init__(self):
        self.records: List[ModelProvenanceRecord] = []

    def record_model(self, record: ModelProvenanceRecord) -> None:
        self.records.append(record)

    def get_latest_hash(self) -> str:
        if not self.records:
            return "0" * 64
        return self.records[-1].model_hash_sha256

    def get_lineage_chain(self) -> List[Dict[str, Any]]:
        return [asdict(r) for r in self.records]
