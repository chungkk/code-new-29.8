import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { Lesson } from '../../lib/models/Lesson';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (req.method === 'GET') {
    try {
      const lessons = await Lesson.findAll();
      return res.status(200).json(lessons);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  if (!session || session.user.role !== 'admin') {
    return res.status(403).json({ message: 'Chỉ admin mới có quyền thực hiện thao tác này' });
  }

  if (req.method === 'POST') {
    try {
      const lesson = await Lesson.create(req.body);
      return res.status(201).json(lesson);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id, ...updateData } = req.body;
      await Lesson.update(id, updateData);
      return res.status(200).json({ message: 'Cập nhật thành công' });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      await Lesson.delete(id);
      return res.status(200).json({ message: 'Xóa thành công' });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
