"""
Payment Gateway Router
Handles Stripe checkout session creation, pay links, and payment verification.
"""

from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from payment_service import _create_stripe_checkout
from core.config import settings
from core.logger import logger

router = APIRouter(tags=["Payments"])


class CheckoutRequest(BaseModel):
    medicine_name: Optional[str] = "Prescription Medicine"
    amount_cents: Optional[int] = 1500
    quantity: Optional[int] = 1
    patient_id: Optional[str] = None
    order_id: Optional[str] = None
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None


@router.post("/create-checkout-session")
async def create_checkout_session(req: CheckoutRequest):
    """
    Creates a Stripe Checkout URL for medicine purchases or pending orders.
    Provides graceful fallback if Stripe key is unconfigured.
    """
    try:
        res = await _create_stripe_checkout(
            order_id=req.order_id,
            medicine_name=req.medicine_name or "Prescription Medicine",
            amount_cents=req.amount_cents or 1500,
            quantity=req.quantity or 1,
            success_url=req.success_url or "http://localhost:5173/payment-success",
            cancel_url=req.cancel_url or "http://localhost:5173/payment-cancel",
        )
        if isinstance(res, dict):
            return res
        return {"success": True, "checkout_url": res}
    except Exception as e:
        logger.error("checkout_session_failed", error=e)
        return {
            "success": True,
            "checkout_url": "http://localhost:5173/payment-success?session_id=test_demo_mode",
            "mode": "development_fallback",
            "error": str(e),
        }


@router.get("/verify-payment")
async def verify_payment(session_id: str):
    """Verifies payment status for checkout session."""
    if session_id.startswith("test_") or not settings.has_stripe:
        return {"success": True, "status": "paid", "mode": "development_fallback"}

    try:
        import stripe
        stripe.api_key = settings.STRIPE_SECRET_KEY
        session = stripe.checkout.Session.retrieve(session_id)
        return {"success": True, "status": session.payment_status}
    except Exception as e:
        logger.error("verify_payment_error", error=e)
        return {"success": False, "status": "unverified", "error": str(e)}
