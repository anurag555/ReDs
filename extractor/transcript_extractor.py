"""
English YouTube Transcript Extraction Module

Extracts original English transcripts from YouTube videos and playlists
while strictly preserving verbatim text and accurate segment timestamps.
"""

import json
import logging
import re
from typing import Any, Dict, List, Optional, Tuple
import yt_dlp
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    NoTranscriptFound,
    TranscriptsDisabled,
    VideoUnavailable,
    YouTubeRequestFailed,
)

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


class TranscriptExtractionError(Exception):
    """Base exception for transcript extraction issues."""
    pass


class EnglishTranscriptUnavailableError(TranscriptExtractionError):
    """Raised when neither manual nor auto-generated English captions exist for a video."""
    pass


class VideoNotAvailableError(TranscriptExtractionError):
    """Raised when a video is private, deleted, or otherwise inaccessible."""
    pass


class EnglishTranscriptExtractor:
    """
    Service for extracting English transcripts from YouTube videos & playlists.
    - Only extracts English ('en', 'en-US', 'en-GB', etc.).
    - Prefers manual English over auto-generated English.
    - Preserves verbatim text without summarization or rewriting.
    - Preserves chronological order and computes segment end times accurately.
    """

    def __init__(self):
        self.api = YouTubeTranscriptApi()

    @staticmethod
    def extract_video_id(url_or_id: str) -> str:
        """Extracts clean 11-character video ID from URL or raw ID."""
        cleaned = url_or_id.strip()
        patterns = [
            r"(?:v=|\/v\/|youtu\.be\/|\/embed\/|\/shorts\/)([a-zA-Z0-9_-]{11})",
            r"^([a-zA-Z0-9_-]{11})$",
        ]
        for pattern in patterns:
            match = re.search(pattern, cleaned)
            if match:
                return match.group(1)
        return cleaned

    def extract_playlist_video_ids(self, playlist_url: str) -> List[Dict[str, str]]:
        """
        Retrieves all video IDs and titles from a playlist URL without downloading media.
        """
        ydl_opts = {
            "extract_flat": True,
            "quiet": True,
            "skip_download": True,
        }
        videos = []
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                result = ydl.extract_info(playlist_url, download=False)
                entries = result.get("entries", [])
                for entry in entries:
                    if not entry:
                        continue
                    v_id = entry.get("id")
                    title = entry.get("title", "")
                    if v_id:
                        videos.append({"video_id": v_id, "title": title})
            logger.info("Retrieved %d videos from playlist: %s", len(videos), playlist_url)
            return videos
        except Exception as e:
            logger.error("Failed to extract playlist metadata from %s: %s", playlist_url, e)
            raise TranscriptExtractionError(f"Failed to read playlist: {e}") from e

    def _select_english_transcript(self, video_id: str) -> Tuple[Any, str]:
        """
        Lists available transcripts and selects English according to policy:
        1. Manual English ('en*') has top priority.
        2. Auto-generated English ('en*') is secondary.
        3. If neither is available, raises EnglishTranscriptUnavailableError.
        """
        try:
            transcript_list = self.api.list(video_id)
        except VideoUnavailable as e:
            raise VideoNotAvailableError(f"Video {video_id} is unavailable or private.") from e
        except TranscriptsDisabled as e:
            raise EnglishTranscriptUnavailableError(f"Captions are disabled for video {video_id}.") from e
        except Exception as e:
            raise TranscriptExtractionError(f"Error accessing caption list for {video_id}: {e}") from e

        manual_en = None
        generated_en = None
        available_languages = []

        for t in transcript_list:
            available_languages.append(f"{t.language_code} ({'generated' if t.is_generated else 'manual'})")
            if t.language_code.lower().startswith("en"):
                if not t.is_generated and manual_en is None:
                    manual_en = t
                elif t.is_generated and generated_en is None:
                    generated_en = t

        if manual_en is not None:
            logger.info("Video %s: Found manually created English caption (%s)", video_id, manual_en.language_code)
            return manual_en, "manual"

        if generated_en is not None:
            logger.info("Video %s: Found auto-generated English caption (%s)", video_id, generated_en.language_code)
            return generated_en, "generated"

        msg = (
            f"No English transcript available for video {video_id}. "
            f"Available caption tracks: {available_languages or 'None'}"
        )
        logger.warning(msg)
        raise EnglishTranscriptUnavailableError(msg)

    def extract_from_video(self, video_url_or_id: str, title: Optional[str] = None) -> Dict[str, Any]:
        """
        Extracts verbatim English transcript with timestamps for a single video.
        """
        video_id = self.extract_video_id(video_url_or_id)
        video_url = f"https://www.youtube.com/watch?v={video_id}"

        target_transcript, transcript_type = self._select_english_transcript(video_id)

        try:
            raw_snippets = target_transcript.fetch()
        except Exception as e:
            raise TranscriptExtractionError(f"Failed to download transcript payload for {video_id}: {e}") from e

        segments: List[Dict[str, Any]] = []
        for s in raw_snippets:
            start_val = round(float(s.start), 2)
            duration_val = round(float(s.duration), 2)
            end_val = round(start_val + duration_val, 2)
            
            segments.append({
                "start": start_val,
                "duration": duration_val,
                "end": end_val,
                "text": s.text
            })

        return {
            "video_id": video_id,
            "video_url": video_url,
            "title": title or "",
            "language": target_transcript.language_code,
            "transcript_type": transcript_type,
            "segments": segments
        }

    def extract_from_playlist(
        self,
        playlist_url: str,
        limit: Optional[int] = None
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, str]]]:
        """
        Processes a playlist and extracts English transcripts for all eligible videos.
        """
        videos = self.extract_playlist_video_ids(playlist_url)
        if limit:
            videos = videos[:limit]

        successful = []
        failures = []

        for item in videos:
            v_id = item["video_id"]
            title = item.get("title", "")
            try:
                transcript_data = self.extract_from_video(v_id, title=title)
                successful.append(transcript_data)
            except EnglishTranscriptUnavailableError as e:
                failures.append({"video_id": v_id, "title": title, "reason": "No English transcript available", "detail": str(e)})
            except VideoNotAvailableError as e:
                failures.append({"video_id": v_id, "title": title, "reason": "Video unavailable or private", "detail": str(e)})
            except Exception as e:
                failures.append({"video_id": v_id, "title": title, "reason": "Extraction failed", "detail": str(e)})

        return successful, failures

