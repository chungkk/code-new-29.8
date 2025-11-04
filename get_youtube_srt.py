#!/usr/bin/env python3
import sys
import json
import re
from youtube_transcript_api import YouTubeTranscriptApi

def get_transcript(video_id):
    try:
        api = YouTubeTranscriptApi()

        # First, list available transcripts
        transcript_list = api.list(video_id)
        transcripts = list(transcript_list)

        # Try to find manually created transcript first, then generated
        transcript = None

        # Try manually created transcripts in German only
        try:
            transcript = transcript_list.find_manually_created_transcript(['de'])
        except:
            pass

        # If no manually created German, try generated transcripts in German only
        if not transcript:
            try:
                transcript = transcript_list.find_generated_transcript(['de'])
            except:
                pass

        # If still no transcript, try to fetch any available transcript
        if not transcript and transcripts:
            transcript = transcripts[0]

        # Fetch the actual transcript data
        if transcript:
            return transcript.fetch()

        return None
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        return None

def convert_to_srt(transcript):
    srt_entries = []
    sentence_end_pattern = re.compile(r'[.!?…]+["\'\)\]]*\s*$')
    sentence_split_pattern = re.compile(r'[^.!?…]+(?:[.!?…]+["\'\)\]]*)?')
    processed_items = []

    def get_value(item, key, default=None):
        if isinstance(item, dict):
            return item.get(key, default)
        return getattr(item, key, default)

    def normalize_text(raw_text):
        return ' '.join((raw_text or '').replace('\n', ' ').split()).strip()

    for item in transcript:
        start = float(get_value(item, 'start', 0) or 0)
        duration = float(get_value(item, 'duration', 0) or 0)
        end = start + duration if duration else None
        text = normalize_text(get_value(item, 'text', ''))

        if not text:
            continue

        segments = [normalize_text(seg) for seg in sentence_split_pattern.findall(text)]
        segments = [seg for seg in segments if seg]

        if not segments:
            continue

        segment_count = len(segments)
        segment_duration = duration / segment_count if duration and segment_count else 0

        for idx, segment_text in enumerate(segments):
            seg_start = start + (segment_duration * idx if segment_duration else 0)
            if segment_duration:
                seg_end = seg_start + segment_duration
            else:
                seg_end = end if idx == segment_count - 1 else None

            processed_items.append({
                'start': seg_start,
                'end': seg_end,
                'text': segment_text
            })

    current_text = ''
    current_start = None
    last_end = None

    def finalize_entry(end_time):
        nonlocal current_text, current_start, last_end
        if not current_text or current_start is None or end_time is None:
            return
        if end_time <= current_start:
            end_time = current_start + 0.5  # ensure positive frame
        srt_entries.append((current_start, end_time, current_text.strip()))
        current_text = ''
        current_start = None
        last_end = None

    max_words = 16
    min_words = 6  # Keep very short sentences merged for better study context

    for index, item in enumerate(processed_items):
        start = float(get_value(item, 'start', 0) or 0)
        end = item.get('end')
        duration = (end - start) if end is not None else 0
        text = item.get('text', '')

        if not text:
            continue

        if current_start is None:
            current_start = start

        current_text = f"{current_text} {text}".strip() if current_text else text
        last_end = end if end is not None else last_end

        has_sentence_end = bool(sentence_end_pattern.search(current_text))
        word_count = len(current_text.split())
        should_finalize = False

        if word_count >= max_words:
            should_finalize = True
        elif has_sentence_end and (word_count >= min_words or index == len(processed_items) - 1):
            should_finalize = True

        if should_finalize:
            effective_end = last_end
            if effective_end is None and index + 1 < len(processed_items):
                next_start = float(processed_items[index + 1].get('start', start) or start)
                effective_end = next_start
            if effective_end is None:
                effective_end = start + max(duration, 0.5)
            finalize_entry(effective_end)

    if current_text:
        effective_end = last_end
        if effective_end is None:
            if processed_items:
                last_item = processed_items[-1]
                fallback_start = float(last_item.get('start', 0) or 0)
                fallback_duration = float((last_item.get('end') - fallback_start) if last_item.get('end') is not None else 0)
                effective_end = fallback_start + max(fallback_duration, 0.5)
            else:
                effective_end = (current_start or 0) + 0.5
        if current_start is None:
            current_start = float(processed_items[-1].get('start', 0) or 0) if processed_items else 0
        finalize_entry(effective_end)

    def format_time(seconds):
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        ms = int(round((seconds % 1) * 1000))
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{ms:03d}"

    srt = ''
    for idx, (start, end, text) in enumerate(srt_entries, start=1):
        srt += f"{idx}\n"
        srt += f"{format_time(start)} --> {format_time(end)}\n"
        srt += f"{text}\n\n"

    return srt.strip(), len(srt_entries)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python get_youtube_srt.py <video_id>", file=sys.stderr)
        sys.exit(1)

    video_id = sys.argv[1]
    transcript = get_transcript(video_id)

    if transcript:
        srt_text, item_count = convert_to_srt(transcript)
        result = {
            "success": True,
            "srt": srt_text,
            "itemCount": item_count
        }
        print(json.dumps(result))
    else:
        result = {
            "success": False,
            "error": "Could not fetch transcript"
        }
        print(json.dumps(result))
