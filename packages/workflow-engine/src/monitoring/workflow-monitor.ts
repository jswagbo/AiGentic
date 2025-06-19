import { EventEmitter } from 'events';
import { Queue } from 'bullmq';
import { WorkflowEngine } from '../workflow-engine';
import { QueueManager } from '../queue/queue-manager';
import {
  WorkflowJobData,
  StepJobData,
  JobStatusUpdate,
  QueueEvent,
  WorkflowError
} from '../types';

export interface MonitoringConfig {
  deadLetterQueue: {
    enabled: boolean;
    maxRetries: number;
    retentionDays: number;
  };
  alerting: {
    webhookUrl?: string;
    emailRecipients?: string[];
    errorThreshold: number; // errors per hour
    alertCooldown: number; // minutes between alerts
  };
  recovery: {
    autoRetry: boolean;
    retryDelay: number; // minutes
    maxAutoRetries: number;
  };
  healthCheck: {
    interval: number; // seconds
    timeout: number; // seconds
  };
}

export interface HealthMetrics {
  status: 'healthy' | 'degraded' | 'critical';
  uptime: number;
  metrics: {
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    activeJobs: number;
    avgProcessingTime: number;
    errorRate: number;
    deadLetterCount: number;
  };
  lastCheck: Date;
  alerts: AlertRecord[];
}

export interface AlertRecord {
  id: string;
  type: 'error' | 'performance' | 'resource' | 'recovery';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
  context?: Record<string, any>;
}

export class WorkflowMonitor extends EventEmitter {
  private queueManager: QueueManager;
  private workflowEngine: WorkflowEngine;
  private config: MonitoringConfig;
  private deadLetterQueue: Queue;
  private healthMetrics: HealthMetrics;
  private alertHistory: AlertRecord[] = [];
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private lastAlertTime = new Map<string, Date>();
  private isRunning = false;

  constructor(
    queueManager: QueueManager,
    workflowEngine: WorkflowEngine,
    config: MonitoringConfig
  ) {
    super();
    this.queueManager = queueManager;
    this.workflowEngine = workflowEngine;
    this.config = config;

    // Initialize dead letter queue
    this.deadLetterQueue = new Queue('dead-letter-queue', {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    });

    // Initialize health metrics
    this.healthMetrics = {
      status: 'healthy',
      uptime: 0,
      metrics: {
        totalJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        activeJobs: 0,
        avgProcessingTime: 0,
        errorRate: 0,
        deadLetterCount: 0,
      },
      lastCheck: new Date(),
      alerts: [],
    };

    this.setupEventListeners();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('WorkflowMonitor already running');
      return;
    }

    console.log('🔍 Starting WorkflowMonitor...');
    this.isRunning = true;

    // Start health check interval
    this.healthCheckInterval = setInterval(
      () => this.performHealthCheck(),
      this.config.healthCheck.interval * 1000
    );

    // Initial health check
    await this.performHealthCheck();

    // Process existing dead letter items
    if (this.config.deadLetterQueue.enabled) {
      await this.processDeadLetterQueue();
    }

    console.log('✅ WorkflowMonitor started successfully');
    this.emit('monitor.started');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('🔸 Stopping WorkflowMonitor...');
    this.isRunning = false;

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    await this.deadLetterQueue.close();
    console.log('✅ WorkflowMonitor stopped');
    this.emit('monitor.stopped');
  }

  private setupEventListeners(): void {
    // Listen to queue manager events
    this.queueManager.on('job.failed', (data) => {
      this.handleJobFailure(data);
    });

    this.queueManager.on('job.completed', (data) => {
      this.handleJobCompletion(data);
    });

    this.queueManager.on('error', (error) => {
      this.handleSystemError(error);
    });

    // Listen to workflow engine events
    this.workflowEngine.on('workflow.failed', (event) => {
      this.handleWorkflowFailure(event);
    });

    this.workflowEngine.on('step.failed', (event) => {
      this.handleStepFailure(event);
    });
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const startTime = Date.now();
      
      // Get queue statistics
      const queueStats = await this.queueManager.getQueueStats();
      const queueHealth = await this.queueManager.healthCheck();
      
      // Get dead letter queue stats
      const deadLetterStats = await this.deadLetterQueue.getWaiting();
      
      // Calculate metrics
      const totalJobs = queueStats.waiting + queueStats.active + queueStats.completed + queueStats.failed;
      const errorRate = totalJobs > 0 ? (queueStats.failed / totalJobs) * 100 : 0;
      
      // Update health metrics
      this.healthMetrics = {
        status: this.determineOverallHealth(queueHealth, errorRate),
        uptime: process.uptime(),
        metrics: {
          totalJobs,
          completedJobs: queueStats.completed,
          failedJobs: queueStats.failed,
          activeJobs: queueStats.active,
          avgProcessingTime: 0, // TODO: Calculate from job history
          errorRate,
          deadLetterCount: deadLetterStats.length,
        },
        lastCheck: new Date(),
        alerts: this.alertHistory.filter(alert => !alert.resolved).slice(-10),
      };

      // Check for alert conditions
      await this.checkAlertConditions();
      
      const checkDuration = Date.now() - startTime;
      this.emit('health.checked', {
        metrics: this.healthMetrics,
        duration: checkDuration,
      });

    } catch (error) {
      console.error('Health check failed:', error);
      await this.createAlert('performance', 'critical', 'Health check failed', {
        error: (error as Error).message,
      });
    }
  }

  private determineOverallHealth(
    queueHealth: any,
    errorRate: number
  ): 'healthy' | 'degraded' | 'critical' {
    if (queueHealth.status === 'unhealthy') {
      return 'critical';
    }
    
    if (errorRate > 10) {
      return 'critical';
    }
    
    if (errorRate > 5) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  private async checkAlertConditions(): Promise<void> {
    const { metrics } = this.healthMetrics;
    
    // High error rate alert
    if (metrics.errorRate > this.config.alerting.errorThreshold) {
      await this.createAlert(
        'error',
        'high',
        `High error rate detected: ${metrics.errorRate.toFixed(2)}%`,
        { errorRate: metrics.errorRate, threshold: this.config.alerting.errorThreshold }
      );
    }

    // Dead letter queue alert
    if (metrics.deadLetterCount > 10) {
      await this.createAlert(
        'error',
        'medium',
        `Dead letter queue accumulating: ${metrics.deadLetterCount} items`,
        { deadLetterCount: metrics.deadLetterCount }
      );
    }

    // System health alert
    if (this.healthMetrics.status === 'critical') {
      await this.createAlert(
        'resource',
        'critical',
        'System health is critical',
        { status: this.healthMetrics.status, metrics }
      );
    }
  }

  private async createAlert(
    type: AlertRecord['type'],
    severity: AlertRecord['severity'],
    message: string,
    context?: Record<string, any>
  ): Promise<void> {
    const alertId = `${type}-${Date.now()}`;
    const alert: AlertRecord = {
      id: alertId,
      type,
      severity,
      message,
      timestamp: new Date(),
      resolved: false,
      context,
    };

    this.alertHistory.push(alert);
    
    // Check alert cooldown
    const lastAlert = this.lastAlertTime.get(`${type}-${severity}`);
    const cooldownMs = this.config.alerting.alertCooldown * 60 * 1000;
    
    if (!lastAlert || Date.now() - lastAlert.getTime() > cooldownMs) {
      await this.sendAlert(alert);
      this.lastAlertTime.set(`${type}-${severity}`, new Date());
    }

    this.emit('alert.created', alert);
  }

  private async sendAlert(alert: AlertRecord): Promise<void> {
    try {
      const payload = {
        text: `🚨 AIGentic Workflow Alert: ${alert.message}`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `${alert.severity.toUpperCase()} Alert: ${alert.type}`,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Message:* ${alert.message}`,
              },
              {
                type: 'mrkdwn',
                text: `*Severity:* ${alert.severity}`,
              },
              {
                type: 'mrkdwn',
                text: `*Time:* ${alert.timestamp.toLocaleString()}`,
              },
              {
                type: 'mrkdwn',
                text: `*System Status:* ${this.healthMetrics.status}`,
              },
            ],
          },
        ],
      };

      if (alert.context) {
        payload.blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Context:*\n\`\`\`${JSON.stringify(alert.context, null, 2)}\`\`\``,
          },
        });
      }

      // Send webhook alert
      if (this.config.alerting.webhookUrl) {
        const response = await fetch(this.config.alerting.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          console.error('Failed to send webhook alert:', response.statusText);
        }
      }

      console.log(`🚨 Alert sent: ${alert.message}`);
      
    } catch (error) {
      console.error('Failed to send alert:', error);
    }
  }

  private async handleJobFailure(data: any): Promise<void> {
    console.log(`❌ Job failed: ${data.jobId}`);
    
    if (this.config.deadLetterQueue.enabled) {
      // Move to dead letter queue
      await this.moveToDeadLetterQueue(data);
    }

    // Check if auto-retry is enabled
    if (this.config.recovery.autoRetry) {
      await this.scheduleAutoRetry(data);
    }
  }

  private async handleJobCompletion(data: any): Promise<void> {
    console.log(`✅ Job completed: ${data.jobId}`);
    // Could track completion metrics here
  }

  private async handleSystemError(error: Error): Promise<void> {
    await this.createAlert(
      'error',
      'high',
      `System error: ${error.message}`,
      { stack: error.stack }
    );
  }

  private async handleWorkflowFailure(event: any): Promise<void> {
    await this.createAlert(
      'error',
      'medium',
      `Workflow failed: ${event.workflowId}`,
      { workflowId: event.workflowId, error: event.error }
    );
  }

  private async handleStepFailure(event: any): Promise<void> {
    await this.createAlert(
      'error',
      'low',
      `Step failed: ${event.stepId} in workflow ${event.workflowId}`,
      { workflowId: event.workflowId, stepId: event.stepId, error: event.error }
    );
  }

  private async moveToDeadLetterQueue(data: any): Promise<void> {
    try {
      await this.deadLetterQueue.add('failed-job', {
        originalJobData: data,
        failureReason: data.error,
        timestamp: new Date().toISOString(),
        retryCount: 0,
      });
      
      console.log(`📦 Moved job ${data.jobId} to dead letter queue`);
      
    } catch (error) {
      console.error('Failed to move job to dead letter queue:', error);
    }
  }

  private async scheduleAutoRetry(data: any): Promise<void> {
    // TODO: Implement auto-retry logic
    console.log(`🔄 Scheduling auto-retry for job ${data.jobId}`);
  }

  private async processDeadLetterQueue(): Promise<void> {
    try {
      const deadJobs = await this.deadLetterQueue.getWaiting();
      console.log(`📦 Processing ${deadJobs.length} items in dead letter queue`);
      
      // Could implement recovery logic here
      
    } catch (error) {
      console.error('Failed to process dead letter queue:', error);
    }
  }

  // Public API methods
  getHealthMetrics(): HealthMetrics {
    return { ...this.healthMetrics };
  }

  async getAlertHistory(limit = 50): Promise<AlertRecord[]> {
    return this.alertHistory.slice(-limit);
  }

  async resolveAlert(alertId: string): Promise<boolean> {
    const alert = this.alertHistory.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      this.emit('alert.resolved', alert);
      return true;
    }
    return false;
  }

  async retryDeadLetterJob(jobId: string): Promise<boolean> {
    try {
      // TODO: Implement dead letter job retry
      console.log(`🔄 Retrying dead letter job: ${jobId}`);
      return true;
    } catch (error) {
      console.error('Failed to retry dead letter job:', error);
      return false;
    }
  }

  async purgeDeadLetterQueue(): Promise<number> {
    try {
      const jobs = await this.deadLetterQueue.getWaiting();
      await this.deadLetterQueue.drain();
      console.log(`🗑️ Purged ${jobs.length} items from dead letter queue`);
      return jobs.length;
    } catch (error) {
      console.error('Failed to purge dead letter queue:', error);
      return 0;
    }
  }
} 