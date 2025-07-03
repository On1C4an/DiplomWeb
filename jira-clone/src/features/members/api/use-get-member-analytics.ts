import { useQuery } from '@tanstack/react-query';
import { InferResponseType } from 'hono';

import { client } from '@/lib/hono';

interface UseGetMemberAnalyticsProps {
  memberId: string;
  // Возможно, workspaceId тоже нужен в API, зависит от бэкенда
  workspaceId: string;
}

// Предполагаемая структура ответа API для аналитики участника
export type MemberAnalyticsResponseType = InferResponseType<(typeof client.api.members)[':memberId']['analytics']['$get'], 200>;

export const useGetMemberAnalytics = ({ memberId, workspaceId }: UseGetMemberAnalyticsProps) => {
  const query = useQuery({
    queryKey: ['member-analytics', memberId, workspaceId],
    queryFn: async () => {
      // В реальном приложении здесь будет вызов вашего бэкенд API
      // Пример вызова (может отличаться в зависимости от вашей реализации Hono):
      const response = await client.api.members[':memberId'].analytics.$get({
        param: { memberId },
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: 'Unknown error' }));
        // Убедимся, что мы обращаемся к message безопасно или явно указываем тип
        const errorMessage = (errorBody && typeof errorBody === 'object' && 'message' in errorBody && typeof errorBody.message === 'string') ? errorBody.message : 'Unknown error from server';
        throw new Error(`Failed to fetch member analytics: ${errorMessage}`);
      }

      const { data } = await response.json();

      return { data } as MemberAnalyticsResponseType;
    },
    enabled: !!memberId && !!workspaceId, // Хук выполняется только если memberId и workspaceId определены
  });

  return query;
}; 