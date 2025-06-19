import { Queue, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { EventEmitter } from 'events';
import {
  WorkflowJobData,
  StepJobData,
  QueueConfig,
  QueueEvent,
  JobStatusUpdate
} from '../types';

export class WorkflowQueue extends EventEmitter {
  private queue: Queue;
  private queueEvents: QueueEvents;
  private redis: IORedis;

  constructor(private config: QueueConfig) {
    super();
    
    // Initialize Redis connection
    this.redis = new IORedis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db || 0,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    // Initialize BullMQ Queue
    this.queue = new Queue(config.name, {
      connection: this.redis,
      defaultJobOptions: {
        removeOnComplete: config.defaultJobOptions?.removeOnComplete || 50,
        removeOnFail: config.defaultJobOptions?.removeOnFail || 100,
        attempts: config.defaultJobOptions?.attempts || 3,
        backoff: {
          type: config.defaultJobOptions?.backoff?.type || 'exponential',
          delay: config.defaultJobOptions?.backoff?.delay || 2000,
        },
        ...config.defaultJobOptions,
      },
    });

    // Initialize Queue Events for monitoring
    this.queueEvents = new QueueEvents(config.name, {
      connection: this.redis,
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Queue event listeners for progress tracking
    this.queueEvents.on('waiting', ({ jobId }) => {
      this.emit('job.waiting', { jobId });
    });

    this.queueEvents.on('active', ({ jobId }) => {
      this.emit('job.active', { jobId });
    });

    this.queueEvents.on('completed', ({ jobId, returnvalue }) => {
      this.emit('job.completed', { jobId, result: returnvalue });
    });

    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      this.emit('job.failed', { jobId, error: failedReason });
    });

    this.queueEvents.on('progress', ({ jobId, data }) => {
      this.emit('job.progress', { jobId, progress: data });
    });

    // Redis connection events
    this.redis.on('connect', () => {
      console.log('✅ Redis connected for WorkflowQueue');
    });

    this.redis.on('error', (error) => {
      console.error('❌ Redis connection error:', error);
      this.emit('error', error);
    });
  }

  async addWorkflowJob(
    workflowData: WorkflowJobData,
    options?: {
      priority?: number;
      delay?: number;
      attempts?: number;
    }
  ): Promise<string> {
    try {
      const job = await this.queue.add('workflow', workflowData, {
        priority: options?.priority,
        delay: options?.delay,
        attempts: options?.attempts,
        jobId: workflowData.workflowId, // Use workflowId as jobId for easy tracking
      });

      const queueEvent: QueueEvent = {
        type: 'workflow.queued',
        data: { workflowId: workflowData.workflowId, jobId: job.id! }
      };
      
      this.emit('queue.event', queueEvent);
      
      return job.id!;
    } catch (error) {
      console.error('Failed to add workflow job:', error);
      throw error;
    }
  }

  async addStepJob(
    stepData: StepJobData,
    options?: {
      priority?: number;
      delay?: number;
      attempts?: number;
    }
  ): Promise<string> {
    try {
      const jobId = `${stepData.workflowId}-${stepData.stepId}`;
      const job = await this.queue.add('step', stepData, {
        priority: options?.priority,
        delay: options?.delay,
        attempts: options?.attempts,
        jobId,
      });

      const queueEvent: QueueEvent = {
        type: 'step.started',
        data: { 
          workflowId: stepData.workflowId, 
          stepId: stepData.stepId,
          jobId: job.id! 
        }
      };
      
      this.emit('queue.event', queueEvent);
      
      return job.id!;
    } catch (error) {
      console.error('Failed to add step job:', error);
      throw error;
    }
  }

  async getJobStatus(jobId: string) {
    try {
      const job = await this.queue.getJob(jobId);
      if (!job) {
        return null;
      }

      return {
        id: job.id,
        name: job.name,
        data: job.data,
        progress: job.progress,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        failedReason: job.failedReason,
        returnvalue: job.returnvalue,
        attemptsMade: job.attemptsMade,
      };
    } catch (error) {
      console.error('Failed to get job status:', error);
      throw error;
    }
  }

  async cancelJob(jobId: string): Promise<boolean> {
    try {
      const job = await this.queue.getJob(jobId);
      if (!job) {
        return false;
      }

      await job.remove();
      return true;
    } catch (error) {
      console.error('Failed to cancel job:', error);
      throw error;
    }
  }

  async getQueueStats() {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.queue.getWaiting(),
        this.queue.getActive(),
        this.queue.getCompleted(),
        this.queue.getFailed(),
        this.queue.getDelayed(),
      ]);

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        total: waiting.length + active.length + completed.length + failed.length + delayed.length,
      };
    } catch (error) {
      console.error('Failed to get queue stats:', error);
      throw error;
    }
  }

  async pauseQueue(): Promise<void> {
    await this.queue.pause();
  }

  async resumeQueue(): Promise<void> {
    await this.queue.resume();
  }

  async cleanQueue(grace: number = 5000): Promise<void> {
    // Clean completed jobs older than 5 seconds
    await this.queue.clean(grace, 0, 'completed');
    // Clean failed jobs older than 5 seconds  
    await this.queue.clean(grace, 0, 'failed');
  }

  async close(): Promise<void> {
    await this.queueEvents.close();
    await this.queue.close();
    await this.redis.quit();
  }

  // Utility methods for job management
  async retryFailedJobs(): Promise<void> {
    const failedJobs = await this.queue.getFailed();
    
    for (const job of failedJobs) {
      await job.retry();
    }
  }

  async getActiveWorkflows(): Promise<{ workflowId: string; jobId: string; progress?: any }[]> {
    const activeJobs = await this.queue.getActive();
    
    return activeJobs
      .filter(job => job.name === 'workflow')
      .map(job => ({
        workflowId: job.data.workflowId,
        jobId: job.id!,
        progress: job.progress,
      }));
  }

  async emitStatusUpdate(update: JobStatusUpdate): Promise<void> {
    const queueEvent: QueueEvent = {
      type: 'workflow.progress',
      data: update
    };
    
    this.emit('queue.event', queueEvent);
  }
} 