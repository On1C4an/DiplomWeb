import { useQuery } from '@tanstack/react-query';
// import { client } from '@/lib/hono'; // Больше не нужен Hono клиент для этого маршрута
import { UploadedFile } from '@/features/tasks/types';

export const useGetFiles = (taskId: string) => {
  return useQuery({
    queryKey: ['task-files', taskId],
    queryFn: async () => {
      // Используем стандартный fetch для нового маршрута получения файлов
      const response = await fetch(`/api/get-task-files/${taskId}`);

      if (!response.ok) {
        // Читаем ответ как текст для получения подробностей ошибки
        const errorText = await response.text();
        throw new Error(`Failed to fetch task files: ${response.status} ${errorText}`);
      }
      const { data } = await response.json();
      return data as UploadedFile[];
    },
    enabled: !!taskId, // Включаем запрос только если taskId доступен
  });
}; 