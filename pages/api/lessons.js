import { requireAdmin } from '../../lib/authMiddleware';
import { Lesson } from '../../lib/models/Lesson';
import connectDB from '../../lib/mongodb';

export default async function handler(req, res) {
  await connectDB();
  
  if (req.method === 'GET') {
    try {
      const lessons = await Lesson.find().sort({ order: 1 });
      return res.status(200).json(lessons);
    } catch (error) {
      console.error('Get lessons error:', error);
      return res.status(500).json({ message: error.message });
    }
  }

  return requireAdmin(adminHandler)(req, res);
}

async function adminHandler(req, res) {

  if (req.method === 'POST') {
    try {
      const lesson = new Lesson(req.body);
      await lesson.save();
      return res.status(201).json(lesson);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id, ...updateData } = req.body;
      await Lesson.findByIdAndUpdate(id, updateData);
      return res.status(200).json({ message: 'Cập nhật thành công' });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      await Lesson.findByIdAndDelete(id);
      return res.status(200).json({ message: 'Xóa thành công' });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
