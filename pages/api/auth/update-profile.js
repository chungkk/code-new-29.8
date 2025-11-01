import connectDB from '../../../lib/mongodb';
import User from '../../../models/User';
import { verifyToken } from '../../../lib/jwt';

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token không hợp lệ' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ message: 'Token không hợp lệ' });
    }

    await connectDB();

    const { nativeLanguage } = req.body;

    if (!nativeLanguage) {
      return res.status(400).json({ message: 'Native language là bắt buộc' });
    }

    // Validate language code
    const validLanguages = ['vi', 'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'];
    if (!validLanguages.includes(nativeLanguage)) {
      return res.status(400).json({ message: 'Ngôn ngữ không hợp lệ' });
    }

    const user = await User.findByIdAndUpdate(
      decoded.userId,
      { nativeLanguage },
      { new: true, select: '-password' }
    );

    if (!user) {
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }

    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        nativeLanguage: user.nativeLanguage
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
}