#!/usr/bin/env python3
import sys
import json
from youtube_transcript_api import YouTubeTranscriptApi

def get_transcript(video_id):
    try:
        api = YouTubeTranscriptApi()

        # First, list available transcripts
        transcript_list = api.list(video_id)

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
    srt = ''
    group_size = 3  # Ghép mỗi 3 item thành một entry để tạo câu dài hơn

    for i in range(0, len(transcript), group_size):
        group = transcript[i:i + group_size]
        start = group[0].start
        text = ' '.join(item.text for item in group)

        # Set end to the start of the next group, or start + duration of last item if last group
        if i + group_size < len(transcript):
            end = transcript[i + group_size].start
        else:
            end = group[-1].start + group[-1].duration

        # Format time
        def format_time(seconds):
            hours = int(seconds // 3600)
            minutes = int((seconds % 3600) // 60)
            secs = int(seconds % 60)
            ms = int((seconds % 1) * 1000)
            return f"{hours:02d}:{minutes:02d}:{secs:02d},{ms:03d}"

        srt += f"{(i // group_size) + 1}\n"
        srt += f"{format_time(start)} --> {format_time(end)}\n"
        srt += f"{text}\n\n"

    return srt.strip()

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python get_youtube_srt.py <video_id>", file=sys.stderr)
        sys.exit(1)

    video_id = sys.argv[1]
    transcript = get_transcript(video_id)

    if transcript:
        srt_text = convert_to_srt(transcript)
        group_size = 3
        item_count = (len(transcript) + group_size - 1) // group_size
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
        print(json.dumps(result), file=sys.stderr)
        sys.exit(1)