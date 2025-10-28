import { OpenAI } from 'openai';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Parse the form data
    const form = formidable({
      uploadDir: path.join(process.cwd(), 'public/audio'),
      keepExtensions: true,
      maxFileSize: 25 * 1024 * 1024, // 25MB limit
    });

    const [fields, files] = await form.parse(req);

    if (!files.audio || !files.audio[0]) {
      return res.status(400).json({ message: 'No audio file provided' });
    }

    const audioFile = files.audio[0];
    const filePath = audioFile.filepath;

    // Transcribe using OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: 'whisper-1',
      language: 'de', // German language
      response_format: 'srt', // Get SRT format directly
    });

    // Clean up the uploaded file
    fs.unlinkSync(filePath);

    res.status(200).json({
      srt: transcription,
    });
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({
      message: 'Failed to transcribe audio',
      error: error.message
    });
  }
}