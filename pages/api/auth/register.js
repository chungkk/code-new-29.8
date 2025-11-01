import connectDB from '../../../lib/mongodb';
import User from '../../../models/User';
import { generateToken } from '../../../lib/jwt';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectDB();

    const { name, email, password, nativeLanguage = 'vi' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Tên, email và mật khẩu là bắt buộc' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Email đã được sử dụng' });
    }

    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      nativeLanguage
    });

    await user.save();

    const token = generateToken({
      userId: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      nativeLanguage: user.nativeLanguage
    });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        nativeLanguage: user.nativeLanguage
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
}