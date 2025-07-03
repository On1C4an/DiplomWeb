'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { DottedSeparator } from '@/components/dotted-separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useCreateProject } from '@/features/projects/api/use-create-project';
import { createProjectSchema } from '@/features/projects/schema';
import { useWorkspaceId } from '@/features/workspaces/hooks/use-workspace-id';
import { cn } from '@/lib/utils';

interface CreateProjectFormProps {
  onCancel?: () => void;
}

export const CreateProjectForm = ({ onCancel }: CreateProjectFormProps) => {
  const router = useRouter();
  const workspaceId = useWorkspaceId();
  const inputRef = useRef<HTMLInputElement>(null);

  const { mutate: createProject, isPending } = useCreateProject();

  const createProjectForm = useForm<z.infer<typeof createProjectSchema>>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: '',
      image: undefined,
      description: '',
      workspaceId,
    },
  });

  const onSubmit = (values: z.infer<typeof createProjectSchema>) => {
    const finalValues = {
      ...values,
      workspaceId,
      image: values.image instanceof File ? values.image : '',
    };

    createProject(
      {
        form: finalValues,
      },
      {
        onSuccess: ({ data }) => {
          createProjectForm.reset();

          router.push(`/workspaces/${workspaceId}/projects/${data.$id}`);
        },
      },
    );
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1 MB in bytes;
    const file = e.target.files?.[0];

    if (file) {
      const validImageTypes = ['image/png', 'image/jpg', 'image/jpeg'];

      if (!validImageTypes.includes(file.type)) return toast.error('File is not a valid image.');
      if (file.size > MAX_FILE_SIZE) return toast.error('Image size cannot exceed 1 MB.');

      createProjectForm.setValue('image', file);
    }
  };

  return (
    <Card className="size-full border-none shadow-none">
      <CardHeader className="p-7">
        <CardTitle className="text-xl font-bold">Создать проект</CardTitle>

        <CardDescription>
          Создайте новый проект для управления задачами и отслеживания прогресса.
        </CardDescription>
      </CardHeader>

      <div className="px-7">
        <DottedSeparator />
      </div>

      <CardContent className="p-7">
        <Form {...createProjectForm}>
          <form onSubmit={createProjectForm.handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-y-4">
              <FormField
                disabled={isPending}
                control={createProjectForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название проекта</FormLabel>

                    <FormControl>
                      <Input {...field} type="text" placeholder="Название проекта" />
                    </FormControl>

                    <FormMessage>{createProjectForm.formState.errors.name?.message === 'Required' ? 'Обязательно' : createProjectForm.formState.errors.name?.message}</FormMessage>
                  </FormItem>
                )}
              />

              <FormField
                disabled={isPending}
                control={createProjectForm.control}
                name="image"
                render={({ field }) => (
                  <div className="flex flex-col gap-y-2">
                    <div className="flex items-center gap-x-5">
                      {field.value ? (
                        <div className="relative size-[72px] overflow-hidden rounded-md">
                          <Image
                            src={field.value instanceof File ? URL.createObjectURL(field.value) : field.value}
                            alt="Project Logo"
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <Avatar className="size-[72px]">
                          <AvatarFallback>
                            <ImageIcon className="size-[36px] text-neutral-400" />
                          </AvatarFallback>
                        </Avatar>
                      )}

                      <div className="flex flex-col">
                        <p className="text-sm">Иконка проекта</p>
                        <p className="text-xs text-muted-foreground">JPG, PNG или JPEG, максимум 1MB</p>

                        <input
                          type="file"
                          className="hidden"
                          onChange={handleImageChange}
                          accept=".jpg, .png, .jpeg"
                          ref={inputRef}
                          disabled={isPending}
                        />

                        {field.value ? (
                          <Button
                            type="button"
                            disabled={isPending}
                            variant="destructive"
                            size="xs"
                            className="mt-2 w-fit"
                            onClick={() => {
                              field.onChange(null);

                              if (inputRef.current) inputRef.current.value = '';
                            }}
                          >
                            Удалить изображение
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            disabled={isPending}
                            variant="tertiary"
                            size="xs"
                            className="mt-2 w-fit"
                            onClick={() => inputRef.current?.click()}
                          >
                            Загрузить изображение
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              />

              <FormField
                disabled={isPending}
                control={createProjectForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Описание проекта</FormLabel>

                    <FormControl>
                      <Input {...field} type="text" placeholder="Описание проекта" />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DottedSeparator className="py-7" />

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
                Создать
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
