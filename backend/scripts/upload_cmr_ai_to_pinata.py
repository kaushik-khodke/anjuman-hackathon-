"""
Dedicated Streaming Uploader for CMR-AI Pretrained Model Checkpoint (364.86 MB)
================================================================================
Streams `swin_base_patch244_window877_kinetics600_22k.pth` directly to Pinata IPFS
using chunked Multipart streaming with progress monitoring and SHA-256 validation.
"""

import os
import sys
import time
import json
import hashlib
from pathlib import Path
from dotenv import load_dotenv
import requests
from requests.adapters import HTTPAdapter
from urllib3.util import Retry
from requests_toolbelt.multipart.encoder import MultipartEncoder, MultipartEncoderMonitor

# Load environment
BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")

PINATA_FILE_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS"
PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs"

JWT = os.getenv("PINATA_JWT") or os.getenv("VITE_PINATA_JWT") or ""
if not JWT:
    print("ERROR: PINATA_JWT not configured in backend/.env", flush=True)
    sys.exit(1)

CHECKPOINT_PATH = BACKEND_DIR / "ml" / "CMR-AI" / "checkpoints" / "swin_base_patch244_window877_kinetics600_22k.pth"


def compute_sha256(filepath: Path) -> str:
    print("Computing SHA-256 checksum...", flush=True)
    sha = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(1024 * 1024):
            sha.update(chunk)
    return sha.hexdigest()


def upload_cmr_ai():
    if not CHECKPOINT_PATH.exists():
        print(f"ERROR: CMR-AI checkpoint not found at {CHECKPOINT_PATH}", flush=True)
        return False

    file_size = CHECKPOINT_PATH.stat().st_size
    size_mb = file_size / (1024 * 1024)
    print("=======================================================", flush=True)
    print(f"CMR-AI Foundation Model Checkpoint Upload to Pinata IPFS", flush=True)
    print(f"File: {CHECKPOINT_PATH.name} ({size_mb:.2f} MB)", flush=True)
    print("=======================================================", flush=True)

    sha256_hash = compute_sha256(CHECKPOINT_PATH)
    print(f"SHA-256: {sha256_hash}", flush=True)

    timestamp = time.time()
    pinata_metadata = {
        "name": f"CMR_AI_VideoSwinTransformer_Pretrained_Base_Model.pth",
        "keyvalues": {
            "model_name": "CMR-AI",
            "model_id": "cmr-ai-vst",
            "modality": "Cardiac MRI",
            "architecture": "Video Swin Transformer (SwinTransformer3D)",
            "type": "base_foundation_checkpoint",
            "sha256": sha256_hash,
            "size_mb": f"{size_mb:.2f}",
            "created_at": str(timestamp),
        }
    }

    last_print = [0]
    start_time = time.time()

    def on_progress(monitor):
        now = time.time()
        if now - last_print[0] >= 10 or monitor.bytes_read == monitor.len:
            pct = (monitor.bytes_read / monitor.len) * 100
            mb_r = monitor.bytes_read / (1024 * 1024)
            mb_t = monitor.len / (1024 * 1024)
            elapsed = now - start_time
            speed_kb = (monitor.bytes_read / 1024) / max(1, elapsed)
            eta_s = (monitor.len - monitor.bytes_read) / max(1, speed_kb * 1024)
            print(
                f"  ... Progress: {mb_r:.1f}MB / {mb_t:.1f}MB ({pct:.1f}%) | "
                f"Speed: {speed_kb:.1f} KB/s | ETA: {eta_s/60:.1f} min",
                flush=True
            )
            last_print[0] = now

    session = requests.Session()
    retries = Retry(
        total=5,
        backoff_factor=2,
        status_forcelist=[500, 502, 503, 504],
        raise_on_status=False
    )
    session.mount("https://", HTTPAdapter(max_retries=retries))

    with open(CHECKPOINT_PATH, "rb") as fp:
        encoder = MultipartEncoder(
            fields={
                "pinataMetadata": json.dumps(pinata_metadata),
                "pinataOptions": json.dumps({"cidVersion": 1}),
                "file": (CHECKPOINT_PATH.name, fp, "application/octet-stream"),
            }
        )
        monitor = MultipartEncoderMonitor(encoder, on_progress)
        headers = {
            "Authorization": f"Bearer {JWT}",
            "Content-Type": monitor.content_type,
        }

        print("\nStarting chunked HTTP streaming to Pinata IPFS...", flush=True)
        res = session.post(
            PINATA_FILE_URL,
            data=monitor,
            headers=headers,
            timeout=(120, 7200),  # 2h socket read timeout
        )

    duration = time.time() - start_time
    if res.status_code == 200:
        resp_data = res.json()
        cid = resp_data.get("IpfsHash")
        print("\n=======================================================", flush=True)
        print(f"[SUCCESS] CMR-AI Model Uploaded to Pinata IPFS in {duration/60:.1f} minutes!", flush=True)
        print(f"Pinata IPFS CID: {cid}", flush=True)
        print(f"Gateway URL: {PINATA_GATEWAY}/{cid}", flush=True)
        print(f"SHA-256 Hash: {sha256_hash}", flush=True)
        print("=======================================================", flush=True)

        # Update Supabase fl_models
        try:
            from supabase import create_client
            url = os.getenv("VITE_SUPABASE_URL") or os.getenv("SUPABASE_URL")
            key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")
            if url and key:
                sb = create_client(url, key)
                sb.table("fl_models").update({
                    "input_spec": {
                        "resolution": "224 × 224 Cine Frames",
                        "channels": "Multi-view Temporal Series",
                        "format": "NIfTI (.nii, .nii.gz) or ZIP",
                        "base_checkpoint_cid": cid,
                        "base_checkpoint_url": f"{PINATA_GATEWAY}/{cid}",
                        "base_checkpoint_size_bytes": file_size,
                        "base_checkpoint_filename": CHECKPOINT_PATH.name
                    }
                }).eq("id", "cmr-ai-vst").execute()
                print("Updated Supabase fl_models table with new CID.", flush=True)
        except Exception as e:
            print("Supabase update note:", e, flush=True)

        return True
    else:
        print(f"\n[FAILED] Upload returned code {res.status_code}: {res.text}", flush=True)
        return False


if __name__ == "__main__":
    upload_cmr_ai()
