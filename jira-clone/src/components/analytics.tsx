import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { WorkspaceAnalyticsResponseType } from "@/features/workspaces/api/use-get-workspace-analytics";

import { AnalyticsCard } from './analytics-card';
import { DottedSeparator } from './dotted-separator';

/* interface AnalyticsProps {
  data?: {
    taskCount: number;
    taskDifference: number;
    projectCount?: number;
    projectDifference?: number;
    assignedTaskCount: number;
    assignedTaskDifference: number;
    completedTaskCount: number;
    completedTaskDifference: number;
    incompletedTaskCount?: number;
    incompletedTaskDifference?: number;
    overdueTaskCount: number;
    overdueTaskDifference: number;
  }
} */

export const Analytics = ({ data }: WorkspaceAnalyticsResponseType) => {
  return (
    <ScrollArea className="w-full shrink-0 whitespace-nowrap rounded-lg border">
      <div className="flex w-full flex-row">
        <div className="flex flex-1 items-center">
          <AnalyticsCard
            title="Всего задач"
            value={data.taskCount}
            variant={data.taskDifference > 0 ? 'up' : 'down'}
            increaseValue={data.taskDifference}
          />

          <DottedSeparator direction="vertical" />
        </div>

        <div className="flex flex-1 items-center">
          <AnalyticsCard
            title="Назначено задач"
            value={data.assignedTaskCount}
            variant={data.assignedTaskDifference > 0 ? 'up' : 'down'}
            increaseValue={data.assignedTaskDifference}
          />

          <DottedSeparator direction="vertical" />
        </div>

        <div className="flex flex-1 items-center">
          <AnalyticsCard
            title="Завершено задач"
            value={data.completedTaskCount}
            variant={data.completedTaskDifference > 0 ? 'up' : 'down'}
            increaseValue={data.completedTaskDifference}
          />

          <DottedSeparator direction="vertical" />
        </div>

        <div className="flex flex-1 items-center">
          <AnalyticsCard
            title="Просрочено задач"
            value={data.overdueTaskCount}
            variant={data.overdueTaskDifference > 0 ? 'up' : 'down'}
            increaseValue={data.overdueTaskDifference}
          />

          <DottedSeparator direction="vertical" />
        </div>

        <div className="flex flex-1 items-center">
          <AnalyticsCard
            title="Незавершённых задач"
            value={data.incompleteTaskCount}
            variant={data.incompleteTaskDifference > 0 ? 'up' : 'down'}
            increaseValue={data.incompleteTaskDifference}
          />
        </div>
      </div>

      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
};
