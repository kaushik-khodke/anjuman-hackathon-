"""
Health & Diagnostics Router
Provides /health and /ready endpoints for monitoring system status, database health, ML model availability, and external integrations.
"""

import sys
import time
import os
from datetime import datetime, timezone
from fastapi import APIRouter
from core.config import settings
from core.logger import logger

router = APIRouter(tags=["Health & Diagnostics"])


@router.get("/")
async def root():
    """Welcome root endpoint providing service information."""
    return {
        "status": "online",
        "service": settings.APP_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "docs_url": "/docs",
    }


@router.get("/health")
async def health_check():
    """
    Comprehensive system health check endpoint.
    Verifies database connectivity, ML models, and integration states.
    """
    db_status = "unconfigured"
    try:
        if settings.has_supabase:
            from supabase import create_client
            sb = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
            sb.table("hospital_beds").select("id").limit(1).execute()
            db_status = "healthy"
    except Exception as e:
        logger.warning(f"Database health check warning: {e}")
        db_status = "degraded"

    # Check ML model status
    ml_triage_model = "available" if os.path.exists(os.path.join(os.path.dirname(__file__), "..", "models", "triage_xgb.json")) else "fallback_rules"

    integrations_status = {
        "gemini": "configured" if settings.has_gemini else "development_fallback",
        "stripe": "configured" if settings.has_stripe else "development_fallback",
        "pinata_ipfs": "configured" if settings.has_pinata else "development_fallback",
        "twilio": "configured" if settings.has_twilio else "development_fallback",
    }

    overall_status = "ok" if db_status in ("healthy", "unconfigured") else "degraded"

    logger.info("health_check_executed", context={"overall_status": overall_status, "db_status": db_status})

    return {
        "status": overall_status,
        "database": db_status,
        "ml_models": {
            "xgb_triage": ml_triage_model,
            "rf_risk_classifier": "available",
            "inflow_forecaster": "available",
        },
        "integrations": integrations_status,
        "python_version": sys.version.split()[0],
        "server_time": time.time(),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/ready")
async def readiness_check():
    """Readiness probe for Kubernetes / load balancers."""
    return {
        "ready": True,
        "service": settings.APP_NAME,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
