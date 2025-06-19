import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { EventEmitter } from 'events';
import {
  WorkflowJobData,
  StepJobData,
  WorkerConfig,
  QueueEvent,
  JobStatusUpdate
} from '../types';
import { WorkflowEngine } from '../workflow-engine';
import { ProviderRegistry } from '../providers/provider-registry';

export class WorkflowWorker extends EventEmitter {
  private worker: Worker;
  private redis: IORedis;
  private workflowEngine: WorkflowEngine;

  constructor(
    private config: WorkerConfig,
    workflowEngine?: WorkflowEngine
  ) {
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

    // Initialize or use provided workflow engine
    this.workflowEngine = workflowEngine || new WorkflowEngine({
      providers: {},
      storage: { type: 'memory', config: {} },
      logging: { level: 'info', storage: 'memory' }
    });

    // Initialize BullMQ Worker
    this.worker = new Worker(
      config.queueName,
      this.processJob.bind(this),
      {
        connection: this.redis,
        concurrency: config.concurrency,
      }
    );

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Worker event listeners
    this.worker.on('active', (job) => {
      console.log(`🔄 Job ${job.id} started processing`);
      this.emitJobUpdate(job, 'active', 0, 'Job started processing');
    });

    this.worker.on('completed', (job, result) => {
      console.log(`✅ Job ${job.id} completed successfully`);
      this.emitJobUpdate(job, 'completed', 100, 'Job completed successfully', result);
    });

    this.worker.on('failed', (job, error) => {
      console.error(`❌ Job ${job?.id} failed:`, error.message);
      this.emitJobUpdate(
        job!,
        'failed',
        0,
        'Job failed',
        undefined,
        {
          message: error.message,
          stack: error.stack,
          retryable: job?.attemptsMade! < (job?.opts.attempts || 3)
        }
      );
    });

    this.worker.on('progress', (job, progress) => {
      const progressData = typeof progress === 'object' && progress !== null ? progress : { percent: progress };
      this.emitJobUpdate(job, 'active', (progressData as any).percent || 0, (progressData as any).message);
    });

    // Redis connection events
    this.redis.on('connect', () => {
      console.log('✅ Redis connected for WorkflowWorker');
    });

    this.redis.on('error', (error) => {
      console.error('❌ Redis connection error:', error);
      this.emit('error', error);
    });

    // Worker lifecycle events
    this.worker.on('ready', () => {
      console.log(`🚀 WorkflowWorker ready - listening on queue: ${this.config.queueName}`);
      this.emit('ready');
    });

    this.worker.on('error', (error) => {
      console.error('Worker error:', error);
      this.emit('error', error);
    });
  }

  private async processJob(job: Job): Promise<any> {
    try {
      console.log(`Processing job: ${job.name} with ID: ${job.id}`);
      
      // Update job progress
      await job.updateProgress({ percent: 5, message: 'Job processing started' });

      switch (job.name) {
        case 'workflow':
          return await this.processWorkflowJob(job);
        case 'step':
          return await this.processStepJob(job);
        default:
          throw new Error(`Unknown job type: ${job.name}`);
      }
    } catch (error) {
      console.error(`Job processing failed for ${job.id}:`, error);
      throw error;
    }
  }

  private async processWorkflowJob(job: Job<WorkflowJobData>): Promise<any> {
    const { workflowId, workflowDefinition, context = {} } = job.data;
    
    try {
      // Update progress
      await job.updateProgress({ percent: 10, message: 'Starting workflow execution' });

      // Setup progress tracking
      this.workflowEngine.on('step.started', (event) => {
        job.updateProgress({ 
          percent: 20 + (event.stepIndex || 0) * 60 / (workflowDefinition.steps.length || 1),
          message: `Processing step: ${event.stepId}` 
        });
      });

      this.workflowEngine.on('step.completed', (event) => {
        job.updateProgress({ 
          percent: 30 + (event.stepIndex || 0) * 60 / (workflowDefinition.steps.length || 1),
          message: `Completed step: ${event.stepId}` 
        });
      });

      this.workflowEngine.on('workflow.progress', (event) => {
        job.updateProgress({
          percent: Math.min(90, 20 + event.progress * 0.7),
          message: `Workflow progress: ${event.progress}%`
        });
      });

      // Execute the workflow
      await job.updateProgress({ percent: 15, message: 'Executing workflow' });
      const result = await this.workflowEngine.executeWorkflow(workflowDefinition, context);

      await job.updateProgress({ percent: 95, message: 'Workflow execution completed' });

      return {
        workflowId,
        status: 'completed',
        result,
        completedAt: new Date().toISOString(),
        executionTime: Date.now() - (job.processedOn || Date.now()),
      };

    } catch (error) {
      console.error(`Workflow execution failed for ${workflowId}:`, error);
      throw error;
    }
  }

  private async processStepJob(job: Job<StepJobData>): Promise<any> {
    const { workflowId, stepId, stepDefinition, context } = job.data;
    
    try {
      await job.updateProgress({ percent: 10, message: `Starting step: ${stepId}` });

      // Get the provider for this step
      const provider = this.workflowEngine.getProviderRegistry().getProvider(stepDefinition.provider);
      if (!provider) {
        throw new Error(`Provider not found: ${stepDefinition.provider}`);
      }

      await job.updateProgress({ percent: 20, message: `Executing step with provider: ${stepDefinition.provider}` });

      // Execute the step
      const stepResult = await provider.execute(stepDefinition.config, stepDefinition.inputs || {});

      await job.updateProgress({ percent: 90, message: `Step execution completed: ${stepId}` });

      return {
        workflowId,
        stepId,
        status: 'completed',
        result: stepResult,
        completedAt: new Date().toISOString(),
        executionTime: Date.now() - (job.processedOn || Date.now()),
      };

    } catch (error) {
      console.error(`Step execution failed for ${stepId}:`, error);
      throw error;
    }
  }

  private emitJobUpdate(
    job: Job,
    status: JobStatusUpdate['status'],
    progress: number,
    message?: string,
    data?: any,
    error?: JobStatusUpdate['error']
  ): void {
    const update: JobStatusUpdate = {
      jobId: job.id!,
      workflowId: job.data?.workflowId || 'unknown',
      stepId: job.data?.stepId,
      status,
      progress,
      message,
      data,
      error,
      timestamp: new Date(),
    };

    this.emit('job.update', update);

    // Emit specific queue events
    const queueEvent: QueueEvent = {
      type: job.name === 'workflow' 
        ? (status === 'completed' ? 'workflow.completed' : 
           status === 'failed' ? 'workflow.failed' : 'workflow.progress')
        : (status === 'completed' ? 'step.completed' : 
           status === 'failed' ? 'step.failed' : 'step.progress'),
      data: job.name === 'workflow' 
        ? { workflowId: update.workflowId, jobId: update.jobId, ...(data && { result: data }) }
        : { workflowId: update.workflowId, stepId: update.stepId!, jobId: update.jobId, ...(data && { result: data }) }
    };

    this.emit('queue.event', queueEvent);
  }

  async pauseWorker(): Promise<void> {
    await this.worker.pause();
    console.log('🔸 WorkflowWorker paused');
  }

  async resumeWorker(): Promise<void> {
    await this.worker.resume();
    console.log('🔸 WorkflowWorker resumed');
  }

  async close(): Promise<void> {
    await this.worker.close();
    await this.redis.quit();
    console.log('🔸 WorkflowWorker closed');
  }

  getWorkerStats() {
    return {
      isRunning: this.worker.isRunning(),
      isPaused: this.worker.isPaused(),
      name: this.worker.name,
    };
  }
} 