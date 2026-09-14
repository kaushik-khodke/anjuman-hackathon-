"""
Pharmacy & Order Management Router
"""

import re
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from agents.pharmacy_agent import PharmacyAgent
from resource_load import _get_sb

logger = logging.getLogger("stelix")
router = APIRouter(tags=["Pharmacy & Orders"])

# Singleton pharmacy agent
_pharmacy_agent: Optional[PharmacyAgent] = None

def get_pharmacy_agent() -> PharmacyAgent:
    global _pharmacy_agent
    if _pharmacy_agent is None:
        _pharmacy_agent = PharmacyAgent()
    return _pharmacy_agent


class PharmacyChatRequest(BaseModel):
    message: str
    patient_id: str
    language: Optional[str] = "en"


class VoicePlaceOrderRequest(BaseModel):
    medicine_name: str = Field(..., description="Name of medicine")
    quantity: Any = Field(default=1, description="Quantity as number or word")
    patient_id: Optional[str] = None
    patient_phone: Optional[str] = None
    body: Optional[Dict[str, Any]] = None


def parse_quantity_word(qty_raw: Any) -> int:
    """Helper to convert quantity strings ('four', '4 pills') into integer."""
    if isinstance(qty_raw, int):
        return max(1, qty_raw)
    if isinstance(qty_raw, float):
        return max(1, int(qty_raw))
    
    val_str = str(qty_raw).strip().lower()
    
    # 1. Check digit match
    match = re.search(r'\d+', val_str)
    if match:
        return max(1, int(match.group()))

    # 2. Check word match
    word_map = {
        "one": 1, "a": 1, "single": 1,
        "two": 2, "double": 2, "couple": 2,
        "three": 3, "triple": 3,
        "four": 4, "five": 5, "six": 6,
        "seven": 7, "eight": 8, "nine": 9, "ten": 10
    }
    for word, count in word_map.items():
        if re.search(r'\b' + word + r'\b', val_str):
            return count
            
    return 1


def _resolve_patient_id(raw_patient_id: Optional[str]) -> str:
    sb = _get_sb()
    if not sb:
        return "4720f774-69e0-4485-9b88-6f14cf8c287f"
    
    if raw_patient_id and str(raw_patient_id).strip() and str(raw_patient_id).lower() not in ["none", "null", "undefined", "unknown"]:
        id_str = str(raw_patient_id).strip()
        # 1. Try matching patient id
        try:
            p1 = sb.table("patients").select("id").eq("id", id_str).maybe_single().execute()
            if p1 and p1.data:
                return p1.data["id"]
        except Exception:
            pass
            
        # 2. Try matching user_id
        try:
            p2 = sb.table("patients").select("id").eq("user_id", id_str).maybe_single().execute()
            if p2 and p2.data:
                return p2.data["id"]
        except Exception:
            pass
            
        # 3. Try matching phone
        try:
            clean_phone = id_str.replace(" ", "").replace("-", "").replace("+", "")
            p3 = sb.table("patients").select("id").or_(f"phone.ilike.%{clean_phone}%,phone.eq.{clean_phone}").limit(1).execute()
            if p3 and p3.data:
                return p3.data[0]["id"]
        except Exception:
            pass

    # 4. Fallback to primary active patient record (Kaushik)
    try:
        p_kaushik = sb.table("patients").select("id").or_("user_id.eq.0c15d9e8-479c-42db-9c27-16c6d5b284a2,full_name.ilike.%kaushik%").limit(1).execute()
        if p_kaushik and p_kaushik.data:
            return p_kaushik.data[0]["id"]
    except Exception:
        pass

    # 5. Fallback to latest patient in DB
    try:
        p_last = sb.table("patients").select("id").order("created_at", desc=True).limit(1).execute()
        if p_last and p_last.data:
            return p_last.data[0]["id"]
    except Exception:
        pass

    return "4720f774-69e0-4485-9b88-6f14cf8c287f"


@router.post("/place_order")
@router.post("/place-order")
async def voice_place_order(req: VoicePlaceOrderRequest):
    """
    Webhook endpoint for ElevenLabs voice AI to place pending medicine orders.
    """
    try:
        med_name = req.medicine_name or "Paracetamol"
        qty_val = req.quantity

        if req.body and isinstance(req.body, dict):
            med_name = req.body.get("medicine_name") or med_name
            qty_val = req.body.get("quantity") or qty_val

        qty = parse_quantity_word(qty_val)
        patient_id = _resolve_patient_id(req.patient_id or req.patient_phone)

        agent = get_pharmacy_agent()
        order_res = await agent.place_order(
            user_id=patient_id,
            medicine_name=med_name,
            quantity=qty
        )

        return {
            "success": order_res.get("success", False),
            "status": "success" if order_res.get("success") else "error",
            "message": order_res.get("message", "Order processed"),
            "result": order_res.get("message", "Order processed"),
            "response": order_res.get("message", "Order processed"),
            "order_id": order_res.get("order_id"),
            "checkout_url": order_res.get("checkout_url")
        }
    except Exception as e:
        logger.error(f"Voice place_order error: {e}", exc_info=True)
        return {
            "success": False,
            "status": "error",
            "message": f"Could not complete medicine order: {str(e)}",
            "result": f"Could not complete medicine order: {str(e)}",
            "response": f"Could not complete medicine order: {str(e)}"
        }


@router.get("/orders/{patient_id}")
async def get_patient_orders(patient_id: str):
    """Fetch all orders for a given patient."""
    try:
        sb = _get_sb()
        res = sb.table("orders").select("*, order_items(*, medicines(*))").eq("patient_id", patient_id).order("created_at", desc=True).execute()
        return {"success": True, "orders": res.data or []}
    except Exception as e:
        logger.error(f"Error fetching orders for patient {patient_id}: {e}")
        return {"success": False, "orders": [], "error": str(e)}
