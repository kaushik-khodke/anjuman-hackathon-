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



# Note: Comprehensive /doctor/dashboard-data is served directly in main.py
