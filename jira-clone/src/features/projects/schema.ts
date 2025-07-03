import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, 'Название проекта обязательно.'),
  image: z.union([z.instanceof(File), z.string().transform((value) => (value === '' ? undefined : value))]).optional(),
  description: z.string().optional(),
  workspaceId: z.string({
    message: 'Рабочее пространство обязательно.',
  }),
});

export const updateProjectSchema = z.object({
  name: z.string().trim().min(1, 'Название проекта обязательно.').optional(),
  image: z.union([z.instanceof(File), z.string().transform((value) => (value === '' ? undefined : value))]).optional(),
  workspaceId: z.string({
    message: 'Рабочее пространство обязательно.',
  }),
});
