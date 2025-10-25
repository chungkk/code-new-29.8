import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { verifyToken } from '../../lib/jwt';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token không hợp lệ' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ message: 'Token không hợp lệ' });
    }

    // Parse form data
    const form = formidable({
      maxFileSize: 50 * 1024 * 1024, // 50MB
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);
    
    const file = files.file?.[0];
    const type = fields.type?.[0];

    if (!file) {
      return res.status(400).json({ message: 'Không có file được upload' });
    }

    // Determine target directory based on type
    let targetDir;
    let urlPrefix;
    
    if (type === 'audio') {
      targetDir = path.join(process.cwd(), 'public', 'audio');
      urlPrefix = '/audio';
    } else if (type === 'json') {
      targetDir = path.join(process.cwd(), 'public', 'text');
      urlPrefix = '/text';
    } else {
      return res.status(400).json({ message: 'Type không hợp lệ (audio hoặc json)' });
    }

    // Create directory if not exists
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Generate unique filename
    const originalName = file.originalFilename || 'file';
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext);
    const timestamp = Date.now();
    const fileName = `${baseName}_${timestamp}${ext}`;
    const targetPath = path.join(targetDir, fileName);

    // Move file to target directory
    fs.copyFileSync(file.filepath, targetPath);
    fs.unlinkSync(file.filepath); // Clean up temp file

    const url = `${urlPrefix}/${fileName}`;

    return res.status(200).json({
      success: true,
      url,
      fileName,
      size: file.size
    });

  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ message: 'Lỗi upload file' });
  }
}
