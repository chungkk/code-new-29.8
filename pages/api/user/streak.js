import connectDB from '../../../lib/mongodb';
import User from '../../../models/User';
import { verifyToken } from '../../../lib/jwt';

export default async function handler(req, res) {
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

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }

    if (req.method === 'GET') {
      // Get user's streak data
      const streakData = {
        currentStreak: user.streak?.currentStreak || 0,
        weeklyProgress: user.streak?.weeklyProgress || [false, false, false, false, false, false, false],
        lastActivityDate: user.streak?.lastActivityDate || null
      };

      return res.status(200).json({
        success: true,
        ...streakData
      });
    }

    if (req.method === 'POST') {
      // Update streak (called when user completes an activity)
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      // Initialize streak object if it doesn't exist
      if (!user.streak) {
        user.streak = {
          currentStreak: 0,
          lastActivityDate: null,
          weeklyProgress: [false, false, false, false, false, false, false]
        };
      }

      const lastActivity = user.streak.lastActivityDate 
        ? new Date(user.streak.lastActivityDate)
        : null;

      // Check if this is the first activity today
      if (lastActivity) {
        const lastActivityDay = new Date(
          lastActivity.getFullYear(), 
          lastActivity.getMonth(), 
          lastActivity.getDate()
        );
        
        // If already logged activity today, just return current data
        if (lastActivityDay.getTime() === today.getTime()) {
          return res.status(200).json({
            success: true,
            currentStreak: user.streak.currentStreak,
            weeklyProgress: user.streak.weeklyProgress,
            lastActivityDate: user.streak.lastActivityDate,
            alreadyLoggedToday: true
          });
        }

        // Check if streak is broken (more than 1 day gap)
        const daysDifference = Math.floor((today - lastActivityDay) / (1000 * 60 * 60 * 24));
        
        if (daysDifference > 1) {
          // Streak broken, reset to 1
          user.streak.currentStreak = 1;
          user.streak.weeklyProgress = [false, false, false, false, false, false, false];
        } else if (daysDifference === 1) {
          // Continue streak
          user.streak.currentStreak += 1;
        }
      } else {
        // First time logging activity
        user.streak.currentStreak = 1;
      }

      // Update weekly progress
      const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to Monday = 0, Sunday = 6
      user.streak.weeklyProgress[adjustedDay] = true;

      // If we've completed the week and it's Sunday, reset for new week
      if (dayOfWeek === 0 && user.streak.weeklyProgress.every(day => day)) {
        user.streak.weeklyProgress = [false, false, false, false, false, false, true]; // Only Sunday is marked
      }

      user.streak.lastActivityDate = now;

      await user.save();

      return res.status(200).json({
        success: true,
        currentStreak: user.streak.currentStreak,
        weeklyProgress: user.streak.weeklyProgress,
        lastActivityDate: user.streak.lastActivityDate
      });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Streak API error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
}
