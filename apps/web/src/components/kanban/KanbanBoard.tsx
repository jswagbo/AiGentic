'use client';

import { useState, useEffect } from 'react';
import KanbanColumn from './KanbanColumn';
import { useWebSocket } from '../../hooks/useWebSocket';

// Workflow job states
export type JobState = 'pending' | 'script-generation' | 'video-creation' | 'voice-synthesis' | 'storage' | 'completed' | 'failed';

export interface WorkflowJob {
  id: string;
  name: string;
  description: string;
  state: JobState;
  progress: number;
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    contentStyle?: string;
    duration?: number;
    selectedSteps?: string[];
  };
  error?: string;
}

const COLUMN_CONFIG = [
  {
    id: 'pending' as JobState,
    title: 'Pending',
    description: 'Workflows waiting to start',
    color: 'bg-gray-50 border-gray-200',
    headerColor: 'bg-gray-100',
  },
  {
    id: 'script-generation' as JobState,
    title: 'Script Generation',
    description: 'AI writing content scripts',
    color: 'bg-blue-50 border-blue-200',
    headerColor: 'bg-blue-100',
  },
  {
    id: 'video-creation' as JobState,
    title: 'Video Creation',
    description: 'Generating video content',
    color: 'bg-purple-50 border-purple-200',
    headerColor: 'bg-purple-100',
  },
  {
    id: 'voice-synthesis' as JobState,
    title: 'Voice Synthesis',
    description: 'Adding AI voice-over',
    color: 'bg-orange-50 border-orange-200',
    headerColor: 'bg-orange-100',
  },
  {
    id: 'storage' as JobState,
    title: 'Storage',
    description: 'Uploading to Google Drive',
    color: 'bg-green-50 border-green-200',
    headerColor: 'bg-green-100',
  },
  {
    id: 'completed' as JobState,
    title: 'Completed',
    description: 'Ready for download/sharing',
    color: 'bg-emerald-50 border-emerald-200',
    headerColor: 'bg-emerald-100',
  },
  {
    id: 'failed' as JobState,
    title: 'Failed',
    description: 'Workflows with errors',
    color: 'bg-red-50 border-red-200',
    headerColor: 'bg-red-100',
  },
];

export default function KanbanBoard() {
  const [jobs, setJobs] = useState<WorkflowJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // WebSocket connection for real-time updates
  const { isConnected, lastMessage } = useWebSocket('/api/ws/jobs');

  // Load initial jobs
  useEffect(() => {
    loadJobs();
  }, []);

  // Handle WebSocket updates
  useEffect(() => {
    if (lastMessage) {
      try {
        const update = JSON.parse(lastMessage);
        handleJobUpdate(update);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    }
  }, [lastMessage]);

  const loadJobs = async () => {
    try {
      const response = await fetch('/api/jobs');
      if (response.ok) {
        const jobsData = await response.json();
        setJobs(jobsData);
      }
    } catch (error) {
      console.error('Failed to load jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJobUpdate = (update: any) => {
    if (update.type === 'job_updated') {
      setJobs(prevJobs => 
        prevJobs.map(job => 
          job.id === update.jobId 
            ? { ...job, ...update.data }
            : job
        )
      );
    } else if (update.type === 'job_created') {
      setJobs(prevJobs => [...prevJobs, update.job]);
    }
  };

  const getJobsByState = (state: JobState) => {
    return jobs.filter(job => job.state === state);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Connection Status */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-600">
            {isConnected ? 'Connected' : 'Disconnected'} - Real-time updates
          </span>
        </div>
        <button
          onClick={loadJobs}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Refresh
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex space-x-4 min-w-max h-full pb-4">
          {COLUMN_CONFIG.map(column => (
            <KanbanColumn
              key={column.id}
              config={column}
              jobs={getJobsByState(column.id)}
            />
          ))}
        </div>
      </div>

      {/* Stats Footer */}
      <div className="mt-6 grid grid-cols-4 gap-4 text-center text-sm">
        <div>
          <div className="font-semibold text-gray-900">{jobs.length}</div>
          <div className="text-gray-600">Total Jobs</div>
        </div>
        <div>
          <div className="font-semibold text-blue-600">
            {getJobsByState('script-generation').length + 
             getJobsByState('video-creation').length + 
             getJobsByState('voice-synthesis').length + 
             getJobsByState('storage').length}
          </div>
          <div className="text-gray-600">In Progress</div>
        </div>
        <div>
          <div className="font-semibold text-green-600">{getJobsByState('completed').length}</div>
          <div className="text-gray-600">Completed</div>
        </div>
        <div>
          <div className="font-semibold text-red-600">{getJobsByState('failed').length}</div>
          <div className="text-gray-600">Failed</div>
        </div>
      </div>
    </div>
  );
} 