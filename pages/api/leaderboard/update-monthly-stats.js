import connectDB from '../../../lib/mongodb';
import MonthlyLeaderboard from '../../../lib/models/MonthlyLeaderboard';
import { verifyToken } from '../../../lib/jwt';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token không hợp lệ' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    await connectDB();

    const {
      pointsChange = 0,
      timeSpent = 0, // in seconds
      sentencesCompleted = 0,
      lessonsCompleted = 0
    } = req.body;

    // Get current year and month
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // Update or create monthly stats
    const monthlyStats = await MonthlyLeaderboard.findOneAndUpdate(
      {
        userId: decoded.userId,
        year,
        month
      },
      {
        $inc: {
          monthlyPoints: pointsChange,
          totalTimeSpent: timeSpent,
          sentencesCompleted: sentencesCompleted,
          lessonsCompleted: lessonsCompleted
        },
        $set: {
          lastUpdated: new Date()
        }
      },
      {
        upsert: true, // Create if doesn't exist
        new: true // Return updated document
      }
    );

    res.status(200).json({
      success: true,
      data: {
        monthlyPoints: monthlyStats.monthlyPoints,
        totalTimeSpent: monthlyStats.totalTimeSpent,
        sentencesCompleted: monthlyStats.sentencesCompleted,
        lessonsCompleted: monthlyStats.lessonsCompleted
      },
      message: 'Cập nhật thống kê tháng thành công'
    });
  } catch (error) {
    console.error('Update monthly stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật thống kê tháng',
      error: error.message
    });
  }
}
