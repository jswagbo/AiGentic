// Core workflow engine types and interfaces

export interface WorkflowConfig {
  id: string;
  name: string;
  description?: string;
  version: string;
  metadata?: Record<string, any>;
  steps: WorkflowStepConfig[];
  onError?: 'stop' | 'continue' | 'retry';
  maxRetries?: number;
  timeout?: number; // in milliseconds
}

export interface WorkflowStepConfig {
  id: string;
  name: string;
  type: WorkflowStepType;
  provider: string;
  config: Record<string, any>;
  inputs?: Record<string, any>;
  outputs?: string[];
  dependsOn?: string[];
  condition?: string; // Expression to evaluate
  retry?: {
    maxAttempts: number;
    delay: number; // in milliseconds
    backoff?: 'linear' | 'exponential';
  };
  timeout?: number; // in milliseconds
}

export type WorkflowStepType = 
  | 'script-generation'
  | 'video-creation' 
  | 'voice-synthesis'
  | 'storage'
  | 'publishing'
  | 'webhook'
  | 'delay'
  | 'condition';

export type WorkflowStatus = 
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'paused';

export type StepStatus = 
  | 'pending'
  | 'running'
  | 'completed' 
  | 'failed'
  | 'skipped'
  | 'retrying';

export interface WorkflowExecutionContext {
  workflowId: string;
  projectId: string;
  userId: string;
  variables: Record<string, any>;
  startTime: Date;
  endTime?: Date;
  status: WorkflowStatus;
  currentStep?: string;
  stepResults: Record<string, StepExecutionResult>;
  metadata?: Record<string, any>;
}

export interface StepExecutionResult {
  stepId: string;
  status: StepStatus;
  startTime: Date;
  endTime?: Date;
  inputs: Record<string, any>;
  outputs?: Record<string, any>;
  error?: string;
  retryCount: number;
  logs: string[];
  metadata?: Record<string, any>;
}

export interface WorkflowProgress {
  workflowId: string;
  totalSteps: number;
  completedSteps: number;
  currentStep: string | null;
  status: WorkflowStatus;
  progress: number; // 0-100
  estimatedTimeRemaining?: number; // in milliseconds
  errors: string[];
}

export interface ProviderConfig {
  name: string;
  type: string;
  enabled: boolean;
  config: Record<string, any>;
  credentials?: Record<string, any>;
  rateLimit?: {
    requests: number;
    window: number; // in milliseconds
  };
  timeout?: number; // in milliseconds
  retries?: {
    maxAttempts: number;
    delay: number;
    backoff?: 'linear' | 'exponential';
  };
}

export interface WorkflowEngineConfig {
  providers: Record<string, ProviderConfig>;
  storage: {
    type: 'memory' | 'redis' | 'database';
    config: Record<string, any>;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    storage: 'memory' | 'file' | 'database';
  };
  concurrency?: {
    maxParallel: number;
    maxQueue: number;
  };
}

// Event types for workflow engine
export type WorkflowEvent = 
  | 'workflow.started'
  | 'workflow.completed'
  | 'workflow.failed'
  | 'workflow.cancelled'
  | 'step.started'
  | 'step.completed'
  | 'step.failed'
  | 'step.retrying';

export interface WorkflowEventData {
  type: WorkflowEvent;
  workflowId: string;
  stepId?: string;
  timestamp: Date;
  data: Record<string, any>;
}

// Provider interfaces
export interface Provider {
  name: string;
  type: string;
  execute(config: Record<string, any>, inputs: Record<string, any>): Promise<Record<string, any>>;
  validate(config: Record<string, any>): boolean;
  getRequiredInputs(): string[];
  getOutputs(): string[];
}

export interface StorageProvider {
  save(key: string, data: any): Promise<void>;
  load(key: string): Promise<any>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

// Error types
export class WorkflowError extends Error {
  constructor(
    message: string,
    public workflowId: string,
    public stepId?: string,
    public code?: string
  ) {
    super(message);
    this.name = 'WorkflowError';
  }
}

export class StepExecutionError extends Error {
  constructor(
    message: string,
    public stepId: string,
    public provider: string,
    public retryCount: number = 0
  ) {
    super(message);
    this.name = 'StepExecutionError';
  }
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public provider: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

// BullMQ Job Types
export interface WorkflowJobData {
  workflowId: string;
  projectId: string;
  userId: string;
  workflowDefinition: WorkflowConfig;
  context?: Record<string, any>;
  priority?: number;
  metadata?: {
    title?: string;
    description?: string;
    tags?: string[];
    createdAt?: string;
  };
}

export interface StepJobData {
  workflowId: string;
  stepId: string;
  projectId: string;
  userId: string;
  stepDefinition: WorkflowStepConfig;
  context: Record<string, any>;
  retryCount?: number;
  metadata?: {
    workflowTitle?: string;
    stepIndex?: number;
    totalSteps?: number;
  };
}

export interface JobProgress {
  workflowId: string;
  stepId?: string;
  status: 'pending' | 'active' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  message?: string;
  data?: any;
  error?: {
    message: string;
    code?: string;
    stack?: string;
    retryable?: boolean;
  };
  timing?: {
    startedAt?: Date;
    completedAt?: Date;
    duration?: number; // milliseconds
  };
}

export interface QueueConfig {
  name: string;
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  defaultJobOptions?: {
    removeOnComplete?: number;
    removeOnFail?: number;
    attempts?: number;
    backoff?: {
      type: 'fixed' | 'exponential';
      delay: number;
    };
    delay?: number;
  };
}

export interface WorkerConfig {
  queueName: string;
  concurrency: number;
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  processors: {
    [jobType: string]: (job: any) => Promise<any>;
  };
}

// Job Status Updates
export interface JobStatusUpdate {
  jobId: string;
  workflowId: string;
  stepId?: string;
  status: JobProgress['status'];
  progress: number;
  message?: string;
  data?: any;
  error?: JobProgress['error'];
  timestamp: Date;
}

// Queue Events
export type QueueEvent = 
  | { type: 'workflow.queued'; data: { workflowId: string; jobId: string } }
  | { type: 'workflow.started'; data: { workflowId: string; jobId: string } }
  | { type: 'workflow.progress'; data: JobStatusUpdate }
  | { type: 'workflow.completed'; data: { workflowId: string; jobId: string; result: any } }
  | { type: 'workflow.failed'; data: { workflowId: string; jobId: string; error: JobProgress['error'] } }
  | { type: 'step.started'; data: { workflowId: string; stepId: string; jobId: string } }
  | { type: 'step.progress'; data: JobStatusUpdate }
  | { type: 'step.completed'; data: { workflowId: string; stepId: string; jobId: string; result: any } }
  | { type: 'step.failed'; data: { workflowId: string; stepId: string; jobId: string; error: JobProgress['error'] } }; 