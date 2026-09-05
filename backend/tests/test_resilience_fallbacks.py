"""
Resilience & Fallback Degradation Integration Tests
Ensures system components fail gracefully without crashing when external APIs or DB keys are unconfigured.
"""
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health_endpoint():
    """Verify /health returns structured status and diagnostics."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "database" in data
    assert "ml_models" in data
    assert "integrations" in data


def test_readiness_endpoint():
    """Verify /ready probe returns ready boolean."""
    response = client.get("/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["ready"] is True


def test_predict_triage_api():
    """Verify POST /predict-triage returns valid ESI classification and clinical disclaimer."""
    payload = {
        "chief_complaint": "Acute shortness of breath and chest pressure",
        "systolic_bp": 150,
        "diastolic_bp": 95,
        "heart_rate": 110,
        "spo2": 92,
        "temp_celsius": 37.8,
    }
    response = client.post("/predict-triage", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["priority"] in ("RED", "ORANGE", "YELLOW", "GREEN", "BLUE")
    assert "clinical_notice" in data


def test_checkout_session_fallback():
    """Verify Stripe checkout session falls back gracefully when secret key is unconfigured."""
    payload = {
        "medicine_name": "Amoxicillin 500mg",
        "quantity": 2,
        "amount_cents": 2000,
    }
    response = client.post("/create-checkout-session", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "checkout_url" in data


def test_patient_chat_fallback():
    """Verify patient chat returns response and safety notice."""
    payload = {
        "message": "I have a mild headache and low fever.",
        "patient_id": "test_pt_123",
    }
    response = client.post("/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "response" in data
    assert "clinical_notice" in data
