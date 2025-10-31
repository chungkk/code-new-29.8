import { requireAuth } from '../../lib/authMiddleware';
import { Vocabulary } from '../../lib/models/Vocabulary';

async function handler(req, res) {
  const userId = req.user._id.toString();

  if (req.method === 'GET') {
    try {
      const { lessonId } = req.query;

      const query = { userId: req.user._id };
      if (lessonId) {
        query.lessonId = lessonId;
      }

      const vocabulary = await Vocabulary.find(query).sort({ createdAt: -1 });

      return res.status(200).json(vocabulary);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { word, translation, context, lessonId } = req.body;

      if (!word || !translation) {
        return res.status(400).json({ message: 'Word và translation là bắt buộc' });
      }

      await Vocabulary.findOneAndUpdate(
        { userId: req.user._id, word: word.toLowerCase() },
        {
          translation,
          context: context || '',
          lessonId: lessonId || null,
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );

      return res.status(201).json({ message: 'Đã lưu từ vựng' });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      await Vocabulary.findOneAndDelete({ _id: id, userId: req.user._id });
      return res.status(200).json({ message: 'Đã xóa từ vựng' });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id } = req.body;
      await Vocabulary.findOneAndUpdate(
        { _id: id, userId: req.user._id },
        {
          $inc: { reviewCount: 1 },
          lastReviewed: new Date()
        }
      );
      return res.status(200).json({ message: 'Đã cập nhật review' });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

export default requireAuth(handler);
