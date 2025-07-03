'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { DatePicker } from '@/components/date-picker';
import { DottedSeparator } from '@/components/dotted-separator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MemberAvatar } from '@/features/members/components/member-avatar';
import { ProjectAvatar } from '@/features/projects/components/project-avatar';
import { useUpdateTask } from '@/features/tasks/api/use-update-task';
import { createTaskSchema } from '@/features/tasks/schema';
import { type Task, TaskStatus } from '@/features/tasks/types';
import { cn } from '@/lib/utils';
import { useConfirm } from '@/hooks/use-confirm';
import { taskStatusTranslations } from '@/features/tasks/translations';

interface EditTaskFormProps {
  onCancel?: () => void;
  projectOptions: { id: string; name: string; imageUrl?: string }[];
  memberOptions: { id: string; name: string }[];
  initialValues: Task;
}

export const EditTaskForm = ({ onCancel, memberOptions, projectOptions, initialValues }: EditTaskFormProps) => {
  const { mutate: createTask, isPending } = useUpdateTask();
  const [DeleteDialog, confirmDelete] = useConfirm('Удалить задачу', 'Это действие нельзя отменить.', 'destructive');

  const editTaskForm = useForm<z.infer<typeof createTaskSchema>>({
    resolver: zodResolver(createTaskSchema.omit({ workspaceId: true, description: true })),
    defaultValues: {
      ...initialValues,
      dueDate: initialValues.dueDate ? new Date(initialValues.dueDate) : undefined,
    },
  });

  const onSubmit = (values: z.infer<typeof createTaskSchema>) => {
    createTask(
      {
        json: values,
        param: { taskId: initialValues.$id },
      },
      {
        onSuccess: () => {
          onCancel?.();
        },
      },
    );
  };

  return (
    <Card className="size-full border-none shadow-none">
      <CardHeader className="flex p-7">
        <CardTitle className="text-xl font-bold">Редактировать задачу</CardTitle>
      </CardHeader>

      <div className="px-7">
        <DottedSeparator />
      </div>

      <CardContent className="p-7">
        <Form {...editTaskForm}>
          <form onSubmit={editTaskForm.handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-y-4">
              <FormField
                disabled={isPending}
                control={editTaskForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название задачи</FormLabel>

                    <FormControl>
                      <Input {...field} type="text" placeholder="Введите название задачи" />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                disabled={isPending}
                control={editTaskForm.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Срок выполнения</FormLabel>

                    <FormControl>
                      <DatePicker {...field} disabled={isPending} placeholder="Выберите срок выполнения" />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                disabled={isPending}
                control={editTaskForm.control}
                name="assigneeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Исполнитель</FormLabel>

                    <Select disabled={isPending} defaultValue={field.value} value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>{field.value ? <SelectValue placeholder="Выберите исполнителя" /> : 'Выберите исполнителя'}</SelectTrigger>
                      </FormControl>

                      <FormMessage />

                      <SelectContent>
                        {memberOptions.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            <div className="flex items-center gap-x-2">
                              <MemberAvatar className="size-6" name={member.name} />
                              {member.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                disabled={isPending}
                control={editTaskForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Статус</FormLabel>

                    <Select disabled={isPending} defaultValue={field.value} value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>{field.value ? <SelectValue placeholder="Выберите статус" /> : 'Выберите статус'}</SelectTrigger>
                      </FormControl>

                      <FormMessage />

                      <SelectContent>
                        <SelectItem value={TaskStatus.BACKLOG}>{taskStatusTranslations[TaskStatus.BACKLOG]}</SelectItem>
                        <SelectItem value={TaskStatus.IN_PROGRESS}>В работе</SelectItem>
                        <SelectItem value={TaskStatus.IN_REVIEW}>На проверке</SelectItem>
                        <SelectItem value={TaskStatus.TODO}>К выполнению</SelectItem>
                        <SelectItem value={TaskStatus.DONE}>{taskStatusTranslations[TaskStatus.DONE]}</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                disabled={isPending}
                control={editTaskForm.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Проект</FormLabel>

                    <Select disabled={isPending} defaultValue={field.value} value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>{field.value ? <SelectValue placeholder="Выберите проект" /> : 'Выберите проект'}</SelectTrigger>
                      </FormControl>

                      <FormMessage />

                      <SelectContent>
                        {projectOptions.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            <div className="flex items-center gap-x-2">
                              <ProjectAvatar className="size-6" name={project.name} image={project.imageUrl} />
                              {project.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            <DottedSeparator className="py-7" />

            <FormMessage />

            <div className="flex items-center justify-between">
              <Button
                disabled={isPending}
                type="button"
                size="lg"
                variant="secondary"
                onClick={onCancel}
                className={cn(!onCancel && 'invisible')}
              >
                Отмена
              </Button>

              <Button disabled={isPending} type="submit" size="lg">
                Сохранить
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
