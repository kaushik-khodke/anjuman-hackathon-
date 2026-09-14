"""
QML Prediction Service & Inference Orchestrator
Aligned with SIH Problem Statement 26139: Early Disease Detection
==================================================================
Coordinates:
1. Input validation and lexical feature mapping.
2. Physiological boundary enforcement and missing data handling.
3. Variational Quantum Classifier (VQC) circuit execution.
4. Explainability and quantum circuit telemetry generation.
5. Clinical safety disclaimers and confidence thresholds.
"""

from typing import Dict, Any, Optional, List
import numpy as np

from qml.schemas import (
    QMLAnalysisResponse,
    QMLPredictionResult,
    QuantumCircuitTelemetry,
    ClinicalFactorContribution
)
from qml.preprocessing import validate_and_preprocess, SELECTED_FEATURES
from qml.quantum_model import VariationalQuantumClassifier
from qml.explain import generate_explainability
from qml.model_registry import model_registry


# Singleton cached VQC model instance
_cached_vqc: Optional[VariationalQuantumClassifier] = None


def get_or_load_vqc_model() -> VariationalQuantumClassifier:
    """Loads and caches the trained Variational Quantum Classifier."""
    global _cached_vqc
    if _cached_vqc is None:
        artifacts = model_registry.load_model_artifacts("cardiovascular_vqc")
        weights = artifacts.get("weights")
        bias = artifacts.get("bias", -0.18)
        scale = artifacts.get("output_scale", 1.62)
        _cached_vqc = VariationalQuantumClassifier(weights=weights, bias=bias, output_scale=scale)
    return _cached_vqc


def run_qml_disease_prediction(
    raw_data: Dict[str, Any],
    patient_id: Optional[str] = None
) -> QMLAnalysisResponse:
    """
    Executes end-to-end Hybrid QML clinical disease prediction pipeline.
    """
    benchmarks = model_registry.get_benchmark_report("cardiovascular_vqc")

    # 1. Classical Preprocessing & Validation
    is_valid, angle_vector, clean_features, error_msg = validate_and_preprocess(raw_data)

    if not is_valid or angle_vector is None:
        return QMLAnalysisResponse(
            success=False,
            model="Hybrid Quantum-Classical VQC",
            framework="PennyLane / Quantum Statevector Simulator",
            model_version="1.0.0",
            prediction=None,
            features_used=[],
            circuit_telemetry=None,
            explainability=[],
            benchmark_comparison=benchmarks,
            clinical_disclaimer=(
                "Insufficient structured clinical data for reliable QML prediction. "
                "AI-Assisted Assessment requires at least two core vital markers (e.g., Blood Pressure, Heart Rate, Age)."
            ),
            error=error_msg or "Insufficient clinical features for QML prediction.",
            insufficient_data=True
        )

    # 2. Hybrid Quantum Circuit Execution
    try:
        vqc = get_or_load_vqc_model()
        vqc_result = vqc.predict(angle_vector)

        # 3. Explainability & Circuit Telemetry
        contributions, telemetry = generate_explainability(clean_features, vqc_result)

        prediction_result = QMLPredictionResult(
            disease="cardiovascular_disease",
            disease_label="Cardiovascular Disease / Coronary Heart Disease Indication",
            class_label=vqc_result["class_label"],
            probability=vqc_result["probability"],
            risk_level=vqc_result["risk_level"],
            confidence=vqc_result["confidence"]
        )

        return QMLAnalysisResponse(
            success=True,
            model="Hybrid Quantum-Classical VQC",
            framework=vqc_result.get("backend", "PennyLane.default.qubit"),
            model_version="1.0.0",
            prediction=prediction_result,
            features_used=SELECTED_FEATURES,
            circuit_telemetry=telemetry,
            explainability=contributions,
            benchmark_comparison=benchmarks,
            clinical_disclaimer=(
                "AI-Assisted Assessment — Requires Clinician Confirmation. "
                "This output is computed by a Hybrid Quantum Machine Learning model for clinical decision support "
                "and is not a final medical diagnosis."
            ),
            error=None,
            insufficient_data=False
        )

    except Exception as e:
        return QMLAnalysisResponse(
            success=False,
            model="Hybrid Quantum-Classical VQC",
            framework="PennyLane / Quantum Statevector Simulator",
            model_version="1.0.0",
            prediction=None,
            features_used=[],
            circuit_telemetry=None,
            explainability=[],
            benchmark_comparison=benchmarks,
            clinical_disclaimer="AI-Assisted Assessment — Decision support only.",
            error=f"Hybrid QML circuit execution failed: {str(e)}",
            insufficient_data=False
        )


def get_demo_clinical_profiles() -> Dict[str, Any]:
    """
    Standard benchmark clinical profiles for testing and demonstration:
    - Profile A: Normal/Low Risk Patient
    - Profile B: High Risk Cardiovascular Patient
    - Profile C: Incomplete Report
    """
    return {
        "low_risk_patient": {
            "title": "Patient A — Normal / Low Risk Profile",
            "description": "32-year-old normotensive patient with healthy lipid levels and athletic heart rate.",
            "data": {
                "age": 32,
                "sex": 0,
                "trestbps": 115,
                "chol": 165,
                "thalach": 175,
                "oldpeak": 0.0,
                "cp": 3  # Asymptomatic
            }
        },
        "high_risk_patient": {
            "title": "Patient B — High Risk Cardiovascular Profile",
            "description": "64-year-old patient with stage 2 hypertension, hypercholesterolemia, and marked ST depression.",
            "data": {
                "age": 64,
                "sex": 1,
                "trestbps": 165,
                "chol": 290,
                "thalach": 118,
                "oldpeak": 2.8,
                "cp": 0  # Typical Angina
            }
        },
        "incomplete_record": {
            "title": "Patient C — Incomplete Medical Report",
            "description": "Laboratory report containing only height and blood group, lacking vital parameters.",
            "data": {
                "blood_group": "O+",
                "height": 172
            }
        }
    }
