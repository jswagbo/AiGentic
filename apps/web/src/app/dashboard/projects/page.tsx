import { Suspense } from 'react';
import { auth } from '../../../lib/auth';
import { redirect } from 'next/navigation';
import KanbanBoard from '../../../components/kanban/KanbanBoard';

export default async function ProjectsPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/signin');
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        <p className="text-gray-600 mt-1">
          Track your content generation workflows in real-time
        </p>
      </div>

      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }>
        <KanbanBoard />
      </Suspense>
    </div>
  );
} 