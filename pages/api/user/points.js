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
      // Get user's points
      return res.status(200).json({
        success: true,
        points: user.points || 0
      });
    }

    if (req.method === 'POST') {
      // Update points (add or subtract)
      const { pointsChange, reason } = req.body;

      if (typeof pointsChange !== 'number') {
        return res.status(400).json({ message: 'pointsChange phải là số' });
      }

      // Calculate new points, ensuring it doesn't go below 0
      const currentPoints = user.points || 0;
      const newPoints = Math.max(0, currentPoints + pointsChange);
      user.points = newPoints;

      await user.save();

      console.log(`Points updated for user ${user.email}: ${pointsChange} (reason: ${reason || 'N/A'})`);

      return res.status(200).json({
        success: true,
        points: user.points,
        pointsChange
      });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Points API error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
}
