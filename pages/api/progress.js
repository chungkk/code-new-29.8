import { requireAuth } from '../../lib/authMiddleware';
import { UserProgress } from '../../lib/models/UserProgress';

async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { lessonId, mode, progress } = req.body;
      await UserProgress.findOneAndUpdate(
        { userId: req.user._id, lessonId, mode },
        { progress },
        { upsert: true, new: true }
      );
      return res.status(200).json({ message: 'Lưu tiến trình thành công' });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }

  if (req.method === 'GET') {
    try {
      const { lessonId, mode } = req.query;

      if (lessonId && mode) {
        const progressDoc = await UserProgress.findOne({ userId: req.user._id, lessonId, mode });
        return res.status(200).json(progressDoc ? progressDoc.progress : {});
      }

      const allProgress = await UserProgress.find({ userId: req.user._id });
      return res.status(200).json(allProgress);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

export default requireAuth(handler);
