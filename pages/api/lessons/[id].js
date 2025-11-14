import { Lesson } from '../../../lib/models/Lesson';
import connectDB from '../../../lib/mongodb';

export default async function handler(req, res) {
  await connectDB();
  
  if (req.method === 'GET') {
    try {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ message: 'Lesson ID is required' });
      }
      
      // Use lean() for faster queries and select only needed fields
      const lesson = await Lesson.findOne({ id })
        .lean()
        .exec();
      
      if (!lesson) {
        return res.status(404).json({ message: 'Lesson not found' });
      }
      
      // Cache for 10 minutes (lesson data rarely changes)
      // stale-while-revalidate=600 allows serving stale content while fetching fresh data
      res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1800');
      
      return res.status(200).json(lesson);
    } catch (error) {
      console.error('Get lesson error:', error);
      return res.status(500).json({ message: error.message });
    }
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}
