import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchWithAuth } from '../api';

export function useProgress(lessonId, mode) {
  const { user } = useAuth();
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProgress = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`/api/progress?lessonId=${lessonId}&mode=${mode}`);
      if (res.ok) {
        const data = await res.json();
        setProgress(data.progress);
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    } finally {
      setLoading(false);
    }
  }, [lessonId, mode]);

  useEffect(() => {
    if (user && lessonId && mode) {
      loadProgress();
    }
  }, [user, lessonId, mode, loadProgress]);

  const saveProgress = async (progressData) => {
    if (!user) return;

    try {
      await fetchWithAuth('/api/progress', {
        method: 'POST',
        body: JSON.stringify({
          lessonId,
          mode,
          progress: progressData
        })
      });
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  return { progress, loading, saveProgress };
}
