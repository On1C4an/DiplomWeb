import { useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from '@/lib/hono';

export const useAddComment = (taskId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (text: string) => {
      const response = await client.api.tasks[':taskId'].comments.$post({
        param: { taskId },
        json: { text, type: 'user' },
      });
      if (!response.ok) throw new Error('Failed to add comment');
      const { data } = await response.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
    },
  });
}; 