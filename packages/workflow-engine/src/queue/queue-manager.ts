import { EventEmitter } from 'events';
import {
  QueueConfig,
  WorkerConfig,
  WorkflowJobData,
  StepJobData,
  QueueEvent,
  JobStatusUpdate
} from '../types';
import { WorkflowQueue } from './workflow-queue';
import { WorkflowWorker } from './workflow-worker';
import { WorkflowEngine } from '../workflow-engine';

export interface QueueManagerConfig {
  queue: QueueConfig;
  worker: WorkerConfig;
  workflowEngine?: WorkflowEngine;
}

export class QueueManager extends EventEmitter {
  private queue: WorkflowQueue;
  private worker: WorkflowWorker;
  private workflowEngine: WorkflowEngine;
  private isInitialized = false;

  constructor(private config: QueueManagerConfig) {
    super();
    
    // Initialize workflow engine
    this.workflowEngine = config.workflowEngine || new WorkflowEngine({
      providers: {},
      storage: { type: 'memory', config: {} },
      logging: { level: 'info', storage: 'memory' }
    });

    // Initialize queue and worker
    this.queue = new WorkflowQueue(config.queue);
    this.worker = new WorkflowWorker(config.worker, this.workflowEngine);

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Queue events
    this.queue.on('queue.event', (event: QueueEvent) => {
      this.emit('queue.event', event);
    });

    this.queue.on('job.waiting', (data) => {
      this.emit('job.waiting', data);
    });

    this.queue.on('job.active', (data) => {
      this.emit('job.active', data);
    });

    this.queue.on('job.completed', (data) => {
      this.emit('job.completed', data);
    });

    this.queue.on('job.failed', (data) => {
      this.emit('job.failed', data);
    });

    this.queue.on('job.progress', (data) => {
      this.emit('job.progress', data);
    });

    this.queue.on('error', (error) => {
      console.error('Queue error:', error);
      this.emit('error', error);
    });

    // Worker events
    this.worker.on('job.update', (update: JobStatusUpdate) => {
      this.emit('job.update', update);
    });

    this.worker.on('queue.event', (event: QueueEvent) => {
      this.emit('queue.event', event);
    });

    this.worker.on('ready', () => {
      console.log('✅ WorkflowWorker is ready');
      this.emit('worker.ready');
    });

    this.worker.on('error', (error) => {
      console.error('Worker error:', error);
      this.emit('worker.error', error);
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('QueueManager already initialized');
      return;
    }

    try {
      console.log('🚀 Initializing QueueManager...');
      
      // Wait for worker to be ready
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Worker initialization timeout'));
        }, 10000); // 10 second timeout

        this.worker.once('ready', () => {
          clearTimeout(timeout);
          resolve();
        });

        this.worker.once('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      this.isInitialized = true;
      console.log('✅ QueueManager initialized successfully');
      this.emit('ready');

    } catch (error) {
      console.error('❌ QueueManager initialization failed:', error);
      throw error;
    }
  }

  // Workflow job management
  async queueWorkflow(
    workflowData: WorkflowJobData,
    options?: {
      priority?: number;
      delay?: number;
      attempts?: number;
    }
  ): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('QueueManager not initialized. Call initialize() first.');
    }

    return this.queue.addWorkflowJob(workflowData, options);
  }

  async queueStep(
    stepData: StepJobData,
    options?: {
      priority?: number;
      delay?: number;
      attempts?: number;
    }
  ): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('QueueManager not initialized. Call initialize() first.');
    }

    return this.queue.addStepJob(stepData, options);
  }

  // Job status and management
  async getJobStatus(jobId: string) {
    return this.queue.getJobStatus(jobId);
  }

  async cancelJob(jobId: string): Promise<boolean> {
    return this.queue.cancelJob(jobId);
  }

  async retryFailedJobs(): Promise<void> {
    return this.queue.retryFailedJobs();
  }

  // Queue management
  async pauseQueue(): Promise<void> {
    await this.queue.pauseQueue();
    console.log('🔸 Queue paused');
  }

  async resumeQueue(): Promise<void> {
    await this.queue.resumeQueue();
    console.log('🔸 Queue resumed');
  }

  async pauseWorker(): Promise<void> {
    await this.worker.pauseWorker();
  }

  async resumeWorker(): Promise<void> {
    await this.worker.resumeWorker();
  }

  async cleanQueue(grace: number = 5000): Promise<void> {
    await this.queue.cleanQueue(grace);
    console.log('🧹 Queue cleaned');
  }

  // Monitoring and statistics
  async getQueueStats() {
    return this.queue.getQueueStats();
  }

  getWorkerStats() {
    return this.worker.getWorkerStats();
  }

  async getActiveWorkflows() {
    return this.queue.getActiveWorkflows();
  }

  getEngineStats() {
    return this.workflowEngine.getEngineStats();
  }

  async getFullStats() {
    const [queueStats, workerStats, engineStats, activeWorkflows] = await Promise.all([
      this.getQueueStats(),
      Promise.resolve(this.getWorkerStats()),
      Promise.resolve(this.getEngineStats()),
      this.getActiveWorkflows()
    ]);

    return {
      queue: queueStats,
      worker: workerStats,
      engine: engineStats,
      activeWorkflows,
      isInitialized: this.isInitialized,
      timestamp: new Date().toISOString()
    };
  }

  // Workflow engine access
  getWorkflowEngine(): WorkflowEngine {
    return this.workflowEngine;
  }

  // Health check
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    checks: Record<string, boolean>;
    details?: Record<string, any>;
  }> {
    try {
      const [queueStats, workerStats] = await Promise.all([
        this.getQueueStats().catch(() => null),
        Promise.resolve(this.getWorkerStats()).catch(() => null)
      ]);

      const checks = {
        initialized: this.isInitialized,
        queueConnected: queueStats !== null,
        workerRunning: workerStats?.isRunning || false,
        engineReady: true // Workflow engine is always ready if constructed
      };

      const allChecksPass = Object.values(checks).every(check => check === true);

      return {
        status: allChecksPass ? 'healthy' : 'unhealthy',
        checks,
        details: {
          queueStats,
          workerStats,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        checks: {
          initialized: this.isInitialized,
          queueConnected: false,
          workerRunning: false,
          engineReady: false
        },
        details: {
          error: (error as Error).message,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  // Cleanup
  async close(): Promise<void> {
    console.log('🔸 Closing QueueManager...');
    
    try {
      await Promise.all([
        this.worker.close(),
        this.queue.close()
      ]);
      
      this.isInitialized = false;
      console.log('✅ QueueManager closed successfully');
      
    } catch (error) {
      console.error('❌ Error closing QueueManager:', error);
      throw error;
    }
  }

  // Event emission utilities
  emitJobUpdate(update: JobStatusUpdate): void {
    this.emit('job.update', update);
  }

  emitQueueEvent(event: QueueEvent): void {
    this.emit('queue.event', event);
  }
} 