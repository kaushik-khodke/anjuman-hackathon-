"""
Comprehensive Automated Test Suite for Hybrid QML Clinical Disease Prediction
Aligned with SIH Problem Statement 26139: Early Disease Detection
==================================================================
Tests:
1. Classical Feature Normalization & Lexical Mapping
2. Physiological Range Clamping & Missing Value Imputation
3. Quantum Angle Encoding Bounds ([-pi, pi])
4. Insufficient Data Rejection & Safety Boundaries
5. 6-Qubit Parameterized Quantum Circuit Statevector Algebra
6. Variational Quantum Classifier (VQC) Probability Calibration
7. Clinical Explainability & Quantum Telemetry
8. Model Registry & Benchmark Metrics Integration
"""

import os
import sys
import math
import numpy as np
import pytest
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from qml.preprocessing import (
    normalize_input_dictionary,
    validate_and_preprocess,
    SELECTED_FEATURES
)
from qml.quantum_model import (
    execute_numpy_quantum_circuit,
    VariationalQuantumClassifier,
    NUM_QUBITS,
    TOTAL_CIRCUIT_PARAMS
)
from qml.predict import run_qml_disease_prediction, get_demo_clinical_profiles
from qml.model_registry import model_registry


def test_feature_normalization():
    """Verify that clinical colloquial aliases map to canonical features."""
    raw = {
        "Systolic_BP": "142/90",
        "Total_Cholesterol": 240,
        "Pulse_Rate": 160,
        "patient_age": 55,
        "Chest_Pain": "Atypical Angina",
        "ST_Depression": 1.5
    }
    norm = normalize_input_dictionary(raw)

    assert norm["trestbps"] == 142.0
    assert norm["chol"] == 240.0
    assert norm["thalach"] == 160.0
    assert norm["age"] == 55.0
    assert norm["cp"] == 1  # Atypical Angina -> 1
    assert norm["oldpeak"] == 1.5


def test_physiological_bounds_and_imputation():
    """Verify that extreme/unrealistic values are clamped to safe clinical boundaries."""
    raw = {
        "trestbps": 400.0,  # Far above human maximum
        "chol": 50.0,       # Below realistic minimum
        "thalach": 120.0,
        "age": 45.0
    }
    is_valid, vec, cleaned, err = validate_and_preprocess(raw)

    assert is_valid is True
    assert cleaned["trestbps"] == 240.0  # Clamped to max valid 240
    assert cleaned["chol"] == 100.0      # Clamped to min valid 100
    assert "oldpeak" in cleaned          # Imputed with clinical median
    assert "cp" in cleaned               # Imputed with baseline


def test_angle_vector_scaling():
    """Verify that features are converted into angles strictly within [-pi, pi]."""
    raw = {
        "age": 60,
        "trestbps": 150,
        "chol": 260,
        "thalach": 140,
        "oldpeak": 2.0,
        "cp": 2
    }
    is_valid, vec, cleaned, err = validate_and_preprocess(raw)

    assert is_valid is True
    assert vec is not None
    assert len(vec) == 6
    for angle in vec:
        assert -math.pi <= angle <= math.pi


def test_insufficient_data_rejection():
    """Verify that incomplete patient reports are safely refused."""
    raw = {
        "blood_group": "B+",
        "height": 175
        # Lacking BP, Heart Rate, Cholesterol, Age
    }
    is_valid, vec, cleaned, err = validate_and_preprocess(raw)

    assert is_valid is False
    assert vec is None
    assert "Insufficient structured clinical data" in err


def test_numpy_quantum_circuit_execution():
    """Verify that the 6-qubit quantum statevector circuit computes valid expectation values in [-1, 1]."""
    test_features = np.array([0.5, -0.3, 1.2, -0.8, 0.2, -0.4])
    np.random.seed(42)
    test_weights = np.random.uniform(-1.0, 1.0, size=TOTAL_CIRCUIT_PARAMS)

    expval = execute_numpy_quantum_circuit(test_features, test_weights)

    assert isinstance(expval, float)
    assert -1.0 <= expval <= 1.0


def test_vqc_probability_calibration():
    """Verify that VQC forward pass yields probabilities strictly within (0, 1)."""
    vqc = VariationalQuantumClassifier()
    test_features = np.zeros(NUM_QUBITS)

    prob, expval, backend = vqc.forward(test_features)
    assert 0.0 < prob < 1.0
    assert -1.0 <= expval <= 1.0

    prediction = vqc.predict(test_features)
    assert prediction["class_label"] in [0, 1]
    assert prediction["risk_level"] in ["LOW", "MODERATE", "HIGH"]
    assert 0.0 <= prediction["confidence"] <= 1.0
    assert prediction["qubit_count"] == 6


def test_end_to_end_demo_profiles():
    """Verify that low-risk, high-risk, and incomplete profiles behave according to clinical criteria."""
    demos = get_demo_clinical_profiles()

    # 1. Low-Risk Profile
    low_res = run_qml_disease_prediction(demos["low_risk_patient"]["data"])
    assert low_res.success is True
    assert low_res.prediction is not None
    assert low_res.prediction.probability < 0.60
    assert low_res.prediction.risk_level in ["LOW", "MODERATE"]
    assert len(low_res.explainability) == 6
    assert low_res.circuit_telemetry is not None
    assert low_res.circuit_telemetry.qubit_count == 6

    # 2. High-Risk Profile
    high_res = run_qml_disease_prediction(demos["high_risk_patient"]["data"])
    assert high_res.success is True
    assert high_res.prediction is not None
    assert high_res.prediction.probability > low_res.prediction.probability
    assert high_res.prediction.risk_level in ["MODERATE", "HIGH"]

    # 3. Incomplete Record Profile
    inc_res = run_qml_disease_prediction(demos["incomplete_record"]["data"])
    assert inc_res.success is False
    assert inc_res.insufficient_data is True
    assert "Insufficient" in inc_res.error


def test_model_registry_and_benchmarks():
    """Verify that registered QML models and benchmark comparison tables exist."""
    models = model_registry.list_models()
    assert len(models) >= 1
    assert models[0]["model_id"] == "cardiovascular_vqc"

    benchmarks = model_registry.get_benchmark_report("cardiovascular_vqc")
    assert len(benchmarks) >= 3

    model_names = [b.model_name for b in benchmarks]
    assert any("VQC" in name for name in model_names)
    assert any("Random Forest" in name for name in model_names)
    assert any("Logistic Regression" in name for name in model_names)

    # Check that metrics are non-zero valid scores
    for b in benchmarks:
        assert 0.5 <= b.accuracy <= 1.0
        assert 0.5 <= b.f1_score <= 1.0
        assert b.latency_ms > 0.0
