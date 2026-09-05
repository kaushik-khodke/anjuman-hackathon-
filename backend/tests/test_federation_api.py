"""
FastAPI HTTP Integration Test for Federated Intelligence Endpoints
===================================================================
Tests:
- GET /fl/models
- GET /fl/models/{model_id}
- POST /fl/train-job with X-Ray, CT, and MRI archives
- GET /fl/history/{hospital_id}
"""

import io
import zipfile
import pytest
from pathlib import Path
from PIL import Image
import numpy as np
from fastapi.testclient import TestClient

BACKEND_ROOT = Path(__file__).resolve().parent.parent
import sys
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from main import app

client = TestClient(app)


def make_zip(prefix: str = "img"):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        for i in range(4):
            arr = (np.random.rand(64, 64) * 255).astype(np.uint8)
            img = Image.fromarray(arr)
            img_buf = io.BytesIO()
            img.save(img_buf, format="PNG")
            zf.writestr(f"{prefix}/sample_{i}.png", img_buf.getvalue())
    return buf.getvalue()


def test_get_fl_models():
    res = client.get("/fl/models")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert len(data["models"]) >= 3
    categories = [m["category"] for m in data["models"]]
    assert "xray" in categories
    assert "ctscan" in categories
    assert "mri" in categories


def test_get_fl_model_by_id():
    for mid in ["xray", "ctscan", "mri", "cxr-pneumo-cnn", "ct-clip-3d", "cmr-ai-vst"]:
        res = client.get(f"/fl/models/{mid}")
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert "name" in data["model"]


def test_start_train_job_xray():
    zip_bytes = make_zip("xray")
    files = {"file": ("hospital_xray.zip", zip_bytes, "application/zip")}
    data = {
        "model_id": "cxr-pneumo-cnn",
        "category": "xray",
        "hospital_id": "test-hosp-xray",
        "hospital_name": "Metro General",
        "modality": "Chest X-ray",
        "epochs": "2",
        "batch_size": "2",
    }
    res = client.post("/fl/train-job", data=data, files=files)
    assert res.status_code == 200
    resp_json = res.json()
    assert resp_json["success"] is True
    assert "job_id" in resp_json
    assert resp_json["category"] == "xray"


def test_start_train_job_ct():
    zip_bytes = make_zip("ct")
    files = {"file": ("hospital_ct.zip", zip_bytes, "application/zip")}
    data = {
        "model_id": "ct-clip-3d",
        "category": "ctscan",
        "hospital_id": "test-hosp-ct",
        "hospital_name": "City Radiology",
        "modality": "Chest CT Scan",
        "epochs": "2",
        "batch_size": "2",
    }
    res = client.post("/fl/train-job", data=data, files=files)
    assert res.status_code == 200
    resp_json = res.json()
    assert resp_json["success"] is True
    assert resp_json["category"] == "ctscan"


def test_start_train_job_mri():
    zip_bytes = make_zip("mri")
    files = {"file": ("hospital_mri.zip", zip_bytes, "application/zip")}
    data = {
        "model_id": "cmr-ai-vst",
        "category": "mri",
        "hospital_id": "test-hosp-mri",
        "hospital_name": "Cardiac Center",
        "modality": "Cardiac MRI",
        "epochs": "2",
        "batch_size": "2",
    }
    res = client.post("/fl/train-job", data=data, files=files)
    assert res.status_code == 200
    resp_json = res.json()
    assert resp_json["success"] is True
    assert resp_json["category"] == "mri"


def test_history_endpoint():
    res = client.get("/fl/history/test-hosp-xray")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert isinstance(data["history"], list)


if __name__ == "__main__":
    print("Testing FastAPI Federation Endpoints...")
    test_get_fl_models()
    print("[OK] /fl/models passed")
    test_get_fl_model_by_id()
    print("[OK] /fl/models/{id} passed")
    test_start_train_job_xray()
    print("[OK] /fl/train-job (X-Ray) passed")
    test_start_train_job_ct()
    print("[OK] /fl/train-job (CT) passed")
    test_start_train_job_mri()
    print("[OK] /fl/train-job (MRI) passed")
    test_history_endpoint()
    print("[OK] /fl/history/{hospital_id} passed")
    print("\nALL FASTAPI FEDERATION TESTS PASSED!")
