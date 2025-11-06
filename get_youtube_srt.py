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

        # Try to find manually created transcript first, then generated
        transcript = None

        # Try manually created transcripts in German first
        try:
            transcript = transcript_list.find_manually_created_transcript(['de'])
        except:
            pass

        # If no manually created German, try generated transcripts in German
        if not transcript:
            try:
                transcript = transcript_list.find_generated_transcript(['de'])
            except:
                pass

        # If no German, try other languages
        if not transcript:
            try:
                transcript = transcript_list.find_manually_created_transcript(['en', 'es', 'fr', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'])
            except:
                pass

        if not transcript:
            try:
                transcript = transcript_list.find_generated_transcript(['en', 'es', 'fr', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'])
            except:
                pass

        # If still no transcript, try to fetch any available transcript
        if not transcript and len(transcript_list) > 0:
            transcript = transcript_list[0]

        # Fetch the actual transcript data
        if transcript:
            return transcript.fetch()

        return None
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        return None

def convert_to_srt(transcript):
    # Pattern to detect sentence endings
    sentence_end_pattern = re.compile(r'[.!?…]+["\'\)\]]*\s*$')
    
    # Format time helper
    def format_time(seconds):
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        ms = int((seconds % 1) * 1000)
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{ms:03d}"
    
    def normalize_text(text):
        return ' '.join((text or '').replace('\n', ' ').split()).strip()
    
    # Merge settings
    MIN_WORDS = 6  # Minimum words before considering sentence end
    MAX_WORDS = 16  # Maximum words before forcing split
    START_LEAD_SECONDS = 0.22  # Show subtitle a bit earlier to catch the first phoneme
    END_TRIM_SECONDS = 0.22  # Trim the tail so the next cue is not blocked
    MIN_GAP_SECONDS = 0.0  # Allow back-to-back cues when we already trim the previous tail
    MIN_DURATION_SECONDS = 0.35  # Keep each subtitle shown long enough to read
    
    # First pass: collect all items with their timing
    all_items = []
    for item in transcript:
        start = item.start
        duration = item.duration
        end = start + duration
        text = normalize_text(item.text)
        
        if not text:
            continue
        
        all_items.append({'start': start, 'end': end, 'text': text})
    
    # Second pass: merge items and build entries
    merged_entries = []
    current_group = []
    current_texts = []
    
    for idx, item in enumerate(all_items):
        # Add to current group
        current_group.append(item)
        current_texts.append(item['text'])
        
        # Check combined text
        combined_text = ' '.join(current_texts)
        word_count = len(combined_text.split())
        has_sentence_end = bool(sentence_end_pattern.search(item['text']))
        
        # Decide if we should finalize this group
        should_finalize = False
        
        if word_count >= MAX_WORDS:
            # Force split if too long
            should_finalize = True
        elif has_sentence_end and word_count >= MIN_WORDS:
            # Split at sentence end if long enough
            should_finalize = True
        
        if should_finalize:
            # Use start from first item, end adjusted to next item's start
            entry_start = current_group[0]['start']
            
            # If there's a next item, use its start as our end
            if idx + 1 < len(all_items):
                next_start = all_items[idx + 1]['start']
                entry_end = min(current_group[-1]['end'], next_start)
            else:
                entry_end = current_group[-1]['end']
            
            entry_text = combined_text
            
            merged_entries.append({
                'start': entry_start,
                'end': entry_end,
                'text': entry_text
            })
            
            # Reset for next group
            current_group = []
            current_texts = []
    
    # Don't forget remaining items
    if current_group:
        entry_start = current_group[0]['start']
        entry_end = current_group[-1]['end']
        entry_text = ' '.join(current_texts)
        merged_entries.append({
            'start': entry_start,
            'end': entry_end,
            'text': entry_text
        })

    # Timing adjustments to improve readability and alignment
    adjusted_entries = []
    previous_end = 0.0
    for idx, entry in enumerate(merged_entries):
        raw_start = entry['start']
        raw_end = entry['end']

        # Ensure ordering
        if raw_end < raw_start:
            raw_end = raw_start

        # Lead in slightly but never after the transcript start or overlapping the previous subtitle
        lead_in_start = max(0.0, raw_start - START_LEAD_SECONDS)
        adjusted_start = max(lead_in_start, previous_end + MIN_GAP_SECONDS)
        adjusted_start = min(adjusted_start, raw_start)

        # Make sure we have at least some display time
        if raw_end - adjusted_start < 0.01:
            adjusted_start = raw_start

        # Trim a bit off the end if possible to avoid lingering text
        adjusted_end = raw_end
        available_duration = raw_end - adjusted_start
        if idx != len(merged_entries) - 1 and available_duration > END_TRIM_SECONDS + 0.05:
            adjusted_end = raw_end - END_TRIM_SECONDS

        # Guarantee a readable duration without exceeding the raw end
        if adjusted_end - adjusted_start < MIN_DURATION_SECONDS:
            if available_duration >= MIN_DURATION_SECONDS:
                adjusted_end = min(raw_end, adjusted_start + MIN_DURATION_SECONDS)
            else:
                adjusted_end = raw_end

        # Fall back to raw end if we trimmed too aggressively
        if adjusted_end <= adjusted_start:
            adjusted_end = raw_end

        adjusted_entries.append({
            'start': adjusted_start,
            'end': adjusted_end,
            'text': entry['text']
        })
        previous_end = adjusted_end

    merged_entries = adjusted_entries
    
    # Build SRT output
    srt = ''
    for i, entry in enumerate(merged_entries, 1):
        srt += f"{i}\n"
        srt += f"{format_time(entry['start'])} --> {format_time(entry['end'])}\n"
        srt += f"{entry['text']}\n\n"
    
    return srt.strip(), len(merged_entries)

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
        sys.exit(1)
