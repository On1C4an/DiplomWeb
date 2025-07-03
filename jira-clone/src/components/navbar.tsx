'use client';

import { usePathname, useRouter } from 'next/navigation';

import { UserButton } from '@/features/auth/components/user-button';
import { useWorkspaceId } from '@/features/workspaces/hooks/use-workspace-id';

import { MobileSidebar } from './mobile-sidebar';
import { RiBarChartFill } from 'react-icons/ri';


const pathnameMap = {
  tasks: {
    title: 'Мои задачи',
    description: 'Просматривайте все свои задачи здесь.',
  },
  projects: {
    title: 'Мой проект',
    description: 'Просматривайте задачи вашего проекта здесь.',
  },
  statistics: {
    title: 'Статистика',
    description: 'Просматривайте статистику по задачам и проектам.',
  },
};

const defaultMap = {
  title: 'Главная',
  description: 'Следите за всеми своими проектами и задачами здесь.',
};

export const Navbar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const workspaceId = useWorkspaceId();
  const pathnameParts = pathname.split('/');
  const pathnameKey = pathnameParts[3] as keyof typeof pathnameMap;

  const { title, description } = pathnameMap[pathnameKey] || defaultMap;

  return (
    <nav className="flex items-center justify-between px-6 pt-4">
      <div className="hidden flex-col lg:flex">
        <h1 className="text-2xl font-semibold">{title}</h1>

        <p className="text-muted-foreground">{description}</p>
      </div>

      <MobileSidebar />

      <div className="flex items-center gap-x-2.5">
        <button onClick={() => router.push(`/workspaces/${workspaceId}/statistics`)}>
          <RiBarChartFill className="size-6 cursor-pointer text-neutral-500 transition hover:opacity-75" />
        </button>
        <UserButton />

       
      </div>
    </nav>
  );
};
