import { useQuery } from '@tanstack/react-query';
import { getAllTopics } from '@/api/WorkspaceAPI';

const TOPICS_QUERY_KEY = ['topics-for-create'];

export function useTopicsForCreate(enabled = false) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: TOPICS_QUERY_KEY,
    queryFn: async () => {
      const res = await getAllTopics(0, 100);
      return res.data?.content || [];
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 phút - topics ít thay đổi
  });

  return {
    topics: data || [],
    topicsLoading: isLoading,
    fetchTopics: refetch,
  };
}
