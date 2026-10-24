"""Offline contract tests; no captions, API key, or network required."""

import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

from extract import extract, stitch, video_id


class TranscriptTests(unittest.TestCase):
    def test_supported_sources(self):
        for source in ["L1OBRtfPS34", "https://youtu.be/L1OBRtfPS34?t=2",
                       "https://www.youtube.com/watch?v=L1OBRtfPS34&list=x",
                       "https://youtube.com/shorts/L1OBRtfPS34"]:
            self.assertEqual(video_id(source), "L1OBRtfPS34")

    def test_rejects_foreign_hosts_and_paths(self):
        for source in ["https://evil.test/watch?v=L1OBRtfPS34", "../../bad", "https://youtu.be/short"]:
            with self.assertRaises(ValueError):
                video_id(source)

    def test_stitch_preserves_repetition_and_unicode(self):
        self.assertEqual(stitch([{"text": " Xin\n chào "}, {"text": "chào\t world."}]), "Xin chào chào world.")
        with self.assertRaises(ValueError):
            stitch([])

    def test_outputs_and_language_priority(self):
        segments = [{"text": "Hello\nworld.", "start": 1.0, "duration": 2.0}]
        fetched = SimpleNamespace(language="English", language_code="en", is_generated=True,
                                  to_raw_data=lambda: segments)
        calls = []
        api = SimpleNamespace(fetch=lambda identifier, **kwargs: (calls.append((identifier, kwargs)) or fetched))
        with tempfile.TemporaryDirectory() as folder:
            result = extract("L1OBRtfPS34", ["vi", "en"], Path(folder), api)
            self.assertEqual(Path(result["paragraph"]).read_text(encoding="utf-8"), "Hello world.\n")
            data = json.loads(Path(result["json"]).read_text(encoding="utf-8"))
            self.assertEqual(data["segments"], segments)
            self.assertTrue(data["is_generated"])
            self.assertEqual(calls[0][1]["languages"], ["vi", "en"])

    def test_fetch_failure_writes_nothing(self):
        def fail(*args, **kwargs):
            raise RuntimeError("Captions unavailable")
        with tempfile.TemporaryDirectory() as folder:
            with self.assertRaises(RuntimeError):
                extract("L1OBRtfPS34", ["en"], Path(folder), SimpleNamespace(fetch=fail))
            self.assertEqual(list(Path(folder).iterdir()), [])


if __name__ == "__main__":
    unittest.main()
