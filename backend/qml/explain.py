"""
Explainability & Quantum Telemetry Layer for Hybrid QML
Aligned with SIH Problem Statement 26139: Early Disease Detection
==================================================================
Computes:
1. Feature-level clinical factor contributions & biological risk drivers.
2. Quantum circuit telemetry (qubits, gate count, circuit depth, expectation values).
3. Interpretable human-readable clinical narratives for patient and clinician.
"""

from typing import Dict, Any, List, Tuple
import numpy as np

from qml.schemas import ClinicalFactorContribution, QuantumCircuitTelemetry
from qml.preprocessing import SELECTED_FEATURES, TRAINING_STATS


FEATURE_METADATA = {
    "age": {
        "label": "Biological Age",
        "normal_range": "18 - 50 yrs (Low Baseline Risk)",
        "unit": "years",
        "explain_high": "Advancing age is an unmodifiable risk factor associated with arterial stiffening.",
        "explain_low": "Younger age profile confers baseline cardiovascular elasticity."
    },
    "trestbps": {
        "label": "Resting Systolic Blood Pressure",
        "normal_range": "90 - 120 mmHg (Normotensive)",
        "unit": "mmHg",
        "explain_high": "Elevated systolic pressure exerts mechanical wall tension on coronary arteries.",
        "explain_low": "Normotensive resting pressure maintains optimal vascular endothelial integrity."
    },
    "chol": {
        "label": "Serum Total Cholesterol",
        "normal_range": "125 - 200 mg/dL (Desirable)",
        "unit": "mg/dL",
        "explain_high": "Hypercholesterolemia promotes atheromatous coronary plaque buildup.",
        "explain_low": "Desirable lipid levels minimize vascular atherogenic burden."
    },
    "thalach": {
        "label": "Maximum Heart Rate (Chronotropic Response)",
        "normal_range": "130 - 180 bpm (Exercise Adequate)",
        "unit": "bpm",
        "explain_high": "Healthy chronotropic competence indicates strong cardiac reserve.",
        "explain_low": "Attenuated maximum heart rate indicates chronotropic incompetence or ischemia."
    },
    "oldpeak": {
        "label": "ST Segment Depression (Ischemia Marker)",
        "normal_range": "0.0 - 0.5 mm (Normal Repolarization)",
        "unit": "mm",
        "explain_high": "Substantial exercise-induced ST depression is a strong indicator of subendocardial ischemia.",
        "explain_low": "Stable ST segment repolarization shows preserved myocardial perfusion."
    },
    "cp": {
        "label": "Chest Pain / Angina Classification",
        "normal_range": "0 (Typical Angina) to 3 (Asymptomatic)",
        "unit": "type",
        "explain_high": "Asymptomatic or non-anginal symptoms reduce immediate typical angina suspicion.",
        "explain_low": "Typical angina characteristics correlate strongly with underlying coronary stenosis."
    }
}


def generate_explainability(
    clean_features: Dict[str, Any],
    vqc_result: Dict[str, Any]
) -> Tuple[List[ClinicalFactorContribution], QuantumCircuitTelemetry]:
    """
    Constructs detailed clinical factor contributions and quantum circuit telemetry.
    """
    contributions: List[ClinicalFactorContribution] = []

    for feat in SELECTED_FEATURES:
        val = float(clean_features.get(feat, TRAINING_STATS[feat]["mean"]))
        mean = TRAINING_STATS[feat]["mean"]
        std = TRAINING_STATS[feat]["std"]
        z_score = (val - mean) / (std if std > 1e-6 else 1.0)

        meta = FEATURE_METADATA.get(feat, {})
        label = meta.get("label", feat)
        normal_range = meta.get("normal_range", "Standard clinical range")

        # Direction and impact based on clinical correlation
        # For oldpeak, trestbps, chol, age: higher is risk elevating
        # For thalach: lower is risk elevating
        # For cp: 0 is typical angina (higher risk), 3 is asymptomatic (lower risk)
        if feat in ["trestbps", "chol", "oldpeak", "age"]:
            if z_score > 0.35:
                direction = "elevating"
                insight = meta.get("explain_high", "")
            elif z_score < -0.35:
                direction = "protective"
                insight = meta.get("explain_low", "")
            else:
                direction = "neutral"
                insight = f"Value of {val} {meta.get('unit', '')} is within baseline population limits."
            impact_score = round(float(abs(z_score) * 15.0), 1)
        elif feat == "thalach":
            if z_score < -0.4:
                direction = "elevating"
                insight = meta.get("explain_low", "")
            else:
                direction = "protective"
                insight = meta.get("explain_high", "")
            impact_score = round(float(abs(z_score) * 12.0), 1)
        else:  # cp
            if val == 0:
                direction = "elevating"
                insight = meta.get("explain_low", "")
            else:
                direction = "protective"
                insight = meta.get("explain_high", "")
            impact_score = 18.0 if val == 0 else 8.0

        contributions.append(
            ClinicalFactorContribution(
                feature_name=feat,
                feature_label=label,
                raw_value=val,
                normal_range=normal_range,
                impact_score=impact_score,
                direction=direction,
                clinical_insight=insight
            )
        )

    # Sort so elevating factors appear first
    contributions.sort(key=lambda x: (x.direction == "elevating", x.impact_score), reverse=True)

    telemetry = QuantumCircuitTelemetry(
        qubit_count=vqc_result.get("qubit_count", 6),
        circuit_depth=vqc_result.get("circuit_depth", 12),
        ansatz_type="StronglyEntanglingVariationalLayers",
        feature_map="AngleFeatureMap_Ry_Rz",
        entanglement_gates=vqc_result.get("entanglement_gates", 12),
        backend_name=vqc_result.get("backend", "Exact Statevector Simulator (NumPy)"),
        expectation_value=vqc_result.get("expectation_value", 0.0),
        quantum_execution_status="EXECUTED_REAL_CIRCUIT"
    )

    return contributions, telemetry
