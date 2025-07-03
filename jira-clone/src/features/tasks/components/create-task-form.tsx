'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
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
import { useCreateTask } from '@/features/tasks/api/use-create-task';
import { createTaskSchema } from '@/features/tasks/schema';
import { TaskStatus } from '@/features/tasks/types';
import { useWorkspaceId } from '@/features/workspaces/hooks/use-workspace-id';
import { cn } from '@/lib/utils';
import { taskStatusTranslations } from '@/features/tasks/translations';

interface CreateTaskFormProps {
  initialStatus?: TaskStatus | null;
  onCancel?: () => void;
  projectOptions: { id: string; name: string; imageUrl?: string }[];
  memberOptions: { id: string; name: string }[];
}

export const CreateTaskForm = ({ initialStatus, onCancel, memberOptions, projectOptions }: CreateTaskFormProps) => {
  const router = useRouter();
  const workspaceId = useWorkspaceId();

  const { mutate: createTask, isPending } = useCreateTask();

  const createTaskForm = useForm<z.infer<typeof createTaskSchema>>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      name: '',
      dueDate: undefined,
      assigneeId: undefined,
      description: '',
      projectId: undefined,
      status: initialStatus ?? undefined,
      workspaceId,
    },
  });

  const onSubmit = (values: z.infer<typeof createTaskSchema>) => {
    createTask(
      {
        json: values,
      },
      {
        onSuccess: ({ data }) => {
          createTaskForm.reset();
          router.push(`/workspaces/${data.workspaceId}/tasks/${data.$id}`);
        },
      },
    );
  };

  return (
    <Card className="size-full border-none shadow-none">
      <CardHeader className="flex p-7">
        <CardTitle className="text-xl font-bold">Создать новую задачу</CardTitle>
      </CardHeader>

      <div className="px-7">
        <DottedSeparator />
      </div>

      <CardContent className="p-7">
        <Form {...createTaskForm}>
          <form onSubmit={createTaskForm.handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-y-4">
              <FormField
                disabled={isPending}
                control={createTaskForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название задачи</FormLabel>

                    <FormControl>
                      <Input {...field} type="text" placeholder="Введите название задачи" />
                    </FormControl>

                    <FormMessage>{createTaskForm.formState.errors.name?.message === 'Required' ? 'Обязательно' : createTaskForm.formState.errors.name?.message}</FormMessage>
                  </FormItem>
                )}
              />

              <FormField
                disabled={isPending}
                control={createTaskForm.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Срок выполнения</FormLabel>

                    <FormControl>
                      <DatePicker {...field} disabled={isPending} placeholder="Выберите срок выполнения" />
                    </FormControl>

                    <FormMessage>{createTaskForm.formState.errors.dueDate?.message === 'Invalid date' ? 'Некорректная дата' : createTaskForm.formState.errors.dueDate?.message}</FormMessage>
                  </FormItem>
                )}
              />

              <FormField
                disabled={isPending}
                control={createTaskForm.control}
                name="assigneeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Исполнитель</FormLabel>

                    <Select disabled={isPending} defaultValue={field.value} value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>{field.value ? <SelectValue placeholder="Выберите исполнителя" /> : 'Выберите исполнителя'}</SelectTrigger>
                      </FormControl>

                      <FormMessage>{createTaskForm.formState.errors.assigneeId?.message === 'Required' ? 'Обязательно' : createTaskForm.formState.errors.assigneeId?.message}</FormMessage>

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
                control={createTaskForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Статус</FormLabel>

                    <Select disabled={isPending} defaultValue={field.value} value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>{field.value ? <SelectValue placeholder="Выберите статус" /> : 'Выберите статус'}</SelectTrigger>
                      </FormControl>

                      <FormMessage>{createTaskForm.formState.errors.status?.message === 'Required' ? 'Обязательно' : createTaskForm.formState.errors.status?.message}</FormMessage>

                      <SelectContent>
                        <SelectItem value={TaskStatus.BACKLOG}>{taskStatusTranslations[TaskStatus.BACKLOG]}</SelectItem>
                        <SelectItem value={TaskStatus.IN_PROGRESS}>{taskStatusTranslations[TaskStatus.IN_PROGRESS]}</SelectItem>
                        <SelectItem value={TaskStatus.IN_REVIEW}>{taskStatusTranslations[TaskStatus.IN_REVIEW]}</SelectItem>
                        <SelectItem value={TaskStatus.TODO}>{taskStatusTranslations[TaskStatus.TODO]}</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                disabled={isPending}
                control={createTaskForm.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Проект</FormLabel>

                    <Select disabled={isPending} defaultValue={field.value} value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>{field.value ? <SelectValue placeholder="Выберите проект" /> : 'Выберите проект'}</SelectTrigger>
                      </FormControl>

                      <FormMessage>{createTaskForm.formState.errors.projectId?.message === 'Required' ? 'Обязательно' : createTaskForm.formState.errors.projectId?.message}</FormMessage>

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
                Создать задачу
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
