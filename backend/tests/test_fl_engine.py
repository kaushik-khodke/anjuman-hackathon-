"""
Automated Test Suite for H-03 Federated Clinical Intelligence Network
Verifies:
1. DP-SGD Gradient Clipping & Noise Perturbation
2. FedBN Parameter Separation
3. Byzantine Sentinel (Multi-Krum + Cosine Similarity Defense)
4. Domain Drift (Maximum Mean Discrepancy MMD Matrix)
5. Trust-Aware Weighted Aggregation
6. Consensus Validation Gate & SHA-256 Provenance
"""

import pytest
import numpy as np
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.fl_core.models import PneumoniaCNN
from backend.fl_core.dp_sgd import apply_dp_sgd_perturbation, DPSGDConfig, PrivacyAccountant
from backend.fl_core.fedbn import FedBNManager
from backend.fl_core.defense import ByzantineSentinel
from backend.fl_core.mmd_drift import DomainDriftMonitor, calculate_mmd
from backend.fl_core.aggregation import TrustAwareAggregator
from backend.fl_core.validation import ConsensusValidationGate
from backend.fl_core.provenance import ProvenanceLedger, ModelProvenanceRecord

def test_pneumonia_cnn_parameters():
    model = PneumoniaCNN(seed=42)
    global_weights = model.get_global_weights()
    local_bn = model.get_local_bn_weights()

    assert "conv1_w" in global_weights
    assert "fc1_w" in global_weights
    assert "bn1_gamma" in local_bn
    assert "bn2_running_mean" in local_bn

    # Verify SHA-256 provenance hash is deterministic
    h1 = model.compute_sha256_hash()
    h2 = model.compute_sha256_hash()
    assert len(h1) == 64
    assert h1 == h2

def test_dp_sgd_perturbation():
    config = DPSGDConfig(clipping_threshold=1.0, noise_multiplier=0.82, batch_size=32)
    # Huge gradient that must be clipped
    raw_grad = np.ones((100,)) * 10.0
    perturbed, raw_norm, post_norm = apply_dp_sgd_perturbation(raw_grad, config, batch_size=32)

    assert raw_norm > 50.0
    # After clipping to C=1.0 + small noise, norm should be approximately ~1.0
    assert post_norm < 5.0
    assert perturbed.shape == raw_grad.shape

def test_fedbn_parameter_isolation():
    model = PneumoniaCNN()
    weights = model.get_global_weights()
    bn_weights = model.get_local_bn_weights()

    filtered_global = FedBNManager.filter_global_weights(weights)
    filtered_bn = FedBNManager.filter_local_bn_weights(bn_weights)

    assert "conv1_w" in filtered_global
    assert "bn1_gamma" not in filtered_global
    assert "bn1_gamma" in filtered_bn
    assert "conv1_w" not in filtered_bn

def test_byzantine_sentinel_defense():
    sentinel = ByzantineSentinel(byzantine_tolerance=1)
    
    # 4 clean clients pointing roughly in same direction + 1 malicious client pointing opposite and scaled up
    np.random.seed(42)
    base_dir = np.random.randn(100)
    
    clean_a = base_dir + np.random.normal(0, 0.1, size=100)
    clean_b = base_dir + np.random.normal(0, 0.1, size=100)
    clean_c = base_dir + np.random.normal(0, 0.1, size=100)
    clean_e = base_dir + np.random.normal(0, 0.1, size=100)
    
    # Malicious rogue client: inverted direction and large norm
    malicious_d = -5.0 * base_dir + np.random.normal(0, 0.5, size=100)

    client_updates = {
        "HOSPITAL_GE_01": clean_a,
        "HOSPITAL_SIEMENS_02": clean_b,
        "HOSPITAL_PHILIPS_03": clean_c,
        "HOSPITAL_ROGUE_04": malicious_d,
        "HOSPITAL_MAYO_05": clean_e
    }

    results, accepted, events = sentinel.evaluate_updates(client_updates)

    assert "HOSPITAL_ROGUE_04" not in accepted
    assert results["HOSPITAL_ROGUE_04"].quarantined is True
    assert results["HOSPITAL_ROGUE_04"].cosine_similarity < 0.0
    assert "HOSPITAL_GE_01" in accepted
    assert "HOSPITAL_SIEMENS_02" in accepted

def test_mmd_domain_drift():
    np.random.seed(42)
    # Distribution 1
    X = np.random.normal(0.0, 1.0, size=(50, 16))
    # Distribution 1 same
    Y = np.random.normal(0.0, 1.0, size=(50, 16))
    # Distribution 2 shifted
    Z = np.random.normal(3.0, 1.0, size=(50, 16))

    mmd_low = calculate_mmd(X, Y)
    mmd_high = calculate_mmd(X, Z)

    assert mmd_low < mmd_high
    assert mmd_high > 0.5

def test_trust_aware_aggregation():
    base_w = np.zeros(10)
    updates = {
        "A": np.ones(10) * 1.0,
        "B": np.ones(10) * 2.0,
        "ROGUE": np.ones(10) * -100.0
    }
    accepted = ["A", "B"]
    sample_weights = {"A": 100, "B": 100, "ROGUE": 100}

    new_w, info = TrustAwareAggregator.aggregate(base_w, updates, accepted, sample_weights)
    
    assert info["status"] == "AGGREGATION_SUCCESSFUL"
    assert info["participants_count"] == 2
    # Mean of 1.0 and 2.0 is 1.5
    assert np.allclose(new_w, 1.5)

def test_consensus_validation_and_provenance():
    gate = ConsensusValidationGate(tolerance_tau=0.02)
    metrics = {
        "A": {"auc_roc": 0.92, "f1_score": 0.90, "loss": 0.20},
        "B": {"auc_roc": 0.91, "f1_score": 0.89, "loss": 0.22}
    }
    res = gate.evaluate_and_gate(metrics, previous_mean_auc=0.90)
    assert res.decision == "COMMITTED"
    assert res.auc_delta > 0

    ledger = ProvenanceLedger()
    rec = ModelProvenanceRecord(
        model_version="v19.0",
        round_id=19,
        model_hash_sha256="abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        parent_model_hash_sha256="1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        participating_clients=["A", "B"],
        rejected_clients=["ROGUE"],
        consumed_epsilon=3.15,
        domain_shift_index=0.12,
        validation_metrics={"mean_auc": 0.915, "mean_f1": 0.895, "mean_loss": 0.210},
        status="COMMITTED"
    )
    ledger.record_model(rec)
    chain = ledger.get_lineage_chain()
    assert len(chain) == 1
    assert chain[0]["model_version"] == "v19.0"
