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

    def get_value(item, key, default=None):
        if isinstance(item, dict):
            return item.get(key, default)
        return getattr(item, key, default)

    def normalize_text(raw_text):
        return ' '.join((raw_text or '').replace('\n', ' ').split()).strip()

    # Check if the entire transcript has any sentence-ending punctuation
    full_text = ' '.join([normalize_text(get_value(item, 'text', '')) for item in transcript])
    has_punctuation = bool(sentence_end_pattern.search(full_text))

    if not has_punctuation:
        # If no punctuation, split into chunks of about 8-10 words each
        full_text = ' '.join([normalize_text(get_value(item, 'text', '')) for item in transcript])
        words = full_text.split()
        if not words:
            return '', 0

        words_per_chunk = 9  # average 8-10 words
        chunks = []
        for i in range(0, len(words), words_per_chunk):
            chunk = words[i:i + words_per_chunk]
            chunks.append(' '.join(chunk))

        # Calculate total time span
        if transcript:
            start_total = float(get_value(transcript[0], 'start', 0) or 0)
            last_item = transcript[-1]
            end_total = float(get_value(last_item, 'start', 0) or 0) + float(get_value(last_item, 'duration', 0) or 0)
            if end_total <= start_total:
                end_total = start_total + len(chunks) * 2.0  # fallback
        else:
            start_total = 0
            end_total = len(chunks) * 2.0

        duration_per_chunk = (end_total - start_total) / len(chunks) if chunks else 0

        for idx, chunk_text in enumerate(chunks):
            start = start_total + idx * duration_per_chunk
            end = start + duration_per_chunk
            srt_entries.append((start, end, chunk_text))
    else:
        # Original logic for transcripts with punctuation
        processed_items = []

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
            should_finalize = has_sentence_end

            if should_finalize:
                if index + 1 < len(processed_items):
                    next_start = float(processed_items[index + 1].get('start', start) or start)
                    effective_end = next_start
                else:
                    effective_end = last_end or (start + max(duration, 2.0))
                finalize_entry(effective_end)

        if current_text:
            effective_end = last_end or ((current_start or 0) + 2.0)
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
