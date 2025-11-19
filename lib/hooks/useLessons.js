import useSWR from 'swr';

const fetcher = (url) => fetch(url).then((res) => res.json());

export function useLessons({ page = 1, limit = 15, difficulty = 'all' } = {}) {
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString()
  });

  if (difficulty && difficulty !== 'all') {
    queryParams.set('difficulty', difficulty);
  }

  const { data, error, isLoading, mutate } = useSWR(
    `/api/lessons?${queryParams.toString()}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000, // Dedupe requests within 10s
      keepPreviousData: true, // Keep previous data while loading new page
    }
  );

  return {
    lessons: data?.lessons || [],
    totalPages: data?.totalPages || 1,
    total: data?.total || 0,
    isLoading,
    isError: error,
    mutate
  };
}

export function useLesson(lessonId) {
  const { data, error, isLoading, mutate } = useSWR(
    lessonId ? `/api/lessons/${lessonId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Lesson data rarely changes, cache for 1 min
    }
  );

  return {
    lesson: data,
    isLoading,
    isError: error,
    mutate
  };
}

// Prefetch next page for better UX
export function prefetchLessons({ page, limit = 15, difficulty = 'all' }) {
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString()
  });

  if (difficulty && difficulty !== 'all') {
    queryParams.set('difficulty', difficulty);
  }

  // This will prefetch and cache the data
  if (typeof window !== 'undefined') {
    fetch(`/api/lessons?${queryParams.toString()}`)
      .then(res => res.json())
      .catch(err => console.error('Prefetch error:', err));
  }
}
