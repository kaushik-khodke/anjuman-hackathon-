"""
Unit & Integration Tests for XGBoost Clinical Triage Engine
"""
import pytest
from ml_triage import predict_priority, train_triage_model


def test_triage_model_training():
    """Ensure triage model trains or loads correctly."""
    result = train_triage_model(force_retrain=False)
    assert result is True


def test_predict_priority_critical_red():
    """Verify severe vitals trigger RED priority."""
    label, score = predict_priority(
        chief_complaint="Severe cardiac arrest",
        heart_rate=165,
        systolic_bp=75,
        diastolic_bp=45,
        spo2=88,
        temp_celsius=38.5,
    )
    assert label == "RED"
    assert score >= 50


def test_predict_priority_normal_blue():
    """Verify normal vitals trigger GREEN or BLUE priority."""
    label, score = predict_priority(
        chief_complaint="Routine prescription renewal",
        heart_rate=72,
        systolic_bp=120,
        diastolic_bp=80,
        spo2=98,
        temp_celsius=36.8,
    )
    assert label in ("BLUE", "GREEN")
    assert 0 <= score <= 100


def test_chief_complaint_override():
    """Verify severe keywords override to RED even with borderline vitals."""
    label, score = predict_priority(
        chief_complaint="Patient is unconscious with acute chest pain",
        heart_rate=80,
        systolic_bp=120,
        diastolic_bp=80,
        spo2=96,
        temp_celsius=37.0,
    )
    assert label == "RED"
    assert score >= 90


def test_invalid_vital_range_handling():
    """Verify extreme/invalid out-of-bound inputs do not crash the model."""
    label, score = predict_priority(
        chief_complaint="Fever",
        heart_rate=999,  # Extreme value
        systolic_bp=-50,
        spo2=150,
        temp_celsius=10.0,
    )
    assert label in ("RED", "ORANGE", "YELLOW", "GREEN", "BLUE")
    assert isinstance(score, int)
