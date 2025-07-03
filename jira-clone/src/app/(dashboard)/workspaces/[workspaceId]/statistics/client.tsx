'use client';

import { useWorkspaceId } from '@/features/workspaces/hooks/use-workspace-id';
import { Analytics } from '@/components/analytics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageLoader } from '@/components/page-loader';
import { PageError } from '@/components/page-error';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Регистрируем необходимые компоненты Chart.js
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, ChartDataLabels);

// Импортируем хуки для получения данных
import { useGetWorkspaceAnalytics } from '@/features/workspaces/api/use-get-workspace-analytics';
import { useGetMembers } from '@/features/members/api/use-get-members';
import { useGetProjects } from '@/features/projects/api/use-get-projects';
import { useGetProjectAnalytics, ProjectAnalyticsResponseType } from '@/features/projects/api/use-get-project-analytics';
import { useGetMemberAnalytics, MemberAnalyticsResponseType } from '@/features/members/api/use-get-member-analytics';
import { useState, useEffect } from 'react';

// Явно определяем тип для ошибок useQuery, чтобы помочь линтеру
type QueryError = { message: string } | unknown;

export const StatisticsClient = () => {
  const workspaceId = useWorkspaceId();

  // Состояние для выбранного типа диаграммы общей статистики
  const [generalChartType, setGeneralChartType] = useState('pie'); // 'pie' или 'bar'

  // Состояние для выбранного участника и типа диаграммы по участнику
  const [selectedMemberId, setSelectedMemberId] = useState<string | undefined>(undefined);
  const [memberChartType, setMemberChartType] = useState('pie'); // 'pie' или 'bar'

  // Состояние для выбранного проекта и типа диаграммы по проекту
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);
  const [projectChartType, setProjectChartType] = useState('pie'); // 'pie' или 'bar'

  // Загрузка данных аналитики, списка участников и списка проектов
  const { data: workspaceAnalytics, isLoading: isLoadingAnalytics, error: analyticsError } = useGetWorkspaceAnalytics({ workspaceId });
  const { data: members, isLoading: isLoadingMembers, error: membersError } = useGetMembers({ workspaceId });
  const { data: projects, isLoading: isLoadingProjects, error: projectsError } = useGetProjects({ workspaceId });

  // Устанавливаем первый проект по умолчанию при загрузке списка проектов
  useEffect(() => {
    if (projects?.documents && projects.documents.length > 0) {
      // Если выбранный проект был удалён, выбрать первый существующий
      if (!selectedProjectId || !projects.documents.some(p => p.$id === selectedProjectId)) {
        setSelectedProjectId(projects.documents[0].$id);
      }
    } else {
      // Если проектов нет — сбросить выбор
      setSelectedProjectId(undefined);
    }
  }, [projects?.documents, selectedProjectId]);

  // Загрузка данных аналитики по выбранному проекту
  const { data: projectAnalytics, isLoading: isLoadingProjectAnalytics, error: projectAnalyticsError } = useGetProjectAnalytics(
    { projectId: selectedProjectId! }
  );

  // Загрузка данных аналитики по выбранному участнику
  const { data: memberAnalytics, isLoading: isLoadingMemberAnalytics, error: memberAnalyticsError } = useGetMemberAnalytics({ memberId: selectedMemberId!, workspaceId });

  const isLoading = isLoadingAnalytics || isLoadingMembers || isLoadingProjects || isLoadingProjectAnalytics || isLoadingMemberAnalytics;
  const error: QueryError = analyticsError || membersError || projectsError || projectAnalyticsError || memberAnalyticsError;

  // Обработка состояний загрузки и ошибки
  if (isLoading) return <PageLoader />;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return <PageError message={`Failed to load data: ${error.message}`} />;

  // Проверка, что данные загружены успешно
  if (!workspaceAnalytics || !members || !projects) return <PageError message="Failed to load data." />;

  // Подготовка данных для графиков
  const barChartData = {
    labels: ['Задачи'],
    datasets: [
      {
        label: 'Завершено',
        data: [workspaceAnalytics.completedTaskCount],
        backgroundColor: '#82ca9d',
      },
      {
        label: 'Незавершено',
        data: [workspaceAnalytics.incompleteTaskCount],
        backgroundColor: '#a4de6c',
      },
      {
        label: 'Просрочено',
        data: [workspaceAnalytics.overdueTaskCount],
        backgroundColor: '#ffc658',
      },
      {
        label: 'Назначено',
        data: [workspaceAnalytics.assignedTaskCount],
        backgroundColor: '#0088FE',
      },
    ],
  };

  const pieChartData = {
    labels: ['Завершено', 'Незавершено', 'Просрочено', 'Назначено'],
    datasets: [
      {
        data: [
          workspaceAnalytics.completedTaskCount,
          workspaceAnalytics.incompleteTaskCount,
          workspaceAnalytics.overdueTaskCount,
          workspaceAnalytics.assignedTaskCount,
        ],
        backgroundColor: ['#82ca9d', '#a4de6c', '#ffc658', '#0088FE'],
        borderColor: ['#82ca9d', '#a4de6c', '#ffc658', '#0088FE'],
        borderWidth: 1,
      },
    ],
  };

  const pieChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      datalabels: {
        color: '#222',
        font: {
          weight: 'bold',
          size: 13,
        } as const,
        textStrokeColor: '#fff',
        textStrokeWidth: 3,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.9)',
        padding: 6,
        formatter: (value: number, context: any) => {
          if (context.chart.config.type === 'pie') {
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percent = total ? Math.round((value / total) * 100) : 0;
            return `${value} (${percent}%)`;
          }
          return value;
        },
        clamp: true,
        display: true,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            if (context.chart.config.type === 'pie') {
              const label = context.label || '';
              const value = context.raw || 0;
              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
              const percentage = Math.round((value / total) * 100);
              return `${label}: ${value} (${percentage}%)`;
            }
            return `${context.dataset.label}: ${context.raw}`;
          }
        }
      }
    },
  };

  const barChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      datalabels: {
        color: '#222',
        font: {
          weight: 'bold',
          size: 13,
        } as const,
        textStrokeColor: '#fff',
        textStrokeWidth: 3,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.9)',
        padding: 6,
        formatter: (value: number, context: any) => {
          if (context.chart.config.type === 'pie') {
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percent = total ? Math.round((value / total) * 100) : 0;
            return `${value} (${percent}%)`;
          }
          return value;
        },
        clamp: true,
        display: true,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            if (context.chart.config.type === 'pie') {
              const label = context.label || '';
              const value = context.raw || 0;
              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
              const percentage = Math.round((value / total) * 100);
              return `${label}: ${value} (${percentage}%)`;
            }
            return `${context.dataset.label}: ${context.raw}`;
          }
        }
      }
    },
  };

  // --- Данные статистики участника (Pie) ---
  const memberPieChartData = memberAnalytics && memberAnalytics.data ? {
    labels: ['Завершено', 'Незавершено', 'Просрочено', 'Назначено'],
    datasets: [
      {
        data: [
          memberAnalytics.data.completedTaskCount,
          memberAnalytics.data.incompleteTaskCount,
          memberAnalytics.data.overdueTaskCount,
          memberAnalytics.data.assignedTaskCount,
        ],
        backgroundColor: ['#82ca9d', '#a4de6c', '#ffc658', '#0088FE'],
      },
    ],
  } : null;

  // --- Данные статистики участника (реальные/заглушка) ---
  // Используем данные из useGetMemberAnalytics
  const memberBarChartData = memberAnalytics && memberAnalytics.data ? {
    labels: ['Задачи'],
    datasets: [
      {
        label: 'Завершено',
        data: [memberAnalytics.data.completedTaskCount],
        backgroundColor: '#82ca9d',
      },
      {
        label: 'Незавершено',
        data: [memberAnalytics.data.incompleteTaskCount],
        backgroundColor: '#a4de6c',
      },
      {
        label: 'Просрочено',
        data: [memberAnalytics.data.overdueTaskCount],
        backgroundColor: '#ffc658',
      },
      {
        label: 'Назначено',
        data: [memberAnalytics.data.assignedTaskCount],
        backgroundColor: '#0088FE',
      },
    ],
  } : null;
  // --- Конец данных статистики участника ---

  // --- Данные статистики проекта (Pie) ---
  const projectPieChartData = projectAnalytics ? {
    labels: ['Завершено', 'Незавершено', 'Просрочено', 'Назначено'],
    datasets: [
      {
        data: [
          projectAnalytics.completedTaskCount,
          projectAnalytics.incompleteTaskCount,
          projectAnalytics.overdueTaskCount,
          projectAnalytics.assignedTaskCount,
        ],
        backgroundColor: ['#82ca9d', '#a4de6c', '#ffc658', '#0088FE'],
      },
    ],
  } : null;

  // --- Данные статистики проекта (реальные) ---
  // Используем данные из useGetProjectAnalytics
   const projectBarChartData = projectAnalytics ? {
    labels: ['Задачи'],
    datasets: [
      {
        label: 'Завершено',
        data: [projectAnalytics.completedTaskCount],
        backgroundColor: '#82ca9d',
      },
      {
        label: 'Незавершено',
        data: [projectAnalytics.incompleteTaskCount],
        backgroundColor: '#a4de6c',
      },
      {
        label: 'Просрочено',
        data: [projectAnalytics.overdueTaskCount],
        backgroundColor: '#ffc658',
      },
      {
        label: 'Назначено',
        data: [projectAnalytics.assignedTaskCount],
        backgroundColor: '#0088FE',
      },
    ],
  } : null;
  // --- Конец реальных данных ---

  // --- ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ ЭКСПОРТА В EXCEL ---
  const exportToExcel = (type: 'general' | 'member' | 'project') => {
    let data = [];
    let sheetName = '';

    if (type === 'general') {
      data = [
        ['Показатель', 'Количество'],
        ['Завершено', workspaceAnalytics.completedTaskCount],
        ['Незавершено', workspaceAnalytics.incompleteTaskCount],
        ['Просрочено', workspaceAnalytics.overdueTaskCount],
        ['Назначено', workspaceAnalytics.assignedTaskCount],
      ];
      sheetName = 'Общая статистика';
    } else if (type === 'member' && selectedMemberId && memberAnalytics && memberAnalytics.data) {
      data = [
        ['Показатель', 'Количество'],
        ['Завершено', memberAnalytics.data.completedTaskCount],
        ['Незавершено', memberAnalytics.data.incompleteTaskCount],
        ['Просрочено', memberAnalytics.data.overdueTaskCount],
        ['Назначено', memberAnalytics.data.assignedTaskCount],
      ];
      sheetName = 'Статистика по участнику';
    } else if (type === 'project' && selectedProjectId && projectAnalytics) {
      data = [
        ['Показатель', 'Количество'],
        ['Завершено', projectAnalytics.completedTaskCount],
        ['Незавершено', projectAnalytics.incompleteTaskCount],
        ['Просрочено', projectAnalytics.overdueTaskCount],
        ['Назначено', projectAnalytics.assignedTaskCount],
      ];
      sheetName = 'Статистика по проекту';
    } else {
      return;
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), `${sheetName}.xlsx`);
  };

  // --- ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ ЭКСПОРТА ГРАФИКА КАК PNG ---
  const exportChartAsImage = (chartId: string, fileName: string) => {
    const chart = document.getElementById(chartId) as HTMLCanvasElement;
    if (chart) {
      const url = chart.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
    }
  };

  return (
    <div className="flex h-full flex-col space-y-4">
      {/* Раздел аналитики с реальными данными */}
      <Analytics data={workspaceAnalytics} />

      {/* Разделы для общей и детальной статистики */}
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">Общая статистика</TabsTrigger>
          <TabsTrigger value="members">Статистика по участникам</TabsTrigger>
          <TabsTrigger value="projects">Статистика по проектам</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="rounded-lg border bg-white p-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Общая статистика</h2>
              <div className="flex gap-x-2">
                <Button variant="secondary" onClick={() => exportToExcel('general')}>Выгрузить в Excel</Button>
                <Button variant="outline" onClick={() => exportChartAsImage('general-chart', `Общая_статистика_${generalChartType}.png`)}>Скачать график</Button>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-muted-foreground mb-2">Выберите тип диаграммы:</p>
              <div className="flex gap-x-2">
                <Button variant={generalChartType === 'pie' ? 'primary' : 'outline'} onClick={() => setGeneralChartType('pie')}>Круговая диаграмма</Button>
                <Button variant={generalChartType === 'bar' ? 'primary' : 'outline'} onClick={() => setGeneralChartType('bar')}>Столбчатая диаграмма</Button>
              </div>
            </div>

            <div className="mt-4 h-64 flex items-center justify-center">
              {generalChartType === 'pie' ? (
                <Pie key={generalChartType} data={pieChartData} options={pieChartOptions} id="general-chart" plugins={[ChartDataLabels]} />
              ) : (
                <Bar key={generalChartType} data={barChartData} options={barChartOptions} id="general-chart" plugins={[ChartDataLabels]} />
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="members">
          <div className="rounded-lg border bg-white p-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Статистика по участникам</h2>
              <div className="flex gap-x-2">
                <Button variant="secondary" onClick={() => exportToExcel('member')}>Выгрузить в Excel</Button>
                <Button variant="outline" onClick={() => exportChartAsImage('member-chart', `Статистика_по_участнику_${memberChartType}.png`)} disabled={!selectedMemberId}>Скачать график</Button>
              </div>
            </div>
            <div className="mt-4 flex flex-col space-y-4">
               <div>
                 <p className="text-muted-foreground mb-2">Выберите участника:</p>
                 <Select onValueChange={(value) => setSelectedMemberId(value)} value={selectedMemberId}>
                   <SelectTrigger className="w-[200px]">
                     <SelectValue placeholder="Выберите участника" />
                   </SelectTrigger>
                   <SelectContent>
                     {members.documents.map(member => (
                       <SelectItem key={member.$id} value={member.$id}>
                         {member.name}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>

               <div>
                 <p className="text-muted-foreground mb-2">Выберите тип диаграммы:</p>
                 <div className="flex gap-x-2">
                   <Button variant={memberChartType === 'pie' ? 'primary' : 'outline'} onClick={() => setMemberChartType('pie')}>Круговая диаграмма</Button>
                   <Button variant={memberChartType === 'bar' ? 'primary' : 'outline'} onClick={() => setMemberChartType('bar')}>Столбчатая диаграмма</Button>
                 </div>
               </div>

               <div className="mt-4 h-64 bg-gray-100 flex items-center justify-center">
                 {selectedMemberId && (memberPieChartData || memberBarChartData) ? (
                   memberChartType === 'pie' ? (
                     memberPieChartData ? (
                       <Pie key={`${selectedMemberId}-${memberChartType}`} data={memberPieChartData} options={pieChartOptions} id="member-chart" plugins={[ChartDataLabels]} />
                     ) : null
                   ) : (
                     memberBarChartData ? (
                       <Bar key={`${selectedMemberId}-${memberChartType}`} data={memberBarChartData} options={barChartOptions} id="member-chart" plugins={[ChartDataLabels]} />
                     ) : null
                   )
                 ) : (
                   isLoadingMemberAnalytics ? (
                     <PageLoader /> // Индикатор загрузки для статистики участника
                   ) : memberAnalyticsError ? (
                     // Явная проверка типа для отображения сообщения об ошибке участника
                     <PageError message={`Failed to load member statistics: ${(memberAnalyticsError && typeof memberAnalyticsError === 'object' && 'message' in memberAnalyticsError && typeof memberAnalyticsError.message === 'string') ? memberAnalyticsError.message : 'Unknown error'}`} />
                   ) : (
                     <p className="text-muted-foreground">Выберите участника для просмотра статистики</p>
                   )
                 )}
               </div>

               {selectedMemberId && memberAnalytics && memberAnalytics.data ? (
                 <div className="mt-4 w-full">
                    <h3 className="text-md font-semibold mb-2">Статистика за текущий месяц:</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <p>Всего задач: {memberAnalytics.data.taskCount}</p>
                        <p>Назначено: {memberAnalytics.data.assignedTaskCount}</p>
                        <p>Завершено: {memberAnalytics.data.completedTaskCount}</p>
                        <p>Незавершено: {memberAnalytics.data.incompleteTaskCount}</p>
                        <p>Просрочено: {memberAnalytics.data.overdueTaskCount}</p>
                    </div>
                 </div>
               ) : selectedMemberId && !isLoadingMemberAnalytics && !memberAnalyticsError ? (
                 <p className="text-muted-foreground">Не удалось загрузить статистику для выбранного участника.</p>
               ) : null}

            </div>
          </div>
        </TabsContent>

        <TabsContent value="projects">
          <div className="rounded-lg border bg-white p-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Статистика по проектам</h2>
              <div className="flex gap-x-2">
                <Button variant="secondary" onClick={() => exportToExcel('project')}>Выгрузить в Excel</Button>
                <Button variant="outline" onClick={() => exportChartAsImage('project-chart', `Статистика_по_проекту_${projectChartType}.png`)} disabled={!selectedProjectId}>Скачать график</Button>
              </div>
            </div>
            <div className="mt-4 flex flex-col space-y-4">
               <div>
                 <p className="text-muted-foreground mb-2">Выберите проект:</p>
                 <Select onValueChange={(value) => setSelectedProjectId(value)} value={selectedProjectId}>
                   <SelectTrigger className="w-[200px]">
                     <SelectValue placeholder="Выберите проект" />
                   </SelectTrigger>
                   <SelectContent>
                     {projects.documents.map(project => (
                       <SelectItem key={project.$id} value={project.$id}>
                         {project.name}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>

                <div>
                 <p className="text-muted-foreground mb-2">Выберите тип диаграммы:</p>
                 <div className="flex gap-x-2">
                   <Button variant={projectChartType === 'pie' ? 'primary' : 'outline'} onClick={() => setProjectChartType('pie')}>Круговая диаграмма</Button>
                   <Button variant={projectChartType === 'bar' ? 'primary' : 'outline'} onClick={() => setProjectChartType('bar')}>Столбчатая диаграмма</Button>
                 </div>
               </div>

               <div className="mt-4 h-64 bg-gray-100 flex items-center justify-center">
                 {selectedProjectId && (projectPieChartData || projectBarChartData) ? (
                   projectChartType === 'pie' ? (
                     projectPieChartData ? (
                       <Pie key={`${selectedProjectId}-${projectChartType}`} data={projectPieChartData} options={pieChartOptions} id="project-chart" plugins={[ChartDataLabels]} />
                     ) : null
                   ) : (
                     projectBarChartData ? (
                       <Bar key={`${selectedProjectId}-${projectChartType}`} data={projectBarChartData} options={barChartOptions} id="project-chart" plugins={[ChartDataLabels]} />
                     ) : null
                   )
                 ) : (
                   isLoadingProjectAnalytics ? (
                     <PageLoader /> // Индикатор загрузки для статистики проекта
                   ) : projectAnalyticsError ? (
                     // Явная проверка типа для отображения сообщения об ошибке проекта
                     <PageError message={`Failed to load project statistics: ${(projectAnalyticsError && typeof projectAnalyticsError === 'object' && 'message' in projectAnalyticsError && typeof projectAnalyticsError.message === 'string') ? projectAnalyticsError.message : 'Unknown error'}`} />
                   ) : (
                     <p className="text-muted-foreground">Выберите проект для просмотра статистики</p>
                   )
                 )}
               </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}; 