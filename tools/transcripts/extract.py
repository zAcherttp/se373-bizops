# /// script
# requires-python = ">=3.12"
# dependencies = ["youtube-transcript-api==1.2.4"]
# ///
"""Extract research evidence; callable by agents as a CLI or Python function."""

import argparse
import json
import re
import sys
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from youtube_transcript_api import YouTubeTranscriptApi

ROOT = Path(__file__).resolve().parents[2]


def video_id(value: str) -> str:
    """Accept an ID or an allowlisted YouTube watch/short/live URL."""
    candidate = value.strip()
    if not re.fullmatch(r"[\w-]{11}", candidate, flags=re.ASCII):
        url = urlparse(candidate)
        host = (url.hostname or "").lower()
        parts = url.path.strip("/").split("/")
        if url.scheme not in {"http", "https"}:
            raise ValueError("Expected a YouTube URL or 11-character video ID")
        if host == "youtu.be" and len(parts) == 1:
            candidate = parts[0]
        elif host in {"youtube.com", "www.youtube.com", "m.youtube.com"}:
            if url.path == "/watch":
                candidate = parse_qs(url.query).get("v", [""])[0]
            elif len(parts) == 2 and parts[0] in {"shorts", "live", "embed"}:
                candidate = parts[1]
            else:
                candidate = ""
        else:
            candidate = ""
    if not re.fullmatch(r"[\w-]{11}", candidate, flags=re.ASCII):
        raise ValueError("Expected a YouTube URL or 11-character video ID")
    return candidate


def stitch(segments: list[dict]) -> str:
    """Join captions in source order, normalizing whitespace without rewriting speech."""
    paragraph = " ".join(" ".join(s["text"].split()) for s in segments).strip()
    if not paragraph:
        raise ValueError("Transcript is empty; no research files were written")
    return paragraph


def extract(source: str, languages: list[str], output: Path, api=None) -> dict:
    """Fetch captions and return paths to evidence and an agent-readable paragraph."""
    identifier = video_id(source)
    fetched = (api or YouTubeTranscriptApi()).fetch(identifier, languages=languages)
    segments = fetched.to_raw_data()
    paragraph = stitch(segments)
    metadata = {
        "video_id": identifier,
        "source_url": f"https://www.youtube.com/watch?v={identifier}",
        "retrieved_at": datetime.now(UTC).isoformat(),
        "language": fetched.language,
        "language_code": fetched.language_code,
        "is_generated": fetched.is_generated,
        "segments": segments,
    }
    output.mkdir(parents=True, exist_ok=True)
    stem = output / f"{identifier}.{fetched.language_code}"
    paths = {"json": Path(f"{stem}.json"), "paragraph": Path(f"{stem}.paragraph.txt")}
    paths["json"].write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    paths["paragraph"].write_text(paragraph + "\n", encoding="utf-8")
    return {"video_id": identifier, "segments": len(segments), **{k: str(v) for k, v in paths.items()}}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", help="YouTube URL or video ID")
    parser.add_argument("--languages", nargs="+", default=["en"], help="Preferred caption languages in order")
    parser.add_argument("--output-dir", type=Path, default=ROOT / "docs" / "references")
    args = parser.parse_args()
    try:
        result = extract(args.source, args.languages, args.output_dir)
    except Exception as exc:  # noqa: BLE001 - CLI boundary emits machine-readable failures.
        print(json.dumps({"error": type(exc).__name__, "message": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 1
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
