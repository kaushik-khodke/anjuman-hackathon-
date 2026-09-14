"""
Variational Quantum Classifier (VQC) Engine
Aligned with SIH Problem Statement 26139: Early Disease Detection
==================================================================
Implements a 6-Qubit Parameterized Quantum Circuit:
- Feature Encoding Layer: Angle Embedding (Ry, Rz)
- Variational Layers: Strongly Entangling Rotations (Rx, Ry, Rz) + Circular CNOTs
- Measurement: Expectation value of Pauli-Z observable
- Classical Layer: Sigmoid calibration for disease probability

Supports PennyLane `default.qubit` simulator with built-in exact NumPy
quantum statevector engine for zero-dependency local execution.
"""

import math
import numpy as np
from typing import Dict, Any, Tuple, Optional

# Try importing PennyLane
try:
    import pennylane as qml
    PENNYLANE_AVAILABLE = True
except Exception:
    qml = None
    PENNYLANE_AVAILABLE = False


NUM_QUBITS = 6
NUM_LAYERS = 2
NUM_PARAMS_PER_LAYER = NUM_QUBITS * 3  # 18 rotation parameters per layer
TOTAL_CIRCUIT_PARAMS = NUM_LAYERS * NUM_PARAMS_PER_LAYER  # 36 variational angles


# ─────────────────────────────────────────────────────────────────────────────
# 1. Exact Mathematical Quantum Statevector Simulator (Pure NumPy)
# ─────────────────────────────────────────────────────────────────────────────
def _rotation_y(theta: float) -> np.ndarray:
    half = theta / 2.0
    c = math.cos(half)
    s = math.sin(half)
    return np.array([[c, -s], [s, c]], dtype=np.complex128)

def _rotation_z(theta: float) -> np.ndarray:
    half = theta / 2.0
    return np.array([[np.exp(-1j * half), 0], [0, np.exp(1j * half)]], dtype=np.complex128)

def _rotation_x(theta: float) -> np.ndarray:
    half = theta / 2.0
    c = math.cos(half)
    s = -1j * math.sin(half)
    return np.array([[c, s], [s, c]], dtype=np.complex128)

def _apply_single_qubit_gate(state: np.ndarray, gate: np.ndarray, target_qubit: int, num_qubits: int = 6) -> np.ndarray:
    """Applies a 2x2 unitary gate to target_qubit in an N-qubit statevector."""
    dim = 1 << num_qubits
    reshaped = state.reshape([2] * num_qubits)
    # Move target axis to 0, contract with gate, move back
    reshaped = np.tensordot(gate, reshaped, axes=([1], [target_qubit]))
    reshaped = np.moveaxis(reshaped, 0, target_qubit)
    return reshaped.reshape((dim,))

def _apply_cnot_gate(state: np.ndarray, control: int, target: int, num_qubits: int = 6) -> np.ndarray:
    """Applies a CNOT gate between control and target qubit in an N-qubit statevector."""
    reshaped = state.reshape([2] * num_qubits)
    # Swap elements where control is 1
    slices_0 = [slice(None)] * num_qubits
    slices_1 = [slice(None)] * num_qubits
    slices_0[control] = 1
    slices_0[target] = 0
    slices_1[control] = 1
    slices_1[target] = 1

    temp = np.copy(reshaped[tuple(slices_0)])
    reshaped[tuple(slices_0)] = reshaped[tuple(slices_1)]
    reshaped[tuple(slices_1)] = temp
    return reshaped.reshape((1 << num_qubits,))

def execute_numpy_quantum_circuit(features: np.ndarray, weights: np.ndarray) -> float:
    """
    Simulates the 6-qubit parameterized quantum circuit using exact statevector algebra.
    Initial state: |000000>
    Returns <Z_0> expectation value in [-1.0, 1.0].
    """
    dim = 1 << NUM_QUBITS
    state = np.zeros(dim, dtype=np.complex128)
    state[0] = 1.0  # |000000>

    # 1. Feature Map: Angle Encoding (Ry followed by Rz)
    for q in range(NUM_QUBITS):
        phi = float(features[q])
        state = _apply_single_qubit_gate(state, _rotation_y(phi), q, NUM_QUBITS)
        state = _apply_single_qubit_gate(state, _rotation_z(phi / 2.0), q, NUM_QUBITS)

    # 2. Variational Layers
    param_idx = 0
    for l in range(NUM_LAYERS):
        # Single-qubit rotations (Rx, Ry, Rz)
        for q in range(NUM_QUBITS):
            rx_val = float(weights[param_idx])
            ry_val = float(weights[param_idx + 1])
            rz_val = float(weights[param_idx + 2])
            param_idx += 3

            state = _apply_single_qubit_gate(state, _rotation_x(rx_val), q, NUM_QUBITS)
            state = _apply_single_qubit_gate(state, _rotation_y(ry_val), q, NUM_QUBITS)
            state = _apply_single_qubit_gate(state, _rotation_z(rz_val), q, NUM_QUBITS)

        # Circular Entanglement via CNOTs
        for q in range(NUM_QUBITS):
            state = _apply_cnot_gate(state, q, (q + 1) % NUM_QUBITS, NUM_QUBITS)

    # 3. Measurement: Pauli-Z expectation on qubit 0 & 1
    # <Z_0> = P(q0=0) - P(q0=1)
    probs = np.abs(state) ** 2
    reshaped_probs = probs.reshape([2] * NUM_QUBITS)
    
    # Sum over all states where qubit 0 is 0 vs 1
    p_z0_0 = float(np.sum(reshaped_probs[0, ...]))
    p_z0_1 = float(np.sum(reshaped_probs[1, ...]))
    expval_z0 = p_z0_0 - p_z0_1

    # Also calculate expectation on qubit 1 for enhanced parity representation
    p_z1_0 = float(np.sum(reshaped_probs[:, 0, ...]))
    p_z1_1 = float(np.sum(reshaped_probs[:, 1, ...]))
    expval_z1 = p_z1_0 - p_z1_1

    # Blended observable
    return 0.7 * expval_z0 + 0.3 * expval_z1


# ─────────────────────────────────────────────────────────────────────────────
# 2. PennyLane Quantum Circuit (when PennyLane is installed)
# ─────────────────────────────────────────────────────────────────────────────
if PENNYLANE_AVAILABLE:
    try:
        dev = qml.device("default.qubit", wires=NUM_QUBITS)

        @qml.qnode(dev, interface="autograd", diff_method="parameter-shift")
        def _pennylane_vqc_circuit(features, weights):
            # Feature Map
            for i in range(NUM_QUBITS):
                qml.RY(features[i], wires=i)
                qml.RZ(features[i] / 2.0, wires=i)

            # Variational Layers
            reshaped_weights = weights.reshape((NUM_LAYERS, NUM_QUBITS, 3))
            for l in range(NUM_LAYERS):
                for i in range(NUM_QUBITS):
                    qml.RX(reshaped_weights[l, i, 0], wires=i)
                    qml.RY(reshaped_weights[l, i, 1], wires=i)
                    qml.RZ(reshaped_weights[l, i, 2], wires=i)

                # CNOT Entanglement
                for i in range(NUM_QUBITS):
                    qml.CNOT(wires=[i, (i + 1) % NUM_QUBITS])

            return qml.expval(qml.PauliZ(0))
    except Exception:
        _pennylane_vqc_circuit = None
else:
    _pennylane_vqc_circuit = None


# ─────────────────────────────────────────────────────────────────────────────
# 3. Hybrid Quantum-Classical Classifier Wrapper
# ─────────────────────────────────────────────────────────────────────────────
class VariationalQuantumClassifier:
    """
    Hybrid Quantum-Classical Classifier combining a 6-qubit VQC with
    classical output weight calibration.
    """
    def __init__(self, weights: Optional[np.ndarray] = None, bias: float = 0.0, output_scale: float = 1.0):
        if weights is not None:
            self.weights = np.array(weights, dtype=np.float64)
        else:
            # Initialize with small random angles
            np.random.seed(42)
            self.weights = np.random.uniform(-np.pi, np.pi, size=TOTAL_CIRCUIT_PARAMS)

        self.bias = float(bias)
        self.output_scale = float(output_scale)
        self.qubit_count = NUM_QUBITS
        self.circuit_depth = NUM_LAYERS * 6
        self.entanglement_gates = NUM_LAYERS * NUM_QUBITS

    def forward(self, features: np.ndarray) -> Tuple[float, float, str]:
        """
        Executes the quantum circuit and applies classical sigmoid calibration.
        
        Returns:
            (probability, expectation_value, backend_used)
        """
        if PENNYLANE_AVAILABLE and _pennylane_vqc_circuit is not None:
            try:
                expval = float(_pennylane_vqc_circuit(features, self.weights))
                backend = "PennyLane.default.qubit"
            except Exception:
                expval = execute_numpy_quantum_circuit(features, self.weights)
                backend = "Exact Statevector Simulator (NumPy)"
        else:
            expval = execute_numpy_quantum_circuit(features, self.weights)
            backend = "Exact Statevector Simulator (NumPy)"

        # Classical calibration: z = scale * <Z> + bias
        # Mapping <Z> in [-1, 1] to disease probability via sigmoid
        z = self.output_scale * expval + self.bias
        probability = 1.0 / (1.0 + math.exp(-z))
        # Ensure numerical safety
        probability = float(np.clip(probability, 0.01, 0.99))

        return probability, expval, backend

    def predict(self, features: np.ndarray, threshold: float = 0.50) -> Dict[str, Any]:
        """
        Predicts disease class, calibrated probability, and risk tier.
        """
        prob, expval, backend = self.forward(features)
        predicted_class = 1 if prob >= threshold else 0

        if prob >= 0.70:
            risk_level = "HIGH"
        elif prob >= 0.40:
            risk_level = "MODERATE"
        else:
            risk_level = "LOW"

        confidence = float(abs(prob - 0.5) * 2.0)  # [0.0 - 1.0]

        return {
            "class_label": predicted_class,
            "probability": round(prob, 4),
            "risk_level": risk_level,
            "confidence": round(confidence, 4),
            "expectation_value": round(expval, 4),
            "backend": backend,
            "qubit_count": self.qubit_count,
            "circuit_depth": self.circuit_depth,
            "entanglement_gates": self.entanglement_gates
        }
