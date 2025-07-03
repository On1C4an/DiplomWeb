import { useMutation, useQueryClient } from '@tanstack/react-query';
import { InferRequestType, InferResponseType } from 'hono';
import { toast } from 'sonner';

import { client } from '@/lib/hono';

type ResponseType = InferResponseType<(typeof client.api.tasks)[':taskId']['$patch'], 200>;
type RequestType = InferRequestType<(typeof client.api.tasks)[':taskId']['$patch']>;

export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json, param }) => {
      const response = await client.api.tasks[':taskId']['$patch']({ json, param });

      if (!response.ok) {
        throw response; // Бросаем сам объект Response
      }

      return await response.json();
    },
    onSuccess: ({ data }) => {
      toast.success('Задача обновлена.');

      queryClient.invalidateQueries({
        queryKey: ['workspace-analytics', data.workspaceId],
        exact: true,
      });
      queryClient.invalidateQueries({
        queryKey: ['project-analytics', data.projectId],
        exact: true,
      });
      queryClient.invalidateQueries({
        queryKey: ['tasks', data.workspaceId],
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: ['task', data.$id],
        exact: true,
      });
    },
    onError: async (error) => {
      console.error('[UPDATE_TASK]: ', error);

      let errorMessage = 'Не удалось обновить задачу.';

      if (error instanceof Response) { 
        try {
          const errorBody = await error.json();
          if (errorBody && errorBody.error) {
            errorMessage = errorBody.error;
          }
        } catch (e) {
          console.error('Failed to parse error response:', e);
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    },
  });

  return mutation;
};
