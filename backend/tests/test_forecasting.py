"""
Unit Tests for 4-Signal Patient Inflow Forecasting Engine
"""
import pytest
from resource_load import get_seasonal_adjustment


def test_seasonal_patterns():
    """Verify seasonal multiplier logic returns valid seasonal configurations."""
    adj = get_seasonal_adjustment()
    assert "season" in adj
    assert "multiplier" in adj
    assert adj["multiplier"] >= 1.0
    assert isinstance(adj["conditions"], list)


def test_forecast_horizon_inputs():
    """Verify time-series horizon outputs valid structures."""
    from services.forecast_service import calculate_inflow_forecast
    result = calculate_inflow_forecast(current_bed_occupancy_pct=85.0)
    assert result is not None
    assert "forecast_1h" in result or "success" in result
