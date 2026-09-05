"""
Doctor Portal Router
Handles doctor dashboard data, patient consent views, and prescription verifications.
"""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from resource_load import _get_sb
from core.logger import logger

router = APIRouter(tags=["Doctor Portal"])


@router.get("/doctor/dashboard-data")
async def doctor_dashboard_data(user_id: str):
    """
    Fetch doctor profile, active patient consents, and patient lists for Doctor Portal.
    Provides graceful fallback if Supabase is unconfigured.
    """
    try:
        sb = _get_sb()
        if not sb:
            return {
                "success": True,
                "doctor": {"id": user_id, "name": "Dr. Sarah Jenkins", "specialization": "Emergency Medicine", "ward_assigned": "ER Bay 1"},
                "consents": [],
                "patients": [],
                "note": "Development fallback mode — Supabase unconfigured",
            }

        # 1. Fetch doctor profile by auth user_id or PK id
        doc_res = sb.table("doctors").select("id,user_id,name,license_id,specialization,verified,shift_type,ward_assigned").eq("user_id", user_id).maybe_single().execute()
        if not doc_res or not doc_res.data:
            doc_res = sb.table("doctors").select("id,user_id,name,license_id,specialization,verified,shift_type,ward_assigned").eq("id", user_id).maybe_single().execute()

        doc_data = doc_res.data if doc_res and doc_res.data else {}

        # Consult profiles table if doctor name is missing
        profile_res = sb.table("profiles").select("full_name").eq("id", user_id).maybe_single().execute()
        if profile_res and profile_res.data:
            doc_data["name"] = doc_data.get("name") or profile_res.data.get("full_name") or "Dr. Clinician"

        if not doc_data:
            doc_data = {"id": user_id, "name": "Dr. Medical Officer", "specialization": "Emergency Care", "verified": True}

        doctor_id = doc_data.get("id") or user_id

        # 2. Fetch consents for this doctor
        consents_res = sb.table("consent_requests").select("id,patient_id,doctor_id,status,expires_at,created_at").eq("doctor_id", doctor_id).order("created_at", desc=True).execute()
        consents = consents_res.data or []

        patient_ids = list(set([c["patient_id"] for c in consents if isinstance(c, dict) and c.get("patient_id")]))
        patients = []
        if patient_ids:
            pats_res = sb.table("patients").select("id,uhid,full_name").in_("id", patient_ids).execute()
            patients = pats_res.data or []

        return {
            "success": True,
            "doctor": doc_data,
            "consents": consents,
            "patients": patients,
        }
    except Exception as e:
        logger.error("doctor_dashboard_error", error=e)
        return {
            "success": False,
            "error": str(e),
            "doctor": {"id": user_id, "name": "Dr. Medical Officer", "specialization": "Emergency Medicine"},
            "consents": [],
            "patients": [],
        }
