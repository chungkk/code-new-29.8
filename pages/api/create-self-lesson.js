import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { requireAuth } from '../../lib/authMiddleware';
import { Lesson } from '../../lib/models/Lesson';
import connectDB from '../../lib/mongodb';

function parseSRTTime(timeString) {
  const [hours, minutes, secondsAndMs] = timeString.split(':');
  const [seconds, milliseconds] = secondsAndMs.split(',');
  
  return (
    parseInt(hours) * 3600 +
    parseInt(minutes) * 60 +
    parseInt(seconds) +
    parseInt(milliseconds) / 1000
  );
}

function convertSRTtoJSON(srtText) {
  const lines = srtText.trim().split('\n');
  const result = [];
  let i = 0;

  while (i < lines.length) {
    if (lines[i].trim() === '') {
      i++;
      continue;
    }

    const indexLine = lines[i].trim();
    if (!/^\d+$/.test(indexLine)) {
      i++;
      continue;
    }

    i++;
    if (i >= lines.length) break;

    const timeLine = lines[i].trim();
    const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);
    
    if (!timeMatch) {
      i++;
      continue;
    }

    const start = parseSRTTime(timeMatch[1]);
    const end = parseSRTTime(timeMatch[2]);

    i++;
    let text = '';
    while (i < lines.length && lines[i].trim() !== '' && !/^\d+$/.test(lines[i].trim())) {
      if (text) text += ' ';
      text += lines[i].trim();
      i++;
    }

    if (text) {
      result.push({
        text: text,
        start: start,
        end: end
      });
    }
  }

  return result;
}

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

    // Call Python script to get transcript
    const scriptPath = path.join(process.cwd(), 'get_youtube_srt.py');
    const venvPath = path.join(process.cwd(), 'venv', 'bin', 'python');

    const pythonProcess = spawn(venvPath, [scriptPath, videoId], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    await new Promise((resolve, reject) => {
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(stderr || 'Python script failed'));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(error);
      });
    });

    // Parse JSON output from Python script
    let result;
    try {
      result = JSON.parse(stdout.trim());
    } catch (parseError) {
      throw new Error('Invalid JSON output from Python script: ' + stdout);
    }

    if (!result.success) {
      return res.status(404).json({
        message: 'Video này không có phụ đề khả dụng. Vui lòng chọn video có phụ đề tự động (CC) hoặc thủ công. Bạn cũng có thể tải SRT từ YouTube thủ công.'
      });
    }

    // Convert SRT to JSON
    const jsonData = convertSRTtoJSON(result.srt);

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