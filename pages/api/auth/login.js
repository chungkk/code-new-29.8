import connectDB from '../../../lib/mongodb';
import User from '../../../models/User';
import { generateToken } from '../../../lib/jwt';
import { createWelcomeBackNotification } from '../../../lib/helpers/notifications';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectDB();

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email và mật khẩu là bắt buộc' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    if (user.isGoogleUser && !user.password) {
      return res.status(400).json({ message: 'Tài khoản này đăng ký bằng Google, vui lòng chọn đăng nhập với Google' });
    }

    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    // Check daily login bonus
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastLogin = user.lastLoginDate ? new Date(user.lastLoginDate) : null;
    
    let dailyBonusAwarded = false;
    
    if (lastLogin) {
      const lastLoginDay = new Date(
        lastLogin.getFullYear(),
        lastLogin.getMonth(),
        lastLogin.getDate()
      );

      // If last login was not today, award daily bonus
      if (lastLoginDay.getTime() !== today.getTime()) {
        user.points = (user.points || 0) + 1;
        user.lastLoginDate = now;
        await user.save();
        dailyBonusAwarded = true;

        // Create welcome back notification
        createWelcomeBackNotification(user._id.toString(), user.name);
      }
    } else {
      // First login ever
      user.points = (user.points || 0) + 1;
      user.lastLoginDate = now;
      await user.save();
      dailyBonusAwarded = true;
    }

    const token = generateToken({
      userId: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      nativeLanguage: user.nativeLanguage,
      level: user.level
    });

    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        nativeLanguage: user.nativeLanguage,
        level: user.level,
        points: user.points || 0
      },
      dailyBonusAwarded
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
}
