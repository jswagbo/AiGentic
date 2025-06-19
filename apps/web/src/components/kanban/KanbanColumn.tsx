'use client';

import { JobState, WorkflowJob } from './KanbanBoard';
import JobCard from './JobCard';

interface ColumnConfig {
  id: JobState;
  title: string;
  description: string;
  color: string;
  headerColor: string;
}

interface KanbanColumnProps {
  config: ColumnConfig;
  jobs: WorkflowJob[];
}

export default function KanbanColumn({ config, jobs }: KanbanColumnProps) {
  return (
    <div className={`flex flex-col w-80 h-full rounded-lg border-2 ${config.color}`}>
      {/* Column Header */}
      <div className={`px-4 py-3 rounded-t-lg ${config.headerColor} border-b`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">{config.title}</h3>
            <p className="text-xs text-gray-600 mt-1">{config.description}</p>
          </div>
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white text-xs font-semibold text-gray-700">
            {jobs.length}
          </div>
        </div>
      </div>

      {/* Jobs List */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto">
        {jobs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-lg mb-2">📋</div>
            <p className="text-sm">No jobs in this stage</p>
          </div>
        ) : (
          jobs.map(job => (
            <JobCard key={job.id} job={job} />
          ))
        )}
      </div>
    </div>
  );
} 