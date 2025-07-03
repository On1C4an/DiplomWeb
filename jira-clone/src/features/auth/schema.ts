import { z } from 'zod';

export const signInFormSchema = z.object({
  email: z.string().trim().email({
    message: 'Некорректный email.',
  }),
  password: z.string({
    required_error: 'Пароль обязателен.',
  }),
});

export const signUpFormSchema = z.object({
  name: z.string().trim().min(1, 'Логин обязателен.'),
  email: z.string().trim().min(1, 'Email обязателен.').email({
    message: 'Некорректный email.',
  }),
  password: z.string().min(8, 'Пароль должен содержать не менее 8 символов.').max(256, 'Пароль не может превышать 256 символов.'),
});
