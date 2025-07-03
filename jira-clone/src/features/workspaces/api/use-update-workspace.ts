import { useMutation, useQueryClient } from '@tanstack/react-query';
import { InferRequestType, InferResponseType } from 'hono';
import { toast } from 'sonner';

import { client } from '@/lib/hono';

type ResponseType = InferResponseType<(typeof client.api.workspaces)[':workspaceId']['$patch'], 200>;
type RequestType = InferRequestType<(typeof client.api.workspaces)[':workspaceId']['$patch']>;

export const useUpdateWorkspace = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ form, param }) => {
      const response = await client.api.workspaces[':workspaceId']['$patch']({ form, param });

      if (!response.ok) throw new Error('Failed to update workspace.');

      return await response.json();
    },
    onSuccess: ({ data }) => {
      toast.success('Рабочее пространство обновлено.');

      queryClient.invalidateQueries({
        queryKey: ['workspaces'],
      });
      queryClient.invalidateQueries({
        queryKey: ['workspace', data.$id],
        exact: true,
      });
    },
    onError: (error) => {
      console.error('[UPDATE_WORKSPACE]: ', error);

      toast.error('Не удалось обновить рабочее пространство.');
    },
  });

  return mutation;
};
