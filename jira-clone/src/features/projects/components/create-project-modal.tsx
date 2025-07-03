'use client';

import { ResponsiveModal } from '@/components/responsive-modal';
import { useCreateProjectModal } from '@/features/projects/hooks/use-create-project-modal';

import { CreateProjectForm } from './create-project-form';

export const CreateProjectModal = () => {
  const { isOpen, setIsOpen, close } = useCreateProjectModal();

  return (
    <ResponsiveModal title="Создать проект" description="Начните с создания нового проекта." open={isOpen} onOpenChange={setIsOpen}>
      <CreateProjectForm onCancel={close} />
    </ResponsiveModal>
  );
};
