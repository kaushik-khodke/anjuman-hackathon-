"""
Upload Pretrained Base Models to Pinata IPFS (80MB CheXNet + 364MB CMR-AI)
==========================================================================
Uploads the full base foundation models to Pinata IPFS using chunked streaming.
Skips CT-CLIP (1.7 GB) as requested.
"""

import os
import sys
import time
import json
from pathlib import Path
from dotenv import load_dotenv

# Set sys.path to backend root
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))
load_dotenv(BACKEND_DIR / ".env")

from services.pinata_service import pinata_service

MODELS_TO_UPLOAD = [
    {
        "name": "CheXNet_DenseNet121_Base_Model",
        "modality": "Chest X-ray",
        "path": BACKEND_DIR / "ml" / "chexnet" / "models" / "m-25012018-123527.pth.tar",
        "model_id": "cxr-pneumo-cnn",
    },
    {
        "name": "CMR_AI_VideoSwinTransformer_Base_Model",
        "modality": "Cardiac MRI",
        "path": BACKEND_DIR / "ml" / "CMR-AI" / "checkpoints" / "swin_base_patch244_window877_kinetics600_22k.pth",
        "model_id": "cmr-ai-vst",
    },
]


def main():
    print("Starting Streaming Upload of Pretrained Base Foundation Models...", flush=True)
    results = []

    for m in MODELS_TO_UPLOAD:
        filepath = m["path"]
        if not filepath.exists():
            print(f"Skipping {m['name']}: file not found at {filepath}", flush=True)
            continue

        size_mb = filepath.stat().st_size / (1024 * 1024)
        print(f"\n=======================================================", flush=True)
        print(f"Uploading: {m['name']} ({size_mb:.2f} MB)", flush=True)
        print(f"Path: {filepath}", flush=True)
        print(f"=======================================================", flush=True)

        last_print = [0]
        def on_progress(bytes_read, total_bytes):
            now = time.time()
            if now - last_print[0] >= 5 or bytes_read == total_bytes:
                pct = (bytes_read / total_bytes) * 100
                mb_r = bytes_read / (1024 * 1024)
                mb_t = total_bytes / (1024 * 1024)
                print(f"  ... Streaming: {mb_r:.1f} MB / {mb_t:.1f} MB ({pct:.1f}%)", flush=True)
                last_print[0] = now

        res = pinata_service.upload_large_base_model(
            file_path=filepath,
            model_name=m["name"],
            modality=m["modality"],
            progress_callback=on_progress,
        )

        print(f"\n[COMPLETED] Model: {m['name']}", flush=True)
        print(f"  • CID: {res['cid']}", flush=True)
        print(f"  • Gateway URL: {res['gateway_url']}", flush=True)
        print(f"  • SHA-256: {res['sha256']}", flush=True)
        results.append(res)

    print("\n=======================================================", flush=True)
    print("BASE MODEL IPFS PINNING SUMMARY:", flush=True)
    print("=======================================================", flush=True)
    for r in results:
        print(f"• CID: {r['cid']} | SHA-256: {r['sha256'][:16]}... | Size: {r['file_size_bytes']/(1024*1024):.2f} MB")

    out_file = BACKEND_DIR / "services" / "base_models_ipfs.json"
    with open(out_file, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nSaved summary to {out_file}", flush=True)


if __name__ == "__main__":
    main()
