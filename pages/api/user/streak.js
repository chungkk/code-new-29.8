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
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      let weeklyProgress = user.streak?.weeklyProgress || [false, false, false, false, false, false, false];
      const lastActivityDate = user.streak?.lastActivityDate;
      
      // If there's a streak and last activity was today, ensure today is marked in weeklyProgress
      if (user.streak?.currentStreak > 0 && lastActivityDate) {
        const lastActivity = new Date(lastActivityDate);
        const lastActivityDay = new Date(
          lastActivity.getFullYear(),
          lastActivity.getMonth(),
          lastActivity.getDate()
        );
        
        // If last activity was today, mark today in weeklyProgress
        if (lastActivityDay.getTime() === today.getTime()) {
          const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
          const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to Monday = 0, Sunday = 6
          weeklyProgress = [...weeklyProgress];
          weeklyProgress[adjustedDay] = true;
        }
      }
      
      const streakData = {
        currentStreak: user.streak?.currentStreak || 0,
        weeklyProgress: weeklyProgress,
        lastActivityDate: lastActivityDate || null
      };

      return res.status(200).json({
        success: true,
        ...streakData
      });
    }

    if (req.method === 'POST') {
      // Update streak (increment or reset)
      const { action } = req.body; // 'increment' or 'reset'
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

      if (action === 'reset') {
        // Reset streak when user makes a mistake
        user.streak.currentStreak = 0;

        // Clear today's check-in from weekly progress when resetting
        const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to Monday = 0, Sunday = 6
        user.streak.weeklyProgress[adjustedDay] = false;

        console.log('Streak reset to 0 due to mistake, cleared today from weekly progress');

        // Save and return immediately - don't update lastActivityDate when resetting
        await user.save();

        return res.status(200).json({
          success: true,
          currentStreak: user.streak.currentStreak,
          weeklyProgress: user.streak.weeklyProgress,
          lastActivityDate: user.streak.lastActivityDate
        });
      } else {
        // Increment streak (default action)
        user.streak.currentStreak += 1;
        console.log('Streak incremented to:', user.streak.currentStreak);
      }

      // Update weekly progress (mark today as active)
      const lastActivity = user.streak.lastActivityDate
        ? new Date(user.streak.lastActivityDate)
        : null;

      if (lastActivity) {
        const lastActivityDay = new Date(
          lastActivity.getFullYear(),
          lastActivity.getMonth(),
          lastActivity.getDate()
        );

        // Check if it's a different day
        if (lastActivityDay.getTime() !== today.getTime()) {
          const daysDifference = Math.floor((today - lastActivityDay) / (1000 * 60 * 60 * 24));

          if (daysDifference > 1) {
            // Multiple days gap - reset weekly progress
            user.streak.weeklyProgress = [false, false, false, false, false, false, false];
          }
        }
      }

      // Only mark today in weekly progress when achieving FIRST streak of the day
      // This is the "check-in" - you must complete 2 sentences to check in
      if (user.streak.currentStreak === 1) {
        const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to Monday = 0, Sunday = 6
        user.streak.weeklyProgress[adjustedDay] = true;
        console.log('✓ Check-in marked for day:', adjustedDay);

        // If we've completed the week and it's Sunday, reset for new week
        if (dayOfWeek === 0 && user.streak.weeklyProgress.every(day => day)) {
          user.streak.weeklyProgress = [false, false, false, false, false, false, true]; // Only Sunday is marked
        }
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
