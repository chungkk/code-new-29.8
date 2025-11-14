/**
 * Create Self Lesson API - Pure JavaScript implementation
 * Sử dụng youtubei.js để lấy transcript từ YouTube
 * Không cần Python dependency
 */

import path from 'path';
import fs from 'fs';
import { Innertube } from 'youtubei.js';
import { requireAuth } from '../../lib/authMiddleware';
import { Lesson } from '../../lib/models/Lesson';
import connectDB from '../../lib/mongodb';

async function handler(req, res) {
  await connectDB();

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { youtubeUrl } = req.body;

    if (!youtubeUrl) {
      return res.status(400).json({ message: 'Thiếu YouTube URL' });
    }

    // Extract video ID from YouTube URL
    const videoIdMatch = youtubeUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (!videoIdMatch) {
      return res.status(400).json({ message: 'URL YouTube không hợp lệ' });
    }

    const videoId = videoIdMatch[1];

    // Get transcript using youtubei.js
    const youtube = await Innertube.create();
    const info = await youtube.getInfo(videoId);
    const transcriptData = await info.getTranscript();

    if (!transcriptData || !transcriptData.transcript) {
      return res.status(404).json({
        message: 'Video này không có phụ đề khả dụng. Vui lòng chọn video có phụ đề tự động (CC) hoặc thủ công.'
      });
    }

    const segments = transcriptData.transcript.content?.body?.initial_segments || [];

    if (segments.length === 0) {
      return res.status(404).json({
        message: 'Không tìm thấy nội dung phụ đề trong video này.'
      });
    }

    // Convert segments to JSON format (same as SRT but already in JSON)
    const jsonData = segments
      .filter(seg => {
        // snippet is an object with .text property or .toString() method
        const text = typeof seg.snippet === 'string'
          ? seg.snippet
          : (seg.snippet?.text || seg.snippet?.toString?.() || '');
        return text && text.trim();
      })
      .map(seg => {
        // Normalize snippet to string
        const snippet = typeof seg.snippet === 'string'
          ? seg.snippet
          : (seg.snippet?.text || seg.snippet?.toString?.() || '');
        return {
          text: snippet.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim(),
          start: seg.start_ms / 1000, // Convert to seconds
          end: seg.end_ms / 1000 // Convert to seconds
        };
      });

    if (jsonData.length === 0) {
      return res.status(400).json({ message: 'Không thể parse SRT text.' });
    }

    // Save JSON to file
    const targetDir = path.join(process.cwd(), 'public', 'text');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const timestamp = Date.now();
    const lessonId = `self_${timestamp}`;
    const fileName = `${lessonId}.json`;
    const targetPath = path.join(targetDir, fileName);

    fs.writeFileSync(targetPath, JSON.stringify(jsonData, null, 4), 'utf8');

    // Create lesson
    const lessonData = {
      id: lessonId,
      title: `Self-created Lesson ${timestamp}`,
      displayTitle: `Self-created Lesson ${timestamp}`,
      description: 'Lesson created from YouTube video',
      level: 'A1', // Default
      audio: youtubeUrl, // Use YouTube URL as audio source
      youtubeUrl: youtubeUrl,
      json: `/text/${fileName}`,
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`, // YouTube thumbnail
    };

    // Do not save to database, return lesson data for temporary use
    const lesson = lessonData; // Just the data object

    return res.status(200).json({
      success: true,
      lesson: lesson,
      message: 'Lesson data generated successfully'
    });

  } catch (error) {
    console.error('Create self lesson error:', error);
    return res.status(500).json({ message: 'Lỗi tạo lesson: ' + error.message });
  }
}

export default requireAuth(handler);