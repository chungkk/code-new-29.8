import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { UserProgress } from '../../lib/models/UserProgress';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ message: 'Vui lòng đăng nhập' });
  }

  if (req.method === 'POST') {
    try {
      const { lessonId, mode, progress } = req.body;
      await UserProgress.saveProgress({
        userId: session.user.id,
        lessonId,
        mode,
        progress
      });
      return res.status(200).json({ message: 'Lưu tiến trình thành công' });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }

  if (req.method === 'GET') {
    try {
      const { lessonId, mode } = req.query;
      
      if (lessonId && mode) {
        const progress = await UserProgress.getProgress(session.user.id, lessonId, mode);
        return res.status(200).json(progress || {});
      }
      
      const allProgress = await UserProgress.getAllProgress(session.user.id);
      return res.status(200).json(allProgress);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
