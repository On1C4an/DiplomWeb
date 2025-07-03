import { useState } from 'react';
import { toast } from 'sonner';
import { useGetFiles } from '../api/use-get-files';
import { useUploadFile } from '../api/use-upload-file';
import { Button } from '@/components/ui/button';
import { UploadedFile } from '../types';

export const TaskFiles = ({ taskId }: { taskId: string }) => {
  const { data: files = [], isLoading } = useGetFiles(taskId);
  const [isUploading, setIsUploading] = useState(false);
  const uploadFile = useUploadFile(taskId);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await uploadFile.mutateAsync(file);
    } catch (error: any) {
      console.error('Failed to upload file:', error);
      if (error.message?.includes('Только исполнитель задачи может загружать файлы')) {
        toast.error('Вы не можете загружать файлы, так как не являетесь исполнителем этой задачи');
      } else {
        toast.error('Не удалось загрузить файл');
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="rounded-lg bg-muted p-4 mt-4">
      <p className="text-lg font-semibold mb-2">Файлы</p>
      <div className="flex flex-col gap-y-2 max-h-60 overflow-y-auto mb-4">
        {isLoading ? (
          <span className="italic text-muted-foreground">Загрузка...</span>
        ) : files.length === 0 ? (
          <span className="italic text-muted-foreground">Файлов пока нет</span>
        ) : (
          files.map((file: UploadedFile) => (
            <div key={file.$id} className="border rounded p-2 bg-white/80">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-sm">{file.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(`/api/download-task-file/${taskId}/${file.fileId}`, '_blank')}
                >
                  Скачать
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="flex gap-x-2">
        <input
          type="file"
          onChange={handleFileChange}
          disabled={isUploading}
          className="hidden"
          id="file-upload"
        />
        <Button
          onClick={() => document.getElementById('file-upload')?.click()}
          disabled={isUploading}
        >
          {isUploading ? 'Загрузка...' : 'Загрузить файл'}
        </Button>
      </div>
    </div>
  );
}; 