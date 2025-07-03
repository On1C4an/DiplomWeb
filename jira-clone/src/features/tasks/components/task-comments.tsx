import { useState } from 'react';
import { useGetComments } from '../api/use-get-comments';
import { useAddComment } from '../api/use-add-comment';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

export const TaskComments = ({ taskId }: { taskId: string }) => {
  const { data: comments = [], isLoading } = useGetComments(taskId);
  const [text, setText] = useState('');
  const addComment = useAddComment(taskId);

  return (
    <div className="rounded-lg bg-muted p-4 mt-4">
      <p className="text-lg font-semibold mb-2">Комментарии</p>
      <div className="flex flex-col gap-y-2 max-h-60 overflow-y-auto mb-4">
        {isLoading ? (
          <span className="italic text-muted-foreground">Загрузка...</span>
        ) : comments.length === 0 ? (
          <span className="italic text-muted-foreground">Комментариев пока нет</span>
        ) : (
          comments.map((comment: any) => (
            <div key={comment.$id} className="border rounded p-2 bg-white/80">
              <div className="flex items-center gap-x-2 mb-1">
                <span className="font-medium text-sm">{comment.userName}</span>
                <span className="text-xs text-muted-foreground">{new Date(comment.createdAt).toLocaleString()}</span>
                {comment.type === 'system' && (
                  <span className="ml-2 text-xs text-blue-600">[Системный]</span>
                )}
              </div>
              <div className="text-sm whitespace-pre-line">{comment.text}</div>
            </div>
          ))
        )}
      </div>
      <div className="flex gap-x-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Введите комментарий..."
          rows={2}
          className="flex-1"
          disabled={addComment.isPending}
        />
        <Button
          onClick={() => {
            addComment.mutate(text, { onSuccess: () => setText('') });
          }}
          disabled={addComment.isPending || !text.trim()}
        >
          {addComment.isPending ? 'Отправка...' : 'Отправить'}
        </Button>
      </div>
    </div>
  );
}; 