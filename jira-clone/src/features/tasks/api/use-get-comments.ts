import { useQuery } from '@tanstack/react-query';
import { client } from '@/lib/hono';

export const useGetComments = (taskId: string) => {
  return useQuery({
    queryKey: ['comments', taskId],
    queryFn: async () => {
      const response = await client.api.tasks[':taskId'].comments.$get({ param: { taskId } });
      if (!response.ok) throw new Error('Failed to fetch comments');
      const { data } = await response.json();
      return data;
    },
  });
}; 