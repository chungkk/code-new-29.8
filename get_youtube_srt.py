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
                entry_end = all_items[idx + 1]['start']
            else:
                # Last entry, use the actual end time
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