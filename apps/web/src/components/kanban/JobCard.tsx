'use client';

import { WorkflowJob } from './KanbanBoard';

interface JobCardProps {
  job: WorkflowJob;
}

const STATE_ICONS: Record<string, string> = {
  'pending': '⏳',
  'script-generation': '✍️',
  'video-creation': '🎬',
  'voice-synthesis': '🎙️',
  'storage': '☁️',
  'completed': '✅',
  'failed': '❌',
};

const STATE_COLORS: Record<string, string> = {
  'pending': 'border-gray-300 bg-white',
  'script-generation': 'border-blue-300 bg-blue-50',
  'video-creation': 'border-purple-300 bg-purple-50',
  'voice-synthesis': 'border-orange-300 bg-orange-50',
  'storage': 'border-green-300 bg-green-50',
  'completed': 'border-emerald-300 bg-emerald-50',
  'failed': 'border-red-300 bg-red-50',
};

export default function JobCard({ job }: JobCardProps) {
  const formatDate = (date: Date) => {
    try {
      const d = new Date(date);
      return d.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const getProgressColor = (progress: number, state: string) => {
    if (state === 'failed') return 'bg-red-500';
    if (state === 'completed') return 'bg-green-500';
    if (progress === 0) return 'bg-gray-300';
    return 'bg-blue-500';
  };

  return (
    <div className={`p-4 rounded-lg border-2 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${STATE_COLORS[job.state]}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{STATE_ICONS[job.state]}</span>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 truncate">{job.name}</h4>
            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{job.description}</p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {job.state !== 'pending' && job.state !== 'completed' && job.state !== 'failed' && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>Progress</span>
            <span>{job.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className={`h-1.5 rounded-full transition-all ${getProgressColor(job.progress, job.state)}`}
              style={{ width: `${Math.min(job.progress, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Metadata */}
      {job.metadata && (
        <div className="mb-3 space-y-1">
          {job.metadata.contentStyle && (
            <div className="flex items-center text-xs text-gray-600">
              <span className="font-medium mr-1">Style:</span>
              <span className="bg-gray-100 px-2 py-0.5 rounded">{job.metadata.contentStyle}</span>
            </div>
          )}
          {job.metadata.duration && (
            <div className="flex items-center text-xs text-gray-600">
              <span className="font-medium mr-1">Duration:</span>
              <span>{job.metadata.duration} min</span>
            </div>
          )}
          {job.metadata.selectedSteps && (
            <div className="flex items-center text-xs text-gray-600">
              <span className="font-medium mr-1">Steps:</span>
              <span>{job.metadata.selectedSteps.length} selected</span>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {job.error && job.state === 'failed' && (
        <div className="mb-3 p-2 bg-red-100 border border-red-200 rounded text-xs text-red-700">
          <span className="font-medium">Error:</span> {job.error}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Created {formatDate(job.createdAt)}</span>
        <span>Updated {formatDate(job.updatedAt)}</span>
      </div>
    </div>
  );
} 