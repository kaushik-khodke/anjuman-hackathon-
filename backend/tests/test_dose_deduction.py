"""
Tests for dose logging, atomic stock deduction, and agenda generation formatting.
"""
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
import pytest

from main import app, LogDoseRequest

client = TestClient(app)


def test_log_dose_taken_atomically_deducts_qty():
    """Verify /log-dose with status='taken' attempts insert and decrements order_items qty."""
    mock_sb = MagicMock()
    # Mock medication_logs insert
    mock_sb.table.return_value.insert.return_value.execute.return_value = MagicMock(data=[{"id": "log-1"}])
    # Mock order_items select
    mock_sb.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
        data={"id": "item-123", "qty": 10}
    )
    # Mock order_items update
    mock_sb.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[{"qty": 9}])

    with patch("main._get_sb", return_value=mock_sb):
        response = client.post(
            "/log-dose",
            json={
                "user_id": "usr-1",
                "medicine_id": "med-1",
                "order_item_id": "item-123",
                "status": "taken",
                "scheduled_time": "08:00"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["remaining"] == 9
        # Verify update was called with qty = 9
        mock_sb.table.return_value.update.assert_called_with({"qty": 9})


def test_log_dose_missed_does_not_deduct_qty():
    """Verify /log-dose with status='missed' logs the missed event but leaves qty untouched."""
    mock_sb = MagicMock()
    mock_sb.table.return_value.insert.return_value.execute.return_value = MagicMock(data=[{"id": "log-2"}])

    with patch("main._get_sb", return_value=mock_sb):
        response = client.post(
            "/log-dose",
            json={
                "user_id": "usr-1",
                "medicine_id": "med-1",
                "order_item_id": "item-123",
                "status": "missed",
                "scheduled_time": "14:00"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["remaining"] is None
        # Verify update was NOT called
        mock_sb.table.return_value.update.assert_not_called()


def test_agenda_med_lines_formatting():
    """Verify medicines summary dictionaries format cleanly into strings for Gemini prompt."""
    medicines_summary = [
        {"name": "Paracetamol 500mg", "freq": "twice", "med_id": "m1", "item_id": "i1"},
        {"name": "Amoxicillin 250mg", "freq": "once", "med_id": "m2", "item_id": "i2"},
    ]
    med_lines = [
        f"- {m['name']} (Frequency: {m['freq']}, med_id: {m['med_id']}, item_id: {m['item_id']})"
        for m in medicines_summary
    ]
    med_text = "\n".join(med_lines)
    assert "Paracetamol 500mg (Frequency: twice, med_id: m1, item_id: i1)" in med_text
    assert "Amoxicillin 250mg (Frequency: once, med_id: m2, item_id: i2)" in med_text
