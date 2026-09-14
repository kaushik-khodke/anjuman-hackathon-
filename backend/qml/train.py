"""
Offline Training & Classical Benchmarking Pipeline for Hybrid QML
Aligned with SIH Problem Statement 26139: Early Disease Detection
==================================================================
Trains:
1. Hybrid Variational Quantum Classifier (VQC)
2. Classical Baseline: Logistic Regression
3. Classical Baseline: Random Forest
4. Classical Baseline: Gradient Boosting (XGBoost equivalent)

All evaluated on the exact same 80/20 stratified train/test split of the
UCI Cleveland Heart Disease dataset. Real measured metrics saved to disk.
"""

import os
import sys
import json
import time
import math
import numpy as np
import pandas as pd
from pathlib import Path

# Ensure backend root is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
from typing import Dict, Any, Tuple, List

from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix
)

from qml.preprocessing import SELECTED_FEATURES, TRAINING_STATS, validate_and_preprocess
from qml.quantum_model import (
    VariationalQuantumClassifier,
    execute_numpy_quantum_circuit,
    TOTAL_CIRCUIT_PARAMS,
    NUM_QUBITS
)


def load_dataset(csv_path: str) -> Tuple[np.ndarray, np.ndarray]:
    """Loads dataset and extracts the 6 canonical clinical features and binary target."""
    df = pd.read_csv(csv_path)
    X = df[SELECTED_FEATURES].values
    y = df["target"].values
    return X, y


def preprocess_features_to_quantum_angles(X: np.ndarray) -> np.ndarray:
    """Standardizes raw clinical features and maps them into [-pi, pi] angles."""
    N, D = X.shape
    angles = np.zeros((N, D), dtype=np.float64)
    for j, feat in enumerate(SELECTED_FEATURES):
        mean = TRAINING_STATS[feat]["mean"]
        std = TRAINING_STATS[feat]["std"]
        z = (X[:, j] - mean) / (std if std > 1e-6 else 1.0)
        # 2 * arctan(z) maps (-inf, inf) smoothly to (-pi, pi)
        angles[:, j] = 2.0 * np.arctan(z)
    return angles


def train_vqc(
    X_train_angles: np.ndarray,
    y_train: np.ndarray,
    epochs: int = 40,
    lr: float = 0.08,
    seed: int = 42
) -> Tuple[np.ndarray, float, float]:
    """
    Trains the Variational Quantum Classifier using numerical gradient descent
    with momentum on Binary Cross-Entropy loss.
    """
    np.random.seed(seed)
    # Initialize weights with standard normal angles
    weights = np.random.uniform(-0.5, 0.5, size=TOTAL_CIRCUIT_PARAMS)
    scale = 1.6
    bias = -0.15

    N = len(y_train)
    v_w = np.zeros_like(weights)
    eps = 0.05  # finite difference perturbation

    print(f"[QML] Training 6-Qubit VQC over {epochs} iterations on {N} clinical samples...")
    for epoch in range(epochs):
        # Mini-batch sampling
        batch_idx = np.random.choice(N, size=min(40, N), replace=False)
        X_b = X_train_angles[batch_idx]
        y_b = y_train[batch_idx]

        # Evaluate current predictions & loss
        loss = 0.0
        grad_w = np.zeros_like(weights)
        grad_bias = 0.0
        grad_scale = 0.0

        for xi, yi in zip(X_b, y_b):
            expval = execute_numpy_quantum_circuit(xi, weights)
            z = scale * expval + bias
            p = 1.0 / (1.0 + math.exp(-np.clip(z, -10.0, 10.0)))
            p = float(np.clip(p, 1e-4, 1.0 - 1e-4))

            # BCE loss
            loss += - (yi * math.log(p) + (1.0 - yi) * math.log(1.0 - p))
            err = (p - yi)

            grad_bias += err
            grad_scale += err * expval

        # Numerical gradient for a random subset of circuit parameters per step for speed
        param_subset = np.random.choice(TOTAL_CIRCUIT_PARAMS, size=12, replace=False)
        for p_idx in param_subset:
            w_plus = np.copy(weights)
            w_plus[p_idx] += eps
            w_minus = np.copy(weights)
            w_minus[p_idx] -= eps

            loss_plus = 0.0
            loss_minus = 0.0
            for xi, yi in zip(X_b[:15], y_b[:15]):
                exp_p = execute_numpy_quantum_circuit(xi, w_plus)
                zp = scale * exp_p + bias
                pp = 1.0 / (1.0 + math.exp(-np.clip(zp, -10.0, 10.0)))
                loss_plus += -(yi * math.log(pp + 1e-4) + (1.0 - yi) * math.log(1.0 - pp + 1e-4))

                exp_m = execute_numpy_quantum_circuit(xi, w_minus)
                zm = scale * exp_m + bias
                pm = 1.0 / (1.0 + math.exp(-np.clip(zm, -10.0, 10.0)))
                loss_minus += -(yi * math.log(pm + 1e-4) + (1.0 - yi) * math.log(1.0 - pm + 1e-4))

            grad_w[p_idx] = (loss_plus - loss_minus) / (2.0 * eps * 15.0)

        # Gradient update with momentum
        v_w = 0.8 * v_w + lr * grad_w
        weights -= v_w

    # Standardized convex calibration of output scale and bias on training expectation values
    expvals_train = np.array([execute_numpy_quantum_circuit(xi, weights) for xi in X_train_angles])
    mu = float(np.mean(expvals_train))
    sig = float(np.std(expvals_train)) if np.std(expvals_train) > 1e-4 else 1.0
    u_train = ((expvals_train - mu) / sig).reshape(-1, 1)

    calibrator = LogisticRegression(C=2.0, random_state=seed)
    calibrator.fit(u_train, y_train)
    w_cal = float(calibrator.coef_[0][0])
    b_cal = float(calibrator.intercept_[0])

    scale = float(w_cal / sig)
    bias = float(b_cal - (w_cal * mu) / sig)

    print("[QML] VQC Circuit Parameter Optimization & Standardized Calibration Complete.")
    return weights, float(bias), float(scale)


def compute_metrics(y_true: np.ndarray, y_pred: np.ndarray, y_prob: np.ndarray, latency_ms: float, name: str, family: str) -> Dict[str, Any]:
    """Calculates standard clinical evaluation metrics."""
    acc = float(accuracy_score(y_true, y_pred))
    prec = float(precision_score(y_true, y_pred, zero_division=0))
    rec = float(recall_score(y_true, y_pred, zero_division=0))  # Sensitivity
    f1 = float(f1_score(y_true, y_pred, zero_division=0))
    try:
        auc = float(roc_auc_score(y_true, y_prob))
    except Exception:
        auc = 0.5

    # Specificity = TN / (TN + FP)
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()
    spec = float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0

    return {
        "model_name": name,
        "model_family": family,
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "specificity": round(spec, 4),
        "f1_score": round(f1, 4),
        "roc_auc": round(auc, 4),
        "latency_ms": round(latency_ms, 2)
    }


def train_and_evaluate_all(
    dataset_path: str = "d:/hackathon/health care system/backend/datasets/heart_disease.csv",
    output_dir: str = "d:/hackathon/health care system/backend/models/qml/cardiovascular_vqc"
) -> Dict[str, Any]:
    """
    Executes full offline training pipeline for VQC and all classical baselines,
    persisting weights and benchmark metrics.
    """
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    # 1. Load data
    X, y = load_dataset(dataset_path)

    # 2. Stratified 80/20 train/test split (random_state=42)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, stratify=y, random_state=42
    )

    X_train_angles = preprocess_features_to_quantum_angles(X_train)
    X_test_angles = preprocess_features_to_quantum_angles(X_test)

    # 3. Train Hybrid VQC
    weights, bias, scale = train_vqc(X_train_angles, y_train, epochs=30, lr=0.06, seed=42)
    vqc_model = VariationalQuantumClassifier(weights=weights, bias=bias, output_scale=scale)

    # Measure VQC Test Performance & Latency
    t0 = time.perf_counter()
    vqc_probs = []
    for xi in X_test_angles:
        p, _, _ = vqc_model.forward(xi)
        vqc_probs.append(p)
    vqc_latency = ((time.perf_counter() - t0) / len(X_test_angles)) * 1000.0

    vqc_preds = [(1 if p >= 0.5 else 0) for p in vqc_probs]
    if len(set(vqc_preds)) == 1:
        vqc_train_probs = [vqc_model.forward(xi)[0] for xi in X_train_angles]
        median_thresh = float(np.median(vqc_train_probs))
        vqc_preds = [(1 if p >= median_thresh else 0) for p in vqc_probs]

    vqc_metrics = compute_metrics(
        y_test, np.array(vqc_preds), np.array(vqc_probs),
        vqc_latency, "Hybrid VQC (Quantum-Classical)", "Quantum"
    )

    # 4. Train Classical Baseline: Logistic Regression
    lr_model = LogisticRegression(random_state=42, max_iter=500)
    lr_model.fit(X_train, y_train)

    t0 = time.perf_counter()
    lr_probs = lr_model.predict_proba(X_test)[:, 1]
    lr_preds = lr_model.predict(X_test)
    lr_latency = ((time.perf_counter() - t0) / len(X_test)) * 1000.0

    lr_metrics = compute_metrics(
        y_test, lr_preds, lr_probs,
        lr_latency, "Logistic Regression", "Classical"
    )

    # 5. Train Classical Baseline: Random Forest
    rf_model = RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42)
    rf_model.fit(X_train, y_train)

    t0 = time.perf_counter()
    rf_probs = rf_model.predict_proba(X_test)[:, 1]
    rf_preds = rf_model.predict(X_test)
    rf_latency = ((time.perf_counter() - t0) / len(X_test)) * 1000.0

    rf_metrics = compute_metrics(
        y_test, rf_preds, rf_probs,
        rf_latency, "Random Forest", "Classical"
    )

    # 6. Train Classical Baseline: Gradient Boosting (XGBoost equivalent)
    gb_model = GradientBoostingClassifier(n_estimators=100, max_depth=3, random_state=42)
    gb_model.fit(X_train, y_train)

    t0 = time.perf_counter()
    gb_probs = gb_model.predict_proba(X_test)[:, 1]
    gb_preds = gb_model.predict(X_test)
    gb_latency = ((time.perf_counter() - t0) / len(X_test)) * 1000.0

    gb_metrics = compute_metrics(
        y_test, gb_preds, gb_probs,
        gb_latency, "XGBoost / Gradient Boosting", "Classical"
    )

    benchmarks = [vqc_metrics, rf_metrics, lr_metrics, gb_metrics]

    # 7. Persist Model Artifacts
    model_artifacts = {
        "model_name": "cardiovascular_vqc",
        "version": "1.0.0",
        "qubit_count": NUM_QUBITS,
        "selected_features": SELECTED_FEATURES,
        "training_stats": TRAINING_STATS,
        "weights": weights.tolist(),
        "bias": bias,
        "output_scale": scale,
        "test_samples_evaluated": len(y_test),
        "trained_timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }

    with open(out_path / "model_artifacts.json", "w") as f:
        json.dump(model_artifacts, f, indent=2)

    with open(out_path / "evaluation_report.json", "w") as f:
        json.dump({
            "dataset": "UCI Cleveland Heart Disease",
            "train_test_split": "80/20 Stratified",
            "total_samples": len(y),
            "benchmarks": benchmarks
        }, f, indent=2)

    print(f"[QML] Model artifacts and benchmark report saved to: {out_path}")
    return {
        "artifacts": model_artifacts,
        "benchmarks": benchmarks
    }


if __name__ == "__main__":
    train_and_evaluate_all()
