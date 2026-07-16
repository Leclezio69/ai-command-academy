#!/usr/bin/env python3
"""Generate production MP3 narration for AI Command Academy using an ElevenLabs cloned voice."""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
AUDIO_DIR = ROOT / "audio"


def load_dotenv(path: Path) -> None:
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def clean(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def extract_jobs(html: str) -> list[tuple[str, str]]:
    jobs: list[tuple[str, str]] = []

    scene_narrations = re.findall(r"narration:`(.*?)`\s*}", html, flags=re.DOTALL)
    for index, text in enumerate(scene_narrations, start=1):
        jobs.append((f"scene-{index:02d}", clean(text)))

    match = re.search(r"const programs=(\[.*?\]);\s*const mission=\[", html, flags=re.DOTALL)
    if not match:
        raise ValueError("Could not locate the programs narration manifest in index.html")
    programs = json.loads(match.group(1))
    for program_index, program in enumerate(programs, start=1):
        jobs.append((f"program-{program_index:02d}-intro", clean(program["voiceIntro"])))
        for module_index, module in enumerate(program["modules"], start=1):
            jobs.append((f"program-{program_index:02d}-module-{module_index:02d}", clean(module["narration"])))
    return jobs


def generate(text: str, voice_id: str, api_key: str) -> bytes:
    model_id = os.getenv("ELEVENLABS_MODEL_ID", "eleven_multilingual_v2")
    payload = json.dumps({
        "text": text,
        "model_id": model_id,
        "voice_settings": {
            "stability": float(os.getenv("ELEVENLABS_STABILITY", "0.50")),
            "similarity_boost": float(os.getenv("ELEVENLABS_SIMILARITY_BOOST", "0.85")),
            "style": float(os.getenv("ELEVENLABS_STYLE", "0.12")),
            "use_speaker_boost": True,
            "speed": float(os.getenv("ELEVENLABS_SPEED", "0.97")),
        },
    }).encode("utf-8")
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128"
    request = Request(url, data=payload, method="POST", headers={
        "xi-api-key": api_key,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
    })
    with urlopen(request, timeout=120) as response:
        return response.read()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--overwrite", action="store_true", help="Regenerate existing MP3 files")
    parser.add_argument("--list", action="store_true", help="List narration files without generating audio")
    args = parser.parse_args()

    jobs = extract_jobs(INDEX.read_text(encoding="utf-8"))
    if args.list:
        for key, text in jobs:
            print(f"{key}.mp3\t{len(text)} characters")
        print(f"{len(jobs)} narration tracks")
        return 0

    load_dotenv(ROOT / ".env")
    api_key = os.getenv("ELEVENLABS_API_KEY", "").strip()
    voice_id = os.getenv("ELEVENLABS_VOICE_ID", "").strip()
    if not api_key or not voice_id:
        print("Missing ELEVENLABS_API_KEY or ELEVENLABS_VOICE_ID in .env", file=sys.stderr)
        return 2

    AUDIO_DIR.mkdir(exist_ok=True)
    for key, text in jobs:
        output = AUDIO_DIR / f"{key}.mp3"
        if output.exists() and not args.overwrite:
            print(f"Skip {output.name} (already exists)")
            continue
        print(f"Generate {output.name}…")
        try:
            output.write_bytes(generate(text, voice_id, api_key))
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            print(f"ElevenLabs HTTP {exc.code}: {detail}", file=sys.stderr)
            return 4
        except (URLError, TimeoutError) as exc:
            print(f"Network error: {exc}", file=sys.stderr)
            return 5
    print(f"Narration generation complete: {len(jobs)} tracks.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
