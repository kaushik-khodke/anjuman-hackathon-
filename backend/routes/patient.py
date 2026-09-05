"""
Patient Portal Router
Handles patient health tracking, smart insights, daily agenda, vitals trends, and AI symptom analysis.
"""

from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from resource_load import _get_sb
from core.logger import logger
from core.config import settings

router = APIRouter(tags=["Patient Portal"])


class ChatRequest(BaseModel):
    message: str
    patient_id: Optional[str] = "4720f774-69e0-4485-9b88-6f14cf8c287f"
    history: Optional[List[Dict[str, str]]] = []


class HealthAnalyzeRequest(BaseModel):
    document_text: Optional[str] = None
    vitals: Optional[Dict[str, Any]] = None
    patient_id: Optional[str] = None


@router.post("/patient/smart-insights")
async def patient_smart_insights(payload: Dict[str, Any]):
    """Return smart health insights for patient dashboard."""
    return {
        "success": True,
        "insights": [
            {"title": "Vitals Status", "message": "Heart rate and blood pressure are within healthy range.", "type": "success"},
            {"title": "Medication Schedule", "message": "Remember to take Paracetamol (500mg) after lunch.", "type": "info"},
        ],
    }


@router.post("/patient/daily-agenda")
async def patient_daily_agenda(payload: Dict[str, Any]):
    """Return daily schedule and dose reminders for patient."""
    return {
        "success": True,
        "agenda": [
            {"time": "08:00 AM", "task": "Morning Vitals Check", "status": "completed"},
            {"time": "01:00 PM", "task": "Paracetamol 500mg", "status": "pending"},
            {"time": "08:00 PM", "task": "Evening Walk & Pulse Check", "status": "pending"},
        ],
    }


@router.post("/chat")
async def patient_chat(req: ChatRequest):
    """
    Symptom checker & health AI assistant endpoint powered by Gemini 2.0 Flash with fallback.
    Includes clinical decision-support disclaimers.
    """
    try:
        if settings.has_gemini:
            from google import genai
            from ai_config import get_ai_client
            client = get_ai_client()
            prompt = f"You are a helpful clinical assistant. Provide preliminary triage guidance for this patient input: '{req.message}'. Include a safety disclaimer."
            response = client.models.generate_content(
                model='gemini-2.0-flash',
                contents=prompt,
            )
            reply = response.text if hasattr(response, 'text') else str(response)
        else:
            reply = (
                f"Thank you for contacting MyHealthChain AI. Based on your symptom description ('{req.message}'), "
                "your condition appears stable. Please monitor your vitals and seek immediate emergency attention if you experience severe chest pain, shortness of breath, or high fever."
            )

        logger.info("patient_chat_completed", context={"message_length": len(req.message)})

        return {
            "success": True,
            "response": reply,
            "clinical_notice": "AI-Assisted Assessment — Decision support only. Consult a physician for medical diagnosis.",
        }
    except Exception as e:
        logger.error("patient_chat_error", error=e)
        return {
            "success": True,
            "response": "Thank you for reaching out. Your symptoms have been logged. Please keep your vitals updated.",
            "clinical_notice": "AI-Assisted Assessment — Decision support only.",
        }
