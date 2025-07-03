import { useMutation, useQueryClient } from '@tanstack/react-query';
import { InferRequestType, InferResponseType } from 'hono';
import { toast } from 'sonner';

import { client } from '@/lib/hono';

type ResponseType = InferResponseType<(typeof client.api.workspaces)[':workspaceId']['join']['$post'], 200>;
type RequestType = InferRequestType<(typeof client.api.workspaces)[':workspaceId']['join']['$post']>;

export const useJoinWorkspace = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ param, json }) => {
      const response = await client.api.workspaces[':workspaceId']['join']['$post']({ param, json });

      if (!response.ok) throw new Error('Failed to join workspace.');

      return await response.json();
    },
    onSuccess: ({ data }) => {
      toast.success('Вы присоединились к рабочему пространству.');

      queryClient.invalidateQueries({
        queryKey: ['workspaces'],
      });
      queryClient.invalidateQueries({
        queryKey: ['workspace', data.$id],
        exact: true,
      });
    },
    onError: (error) => {
      console.error('[JOIN_WORKSPACE]: ', error);

      let errorMessage = 'Вы уже присоединились к данному рабочему пространству.';
      if (error instanceof Error && error.message.includes('Already a member')) {
        errorMessage = 'Вы уже присоединились к данному рабочему пространству.';
      }
      toast.error(errorMessage);
    },
  });

  return mutation;
};
