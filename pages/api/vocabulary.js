import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { Vocabulary } from '../../lib/models/Vocabulary';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ message: 'Vui lòng đăng nhập' });
  }

  const userId = session.user.id;

  if (req.method === 'GET') {
    try {
      const { lessonId } = req.query;
      
      const vocabulary = lessonId 
        ? await Vocabulary.getByLesson(userId, lessonId)
        : await Vocabulary.getAll(userId);
      
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

      await Vocabulary.add({
        userId,
        word,
        translation,
        context: context || '',
        lessonId: lessonId || null
      });

      return res.status(201).json({ message: 'Đã lưu từ vựng' });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      await Vocabulary.delete(id, userId);
      return res.status(200).json({ message: 'Đã xóa từ vựng' });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id } = req.body;
      await Vocabulary.updateReview(id, userId);
      return res.status(200).json({ message: 'Đã cập nhật review' });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
