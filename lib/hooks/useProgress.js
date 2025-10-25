import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

export function useProgress(lessonId, mode) {
  const { data: session } = useSession();
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProgress = useCallback(async () => {
    try {
      const res = await fetch(`/api/progress?lessonId=${lessonId}&mode=${mode}`);
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
    if (session && lessonId && mode) {
      loadProgress();
    }
  }, [session, lessonId, mode, loadProgress]);

  const saveProgress = async (progressData) => {
    if (!session) return;

    try {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
