"""
Playlist Transcript Extractor CLI

Extracts English transcripts from a YouTube playlist and saves them as
individual JSON files ready for vector ingestion into Qdrant.

Features:
- Auto-resumes: skips videos that have already been extracted.
- Rate-limit backoff: cools down automatically if YouTube throttles requests.
- Generates a manifest.json tracking overall progress.
"""

import json
import os
import sys
import time
import argparse
from transcript_extractor import (
    EnglishTranscriptExtractor,
    EnglishTranscriptUnavailableError,
    VideoNotAvailableError,
    TranscriptExtractionError
)

# Resolve default output directory to ReDs/data/transcripts
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_OUTPUT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "data", "transcripts"))

def process_playlist(
    playlist_url: str,
    output_dir: str = DEFAULT_OUTPUT_DIR,
    delay_between_requests: float = 2.0,
    max_cooldown_retries: int = 5,
    cooldown_seconds: int = 60
):
    extractor = EnglishTranscriptExtractor()
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"[*] Extracting playlist metadata from: {playlist_url}")
    videos = extractor.extract_playlist_video_ids(playlist_url)
    total_videos = len(videos)
    print(f"[+] Total videos discovered in playlist: {total_videos}\n")
    print(f"[+] Target output directory: {output_dir}\n")
    
    successful = []
    already_saved = 0
    failures = []
    
    for idx, item in enumerate(videos, 1):
        v_id = item["video_id"]
        title = item.get("title") or "Untitled Video"
        v_file = os.path.join(output_dir, f"{v_id}.json")
        
        # Check if already processed (Resumability)
        if os.path.exists(v_file):
            try:
                with open(v_file, "r", encoding="utf-8") as f:
                    existing_data = json.load(f)
                if "segments" in existing_data and len(existing_data["segments"]) > 0:
                    already_saved += 1
                    successful.append(existing_data)
                    print(f"[{idx}/{total_videos}] [CACHED] {v_id} - '{title[:45]}' ({len(existing_data['segments'])} segs)")
                    continue
            except Exception:
                pass  # Corrupt file; re-download
                
        print(f"[{idx}/{total_videos}] [FETCHING] {v_id} - '{title[:45]}'...")
        
        retries = 0
        success = False
        
        while retries <= max_cooldown_retries and not success:
            try:
                transcript_data = extractor.extract_from_video(v_id, title=title)
                with open(v_file, "w", encoding="utf-8") as f:
                    json.dump(transcript_data, f, indent=2, ensure_ascii=False)
                    
                successful.append(transcript_data)
                print(f"    -> Extracted {len(transcript_data['segments'])} segments ({transcript_data['transcript_type']})")
                success = True
                time.sleep(delay_between_requests)
            except EnglishTranscriptUnavailableError as e:
                print(f"    -> [SKIPPED] No English transcript available: {e}")
                failures.append({"video_id": v_id, "title": title, "reason": "No English transcript available"})
                break
            except VideoNotAvailableError as e:
                print(f"    -> [SKIPPED] Video unavailable/private: {e}")
                failures.append({"video_id": v_id, "title": title, "reason": "Video unavailable"})
                break
            except Exception as e:
                err_str = str(e)
                if "IpBlocked" in err_str or "blocking requests from your IP" in err_str or "429" in err_str:
                    retries += 1
                    if retries <= max_cooldown_retries:
                        print(f"    -> [RATE-LIMIT] YouTube rate-limit detected. Cooling down for {cooldown_seconds}s (Attempt {retries}/{max_cooldown_retries})...")
                        time.sleep(cooldown_seconds)
                    else:
                        print(f"    -> [RATE-LIMIT] Cooldown limit reached. Pausing batch.")
                        failures.append({"video_id": v_id, "title": title, "reason": "YouTube IP rate limit"})
                else:
                    print(f"    -> [ERROR] {e}")
                    failures.append({"video_id": v_id, "title": title, "reason": str(e)})
                    break

        if retries > max_cooldown_retries:
            print("\n[!] YouTube IP rate-limit is currently active. Halting execution gracefully.")
            print("[!] You can re-run this script anytime; it will resume automatically from where it paused.")
            break

    # Save summary manifest
    manifest_path = os.path.join(output_dir, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump({
            "playlist_url": playlist_url,
            "total_videos_in_playlist": total_videos,
            "total_processed_successfully": len(successful),
            "total_cached": already_saved,
            "total_unprocessed": total_videos - len(successful),
            "manifest_file": manifest_path
        }, f, indent=2, ensure_ascii=False)
        
    print("\n" + "=" * 55)
    print("EXTRACTION SUMMARY")
    print("=" * 55)
    print(f"Total videos in playlist:       {total_videos}")
    print(f"Successfully saved to disk:     {len(successful)}")
    print(f"Transcripts directory:          {output_dir}")
    print(f"Manifest path:                  {manifest_path}")
    print("=" * 55)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract English YouTube transcripts for a playlist")
    parser.add_argument("--playlist", type=str, required=True, help="YouTube Playlist URL")
    parser.add_argument("--output", type=str, default=DEFAULT_OUTPUT_DIR, help=f"Output folder (default: {DEFAULT_OUTPUT_DIR})")
    parser.add_argument("--delay", type=float, default=2.0, help="Delay between requests in seconds (default: 2.0)")
    parser.add_argument("--cooldown", type=int, default=60, help="Cooldown when rate limited in seconds (default: 60)")
    parser.add_argument("--retries", type=int, default=5, help="Max cooldown retries before giving up (default: 5)")
    args = parser.parse_args()
    
    process_playlist(
        playlist_url=args.playlist,
        output_dir=args.output,
        delay_between_requests=args.delay,
        cooldown_seconds=args.cooldown,
        max_cooldown_retries=args.retries
    )

