import { requireAuth } from '../../lib/authMiddleware';
import { UserProgress } from '../../lib/models/UserProgress';
import connectDB from '../../lib/mongodb';

async function handler(req, res) {
  await connectDB();
  
  if (req.method === 'POST') {
    try {
      const { lessonId, mode, progress } = req.body;
      
      // Find existing progress or create new one
      let userProgress = await UserProgress.findOne({ 
        userId: req.user._id, 
        lessonId, 
        mode 
      });
      
      if (userProgress) {
        // Update existing progress
        userProgress.progress = progress;
        await userProgress.save(); // This triggers pre-save middleware
      } else {
        // Create new progress
        userProgress = new UserProgress({
          userId: req.user._id,
          lessonId,
          mode,
          progress
        });
        await userProgress.save(); // This triggers pre-save middleware
      }
      
      return res.status(200).json({ 
        message: 'Lưu tiến trình thành công',
        completionPercent: userProgress.completionPercent 
      });
    } catch (error) {
      console.error('Save progress error:', error);
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
