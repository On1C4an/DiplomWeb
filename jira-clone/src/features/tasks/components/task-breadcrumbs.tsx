import { ChevronRight, Trash, File } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';

import { Button } from '@/components/ui/button';
import { ProjectAvatar } from '@/features/projects/components/project-avatar';
import type { Project } from '@/features/projects/types';
import { useDeleteTask } from '@/features/tasks/api/use-delete-task';
import type { Task } from '@/features/tasks/types';
import { TaskStatus } from '@/features/tasks/types';
import { taskStatusTranslations } from '@/features/tasks/translations';
import { useWorkspaceId } from '@/features/workspaces/hooks/use-workspace-id';
import { useConfirm } from '@/hooks/use-confirm';

interface TaskBreadcrumbsProps {
  project: Project;
  task: Task;
}

export const TaskBreadcrumbs = ({ project, task }: TaskBreadcrumbsProps) => {
  const router = useRouter();
  const workspaceId = useWorkspaceId();
  const [ConfirmDialog, confirm] = useConfirm('Удалить задачу', 'Это действие нельзя отменить.', 'destructive');

  const { mutate: deleteTask, isPending } = useDeleteTask();

  const handleDeleteTask = async () => {
    const ok = await confirm();

    if (!ok) return;

    deleteTask(
      { param: { taskId: task.$id } },
      {
        onSuccess: () => {
          router.push(`/workspaces/${workspaceId}/tasks`);
        },
      },
    );
  };

  const handleDownloadDoc = async () => {
    const today = new Date();
    const dateStr = today.toLocaleDateString('ru-RU');
    
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date(today.toDateString());
    const isDone = task.status === TaskStatus.DONE;
    let reportText = '';
    if (isOverdue) {
      reportText = `Довожу до вашего сведения «${dateStr}» задача «${task.name}» просрочена.`;
    } else if (isDone) {
      reportText = `Довожу до вашего сведения «${dateStr}» задача «${task.name}» выполнена.`;
    } else {
      reportText = `Довожу до вашего сведения «${dateStr}» задача «${task.name}» на сегодняшний день находится на стадии «${taskStatusTranslations[task.status] || task.status}».`;
    }
    const fontSize = 28; // 14pt = 28 half-points
    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({ text: 'Директору ООО ИП', break: 1, size: fontSize }),
                new TextRun({ text: '«ВиПиАй Девелопмент Центр»', break: 1, size: fontSize }),
                new TextRun({ text: `Ховренкову Павлу Николаевичу`, break: 1, size: fontSize }),
                new TextRun({ text: 'Отдел управления проектами', break: 2, size: fontSize }),
              ],
            }),
            new Paragraph({ text: '' }),
            new Paragraph({ text: '' }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'ОТЧЕТ О ВЫПОЛНЕННЫХ ЭТАПАХ ПРОЕКТА', bold: true, size: fontSize }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: `(${dateStr})`, break: 1, size: fontSize }),
              ],
            }),
            new Paragraph({ text: '' }),
            new Paragraph({
              children: [
                new TextRun({
                  text: reportText,
                  break: 1,
                  size: fontSize,
                }),
                new TextRun({
                  text: `\nОписание задачи: «${task.description || 'Описание не указано'}»`,
                  break: 2,
                  size: fontSize,
                }),
              ],
            }),
            new Paragraph({ text: '' }),
            new Paragraph({
              children: [
                new TextRun({ text: `Исполнитель: ${task.assignee?.name || ''}`, break: 1, size: fontSize }),
                new TextRun({ text: 'Подпись руководителя отдела ____________', break: 2, size: fontSize }),
              ],
            }),
          ],
        },
      ],
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Отчет_${task.name}.docx`);
  };

  return (
    <div className="flex items-center gap-x-2">
      <ConfirmDialog />

      <ProjectAvatar name={project.name} image={project.imageUrl} className="size-6 lg:size-8" />

      <Link href={`/workspaces/${workspaceId}/projects/${project.$id}`}>
        <p className="text-sm font-semibold text-muted-foreground transition hover:opacity-75 lg:text-lg">{project.name}</p>
      </Link>

      <ChevronRight className="size-4 text-muted-foreground lg:size-5" />
      <p className="text-sm font-semibold lg:text-lg">{task.name}</p>

      <Button
        disabled={isPending}
        onClick={handleDownloadDoc}
        className="ml-auto"
        variant="secondary"
        size="sm"
      >
        <File className="size-4 lg:mr-2" />
        <span className="hidden lg:block">Документ</span>
      </Button>

      <Button disabled={isPending} onClick={handleDeleteTask} className="" variant="destructive" size="sm">
        <Trash className="size-4 lg:mr-2" />
        <span className="hidden lg:block">Удалить задачу</span>
      </Button>
    </div>
  );
};
