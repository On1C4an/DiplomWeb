import { z } from 'zod';

import { TaskStatus } from './types';

export const createTaskSchema = z.object({
  name: z.string().trim().min(1, 'Название задачи обязательно.'),
  status: z.nativeEnum(TaskStatus, {
    required_error: 'Статус задачи обязателен.',
  }),
  workspaceId: z.string().trim().min(1, 'Рабочее пространство обязательно.'),
  projectId: z.string().trim().min(1, 'Проект обязателен.'),
  dueDate: z.coerce.date({
    invalid_type_error: 'Некорректная дата',
    required_error: 'Срок выполнения обязателен.'
  }),
  assigneeId: z.string().trim().min(1, 'Исполнитель обязателен.'),
  description: z.string().optional(),
});

export const updateTaskSchema = createTaskSchema.partial().extend({
  position: z.number().int().positive().min(1000).max(1_00_000).optional(),
});

export const createCommentSchema = z.object({
  text: z.string().trim().min(1, 'Комментарий не может быть пустым.'),
  type: z.enum(['user', 'system']).default('user'),
});
