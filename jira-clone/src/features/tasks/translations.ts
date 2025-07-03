import { TaskStatus } from './types';

export const taskStatusTranslations: Record<TaskStatus, string> = {
  [TaskStatus.BACKLOG]: 'Бэклог',
  [TaskStatus.TODO]: 'К выполнению',
  [TaskStatus.IN_PROGRESS]: 'В работе',
  [TaskStatus.IN_REVIEW]: 'На проверке',
  [TaskStatus.DONE]: 'Выполнено',
}; 