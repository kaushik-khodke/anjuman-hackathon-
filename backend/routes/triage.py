"""
Clinical Triage & ML Prediction Router
Evaluates incoming vitals and chief complaints using XGBoost ML classifier.
Enforces decision-support boundaries and human-in-the-loop clinical overrides.
"""

from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from ml_triage import predict_priority
from core.logger import logger

router = APIRouter(tags=["Clinical Triage & ML"])


class TriageRequest(BaseModel):
    chief_complaint: str = Field(..., description="Primary patient symptom or reason for visit")
    age: Optional[int] = Field(default=35, ge=0, le=120)
    systolic_bp: Optional[float] = Field(default=120.0, ge=40, le=260)
    diastolic_bp: Optional[float] = Field(default=80.0, ge=20, le=160)
    heart_rate: Optional[float] = Field(default=72.0, ge=20, le=250)
    spo2: Optional[float] = Field(default=98.0, ge=50, le=100)
    temp_celsius: Optional[float] = Field(default=37.0, ge=30, le=45)


@router.post("/predict-triage")
async def analyze_triage(req: TriageRequest):
    """
    Evaluates patient vital signs and chief complaint using the XGBoost ESI ML classifier.
    Returns ESI Emergency Severity Index priority level (RED/ORANGE/YELLOW/GREEN/BLUE) and urgency score.
    Includes explicit clinical decision-support disclaimers.
    """
    try:
        priority_label, score = predict_priority(
            chief_complaint=req.chief_complaint,
            age=req.age or 35,
            systolic_bp=req.systolic_bp or 120.0,
            diastolic_bp=req.diastolic_bp or 80.0,
            heart_rate=req.heart_rate or 72.0,
            spo2=req.spo2 or 98.0,
            temp_celsius=req.temp_celsius or 37.0,
        )

        logger.info("triage_prediction_generated", context={"priority": priority_label, "urgency_score": score})

        return {
            "success": True,
            "priority": priority_label,
            "urgency_score": score,
            "clinical_notice": "AI-Assisted Assessment — Requires clinician confirmation",
            "metrics_evaluated": {
                "chief_complaint": req.chief_complaint,
                "vitals": {
                    "bp": f"{int(req.systolic_bp or 120)}/{int(req.diastolic_bp or 80)}",
                    "heart_rate": req.heart_rate,
                    "spo2": req.spo2,
                    "temp_celsius": req.temp_celsius,
                },
            },
        }
    except Exception as e:
        logger.error("triage_prediction_failed", error=e)
        return {
            "success": False,
            "priority": "YELLOW",
            "urgency_score": 50,
            "clinical_notice": "Fallback ESI level assigned due to processing error — Requires urgent clinician review",
            "error": str(e),
        }
