import { useMutation, useQueryClient } from '@tanstack/react-query';
import { InferRequestType } from 'hono';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { client } from '@/lib/hono';

interface ErrorResponse {
  error: string;
}

type RequestType = InferRequestType<(typeof client.api.workspaces)['$post']>;

export const useCreateWorkspace = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  const mutation = useMutation<any, Error, RequestType>({
    mutationFn: async ({ form }) => {
      const response = await client.api.workspaces['$post']({ form });

      if (!response.ok) {
        const errorData = (await response.json()) as ErrorResponse;
        throw new Error(errorData.error || 'Failed to create workspace.');
      }

      return await response.json();
    },
    onSuccess: (response) => {
      toast.success('Рабочее пространство создано.');

      router.push(`/workspaces/${response.data.$id}`);
      queryClient.invalidateQueries({
        queryKey: ['workspaces'],
      });
    },
    onError: (error) => {
      console.error('[CREATE_WORKSPACE]: ', error);

      toast.error('Не удалось создать рабочее пространство.');
    },
  });

  return mutation;
};
