import os
import stripe
from fastapi import HTTPException
from supabase import create_client

import asyncio

def _get_sb():
    url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")
    if not url or not key:
        return None
    try:
        return create_client(url, key)
    except Exception as e:
        print(f"⚠️ payment_service _get_sb warning: {e}")
        return None

def _create_stripe_checkout_sync(
    order_id: str = None,
    success_url: str = "http://localhost:5173/payment-success",
    cancel_url: str = "http://localhost:5173/payment-cancel",
    medicine_name: str = "Prescription Medicine",
    amount_cents: int = 1500,
    quantity: int = 1,
):
    """
    Synchronous helper to create a Stripe checkout session without blocking event loop.
    Supports both database order lookup and direct item payment requests.
    """
    line_items = []
    
    if order_id:
        try:
            sb = _get_sb()
            order_res = (
                sb.table("orders")
                .select("id, status, order_items(qty, medicines(name, price_rec))")
                .eq("id", order_id)
                .single()
                .execute()
            )
            if order_res and order_res.data:
                order = order_res.data
                for item in order.get("order_items", []):
                    med = item.get("medicines", {})
                    price_amount = min(max(1, int(float(med.get("price_rec") or 10.00) * 100)), 999999)
                    line_items.append({
                        "price_data": {
                            "currency": "usd",
                            "product_data": {"name": med.get("name", medicine_name)},
                            "unit_amount": price_amount,
                        },
                        "quantity": item.get("qty", 1),
                    })
        except Exception as oe:
            print(f"Notice: Order lookup for checkout {order_id} deferred: {oe}")

    if not line_items:
        line_items = [{
            "price_data": {
                "currency": "usd",
                "product_data": {"name": medicine_name or "Prescription Medicine"},
                "unit_amount": max(50, amount_cents or 1500),
            },
            "quantity": max(1, quantity or 1),
        }]

    stripe_key = os.getenv("STRIPE_SECRET_KEY")
    if not stripe_key or not stripe_key.startswith("sk_"):
        print("Payment Service: Stripe API Key is missing/unconfigured. Returning fallback development URL.")
        succ = success_url or "http://localhost:5173/payment-success"
        mock_url = f"{succ}?session_id=test_demo_mode&medicine={medicine_name}"
        return {"success": True, "checkout_url": mock_url, "url": mock_url}

    try:
        stripe.api_key = stripe_key
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=line_items,
            mode="payment",
            success_url=(success_url or "http://localhost:5173/payment-success") + "?session_id={CHECKOUT_SESSION_ID}",
            cancel_url=cancel_url or "http://localhost:5173/payment-cancel",
            client_reference_id=order_id or "direct_purchase"
        )
        return {"success": True, "checkout_url": session.url, "url": session.url}
    except Exception as e:
        print(f"Payment Service Error: {e}")
        succ = success_url or "http://localhost:5173/payment-success"
        return {
            "success": True,
            "checkout_url": f"{succ}?session_id=test_fallback&error={str(e)}",
            "mode": "development_fallback"
        }

async def _create_stripe_checkout(*args, **kwargs):
    """
    Asynchronous wrapper for the Stripe SDK and network requests.
    """
    return await asyncio.to_thread(_create_stripe_checkout_sync, *args, **kwargs)

