import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const useUploadFile = (taskId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('taskId', taskId);

      const response = await fetch('/api/upload-task-file', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to upload file: ${response.status} ${errorText}`);
      }

      const { data } = await response.json();
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-files', taskId] });
      toast.success(`Файл "${data.name}" успешно загружен`);
    },
  });
}; 