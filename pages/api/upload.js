import { requireAdmin } from '../../lib/authMiddleware';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const uploadDir = path.join(process.cwd(), 'public');
  
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const form = formidable({
    uploadDir,
    keepExtensions: true,
    maxFileSize: 50 * 1024 * 1024, // 50MB
    filename: (name, ext, part) => {
      return `${Date.now()}_${part.originalFilename}`;
    }
  });

  try {
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    const uploadedFiles = {};
    
    if (files.audio && files.audio[0]) {
      const audioFile = files.audio[0];
      const audioDir = path.join(uploadDir, 'audio');
      
      if (!fs.existsSync(audioDir)) {
        fs.mkdirSync(audioDir, { recursive: true });
      }
      
      const audioFileName = `${fields.lessonId?.[0] || Date.now()}${path.extname(audioFile.originalFilename)}`;
      const audioNewPath = path.join(audioDir, audioFileName);
      
      fs.renameSync(audioFile.filepath, audioNewPath);
      uploadedFiles.audio = `/audio/${audioFileName}`;
    }

    if (files.text && files.text[0]) {
      const textFile = files.text[0];
      const textDir = path.join(uploadDir, 'text');
      
      if (!fs.existsSync(textDir)) {
        fs.mkdirSync(textDir, { recursive: true });
      }
      
      const textFileName = `${fields.lessonId?.[0] || Date.now()}${path.extname(textFile.originalFilename)}`;
      const textNewPath = path.join(textDir, textFileName);
      
      fs.renameSync(textFile.filepath, textNewPath);
      uploadedFiles.text = `/text/${textFileName}`;
    }

    return res.status(200).json({
      message: 'Upload thành công',
      files: uploadedFiles
    });

  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ message: 'Lỗi khi upload: ' + error.message });
  }
}

export default requireAdmin(handler);
