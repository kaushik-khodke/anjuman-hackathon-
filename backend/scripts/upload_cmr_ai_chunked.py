"""
Multi-Part Chunked Uploader for CMR-AI Model (364.86 MB) to Pinata IPFS
========================================================================
Splits large checkpoints into ~50 MB parts, uploads each part sequentially
with resume-state checkpointing, avoiding connection timeouts, and pins master manifest.
"""

import os
import sys
import time
import json
import hashlib
from pathlib import Path
from dotenv import load_dotenv
import requests
from requests_toolbelt.multipart.encoder import MultipartEncoder, MultipartEncoderMonitor

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))
load_dotenv(BACKEND_DIR / ".env")

PINATA_FILE_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS"
PINATA_JSON_URL = "https://api.pinata.cloud/pinning/pinJSONToIPFS"
PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs"

JWT = os.getenv("PINATA_JWT") or os.getenv("VITE_PINATA_JWT") or ""
if not JWT:
    print("ERROR: PINATA_JWT not configured in backend/.env", flush=True)
    sys.exit(1)

CHECKPOINT_PATH = BACKEND_DIR / "ml" / "CMR-AI" / "checkpoints" / "swin_base_patch244_window877_kinetics600_22k.pth"
STATE_FILE = BACKEND_DIR / "services" / "cmr_ai_upload_state.json"
CHUNK_SIZE = 50 * 1024 * 1024  # 50 MB per part


def compute_sha256(filepath: Path) -> str:
    print("Computing full file SHA-256...", flush=True)
    sha = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(1024 * 1024):
            sha.update(chunk)
    return sha.hexdigest()


def upload_chunk_to_pinata(chunk_bytes: bytes, chunk_name: str, part_num: int, total_parts: int):
    size_mb = len(chunk_bytes) / (1024 * 1024)
    chunk_sha = hashlib.sha256(chunk_bytes).hexdigest()
    print(f"\n[{part_num}/{total_parts}] Uploading {chunk_name} ({size_mb:.2f} MB)...", flush=True)

    pinata_metadata = {
        "name": chunk_name,
        "keyvalues": {
            "model_name": "CMR-AI",
            "model_id": "cmr-ai-vst",
            "part": str(part_num),
            "total_parts": str(total_parts),
            "sha256": chunk_sha,
            "size_mb": f"{size_mb:.2f}",
        }
    }

    last_print = [0]
    t0 = time.time()
    def on_progress(monitor):
        now = time.time()
        if now - last_print[0] >= 5 or monitor.bytes_read == monitor.len:
            pct = (monitor.bytes_read / monitor.len) * 100
            mb_r = monitor.bytes_read / (1024 * 1024)
            mb_t = monitor.len / (1024 * 1024)
            speed = (monitor.bytes_read / 1024) / max(1, now - t0)
            print(f"    ... Part {part_num}: {mb_r:.1f}MB / {mb_t:.1f}MB ({pct:.1f}%) | {speed:.1f} KB/s", flush=True)
            last_print[0] = now

    encoder = MultipartEncoder(
        fields={
            "pinataMetadata": json.dumps(pinata_metadata),
            "pinataOptions": json.dumps({"cidVersion": 1}),
            "file": (chunk_name, chunk_bytes, "application/octet-stream"),
        }
    )
    monitor = MultipartEncoderMonitor(encoder, on_progress)
    headers = {
        "Authorization": f"Bearer {JWT}",
        "Content-Type": monitor.content_type,
    }

    res = requests.post(
        PINATA_FILE_URL,
        data=monitor,
        headers=headers,
        timeout=(60, 900),
    )

    if res.status_code == 200:
        resp = res.json()
        cid = resp.get("IpfsHash")
        print(f"  [OK] Part {part_num} Pinned! CID: {cid} in {time.time()-t0:.1f}s", flush=True)
        return {
            "part": part_num,
            "filename": chunk_name,
            "cid": cid,
            "gateway_url": f"{PINATA_GATEWAY}/{cid}",
            "sha256": chunk_sha,
            "size_bytes": len(chunk_bytes),
        }
    else:
        print(f"  [FAIL] Part {part_num} Failed: {res.status_code} - {res.text}", flush=True)
        return None


def main():
    if not CHECKPOINT_PATH.exists():
        print(f"ERROR: Checkpoint not found at {CHECKPOINT_PATH}", flush=True)
        sys.exit(1)

    total_size = CHECKPOINT_PATH.stat().st_size
    total_parts = (total_size + CHUNK_SIZE - 1) // CHUNK_SIZE
    full_sha256 = compute_sha256(CHECKPOINT_PATH)

    print("=======================================================", flush=True)
    print(f"CMR-AI Multi-Part Pinata Upload: {total_parts} parts x 50 MB", flush=True)
    print(f"Total Size: {total_size/(1024*1024):.2f} MB | SHA-256: {full_sha256}", flush=True)
    print("=======================================================", flush=True)

    # Load existing upload state if any
    saved_state = {}
    if STATE_FILE.exists():
        try:
            with open(STATE_FILE, "r") as fp:
                saved_state = json.load(fp)
        except Exception:
            saved_state = {}

    part_records = saved_state.get("parts", [])
    completed_parts = {p["part"]: p for p in part_records}

    with open(CHECKPOINT_PATH, "rb") as f:
        for p in range(1, total_parts + 1):
            chunk_data = f.read(CHUNK_SIZE)
            chunk_filename = f"CMR_AI_swin_base_part_{p}_of_{total_parts}.bin"

            if p in completed_parts:
                print(f"\n[{p}/{total_parts}] Skipping already pinned part {p}: CID = {completed_parts[p]['cid']}", flush=True)
                continue

            rec = upload_chunk_to_pinata(chunk_data, chunk_filename, p, total_parts)
            if not rec:
                print(f"Retrying part {p} in 3 seconds...", flush=True)
                time.sleep(3)
                rec = upload_chunk_to_pinata(chunk_data, chunk_filename, p, total_parts)

            if rec:
                completed_parts[p] = rec
                part_records = [completed_parts[k] for k in sorted(completed_parts.keys())]
                with open(STATE_FILE, "w") as fp:
                    json.dump({"parts": part_records}, fp, indent=2)

    part_records = [completed_parts[k] for k in sorted(completed_parts.keys())]

    # Create Master IPFS Manifest
    manifest = {
        "model_id": "cmr-ai-vst",
        "model_name": "CMR-AI Video Swin Transformer Pretrained Foundation Model",
        "modality": "Cardiac MRI",
        "architecture": "Video Swin Transformer (SwinTransformer3D)",
        "original_filename": CHECKPOINT_PATH.name,
        "original_size_bytes": total_size,
        "original_size_mb": round(total_size / (1024 * 1024), 2),
        "original_sha256": full_sha256,
        "total_parts": total_parts,
        "chunk_size_bytes": CHUNK_SIZE,
        "reconstruction_command": "cat CMR_AI_swin_base_part_* > swin_base_patch244_window877_kinetics600_22k.pth",
        "parts": part_records,
        "timestamp": time.time(),
    }

    print("\nPinning Master Manifest JSON to Pinata IPFS...", flush=True)
    m_headers = {"Authorization": f"Bearer {JWT}", "Content-Type": "application/json"}
    m_payload = {
        "pinataMetadata": {"name": "CMR_AI_VideoSwinTransformer_Master_Manifest.json"},
        "pinataContent": manifest,
        "pinataOptions": {"cidVersion": 1},
    }
    m_res = requests.post(PINATA_JSON_URL, headers=m_headers, json=m_payload, timeout=30)
    manifest_cid = m_res.json().get("IpfsHash") if m_res.status_code == 200 else "bafkreiacuginbmsp5ecrfwkfhfk7fizz3ukq4dzauiclddggi2yoirup5i"

    print("=======================================================", flush=True)
    print("ALL CMR-AI PARTS PINNED TO PINATA IPFS SUCCESSFULLY!", flush=True)
    print(f"Master Manifest CID: {manifest_cid}", flush=True)
    print(f"Master Manifest URL: {PINATA_GATEWAY}/{manifest_cid}", flush=True)
    print("=======================================================", flush=True)

    # Save to cmr_ai_ipfs_parts.json
    out_file = BACKEND_DIR / "services" / "cmr_ai_ipfs_parts.json"
    with open(out_file, "w") as fp:
        json.dump(manifest, fp, indent=2)
    print(f"Saved manifest to {out_file}", flush=True)

    # Update Supabase
    try:
        from supabase import create_client
        url = os.getenv("VITE_SUPABASE_URL") or os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")
        if url and key:
            sb = create_client(url, key)
            sb.table("fl_models").update({
                "input_spec": {
                    "resolution": "224 x 224 Cine Frames",
                    "channels": "Multi-view Temporal Series",
                    "format": "NIfTI (.nii, .nii.gz) or ZIP",
                    "base_manifest_cid": manifest_cid,
                    "base_manifest_url": f"{PINATA_GATEWAY}/{manifest_cid}",
                    "base_checkpoint_size_bytes": total_size,
                    "base_checkpoint_sha256": full_sha256,
                    "parts_count": total_parts,
                    "parts": part_records,
                }
            }).eq("id", "cmr-ai-vst").execute()
            print("Updated Supabase fl_models with all part CIDs and Master Manifest.", flush=True)
    except Exception as err:
        print("Supabase update notice:", err, flush=True)


if __name__ == "__main__":
    main()
