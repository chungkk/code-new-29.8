import { spawn } from 'child_process';
import path from 'path';
import { verifyToken } from '../../lib/jwt';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token không hợp lệ' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return res.status(401).json({ message: 'Không có quyền truy cập' });
    }

    const { youtubeUrl, punctuationType = 'with' } = req.body;

    if (!youtubeUrl) {
      return res.status(400).json({ message: 'Thiếu YouTube URL' });
    }

    if (!['with', 'without'].includes(punctuationType)) {
      return res.status(400).json({ message: 'Loại SRT không hợp lệ. Sử dụng "with" hoặc "without"' });
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

    const pythonProcess = spawn(venvPath, [scriptPath, videoId, punctuationType], {
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

    return res.status(200).json({
      success: true,
      srt: result.srt,
      itemCount: result.itemCount,
      message: 'SRT đã được tải thành công từ YouTube!'
    });

  } catch (error) {
    console.error('Get YouTube SRT error:', error);
    return res.status(500).json({ message: 'Lỗi lấy SRT từ YouTube: ' + error.message });
  }
}