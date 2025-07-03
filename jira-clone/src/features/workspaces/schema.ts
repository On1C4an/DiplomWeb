import { z } from 'zod';

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1, 'Название рабочего пространства обязательно.'),
  image: z.union([z.instanceof(File), z.string().transform((value) => (value === '' ? undefined : value))]).optional(),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().trim().min(1, 'Название рабочего пространства должно содержать хотя бы 1 символ.').optional(),
  image: z.union([z.instanceof(File), z.string().transform((value) => (value === '' ? undefined : value))]).optional(),
});
