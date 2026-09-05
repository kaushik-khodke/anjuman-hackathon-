"""
Pytest Unit Tests for Health & Diagnostic API Routes
"""

import pytest
from routes.health import health_check, root


@pytest.mark.asyncio
async def test_root_endpoint():
    """Verify welcome root endpoint returns status online."""
    res = await root()
    assert res is not None
    assert res.get("status") == "online"
    assert "version" in res


@pytest.mark.asyncio
async def test_health_check_endpoint():
    """Verify /health returns valid status structure."""
    res = await health_check()
    assert res is not None
    assert res.get("status") in ("ok", "degraded")
    assert "database" in res
    assert "python_version" in res
