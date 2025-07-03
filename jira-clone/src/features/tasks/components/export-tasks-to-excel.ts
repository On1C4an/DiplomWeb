import * as XLSX from 'xlsx-js-style';
import { saveAs } from 'file-saver';
import { taskStatusTranslations } from '../translations';
import { Task, TaskStatus } from '../types';

export function exportTasksToExcel(tasks: Task[], projectName: string) {
  const wsData = [
    [projectName],
    ['Название задачи', 'Проект', 'Исполнитель', 'Срок', 'Статус'],
    ...tasks.map(task => [
      task.name,
      task.project?.name || '',
      task.assignee?.name || '',
      task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      taskStatusTranslations[task.status as TaskStatus] || task.status,
    ])
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Объединяем ячейки для названия проекта (первая строка, A1 до E1)
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];

  // Устанавливаем стиль для названия проекта (строка 0)
  if (ws['A1']) {
    if (!ws['A1'].s) ws['A1'].s = {};
    ws['A1'].s.font = { bold: true, sz: 16 };
    ws['A1'].s.alignment = { horizontal: 'center', vertical: 'center' };
  }

  const range = XLSX.utils.decode_range(ws['!ref']!);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cell_address]) continue;

      // Инициализируем объект стиля, если его нет
      if (!ws[cell_address].s) {
        ws[cell_address].s = {};
      }

      // Применяем общее выравнивание
      ws[cell_address].s.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };

      // Добавляем границы ко всем ячейкам с данными (начиная со строки 1)
      ws[cell_address].s.border = {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } },
      };

      // Делаем заголовки жирными (вторая строка, R=1)
      if (R === 1) {
        ws[cell_address].s.font = { bold: true };
      }
    }
  }

  ws['!cols'] = [
    { wch: 30 },
    { wch: 20 },
    { wch: 20 },
    { wch: 18 },
    { wch: 15 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Задачи');
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellStyles: true });
  saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'project-tasks.xlsx');
} 