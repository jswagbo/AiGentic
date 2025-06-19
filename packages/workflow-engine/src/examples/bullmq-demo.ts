import { QueueManager, QueueManagerConfig } from '../queue/queue-manager';
import { WorkflowJobData, WorkflowConfig, QueueEvent, JobStatusUpdate } from '../types';

/**
 * Demonstration of BullMQ integration with AIGentic Workflow Engine
 * 
 * This example shows how to:
 * 1. Set up a queue manager with Redis
 * 2. Queue workflow jobs for async processing 
 * 3. Monitor job progress and events
 * 4. Handle job completion and failures
 */

// Sample workflow configuration for content creation
const sampleWorkflow: WorkflowConfig = {
  id: 'content-creation-workflow',
  name: 'AI Content Creation Pipeline',
  description: 'Complete workflow from idea to published video',
  version: '1.0',
  steps: [
    {
      id: 'script-generation',
      name: 'Generate Script',
      type: 'script-generation',
      provider: 'openai-gpt',
      config: {
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 2000
      },
      inputs: {
        topic: '${workflow.topic}',
        duration: '${workflow.duration}',
        style: '${workflow.style}'
      },
      outputs: ['script', 'title', 'description']
    },
    {
      id: 'video-creation',
      name: 'Create Video',
      type: 'video-creation',
      provider: 'veo',
      config: {
        resolution: '1080p',
        duration: 60
      },
      inputs: {
        script: '${script-generation.script}',
        style: '${workflow.style}'
      },
      outputs: ['videoUrl', 'videoPath'],
      dependsOn: ['script-generation']
    },
    {
      id: 'voice-synthesis',
      name: 'Synthesize Voice',
      type: 'voice-synthesis',
      provider: 'elevenlabs',
      config: {
        voice: 'Adam',
        stability: 0.75,
        clarity: 0.75
      },
      inputs: {
        text: '${script-generation.script}',
        language: 'en'
      },
      outputs: ['audioUrl', 'audioPath'],
      dependsOn: ['script-generation']
    },
    {
      id: 'storage',
      name: 'Store Files',
      type: 'storage',
      provider: 'google-drive',
      config: {
        folderId: 'ai-videos'
      },
      inputs: {
        videoPath: '${video-creation.videoPath}',
        audioPath: '${voice-synthesis.audioPath}',
        metadata: {
          title: '${script-generation.title}',
          description: '${script-generation.description}'
        }
      },
      outputs: ['driveVideoUrl', 'driveAudioUrl'],
      dependsOn: ['video-creation', 'voice-synthesis']
    }
  ],
  onError: 'stop',
  maxRetries: 3,
  timeout: 600000 // 10 minutes
};

// Queue manager configuration
const queueConfig: QueueManagerConfig = {
  queue: {
    name: 'aigentic-workflows',
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0')
    },
    defaultJobOptions: {
      removeOnComplete: 50,
      removeOnFail: 100,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    }
  },
  worker: {
    queueName: 'aigentic-workflows',
    concurrency: 2, // Process 2 workflows concurrently
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0')
    },
    processors: {}
  }
};

export async function demonstrateBullMQIntegration(): Promise<void> {
  console.log('🚀 Starting BullMQ Workflow Integration Demo\n');

  // Initialize queue manager
  const queueManager = new QueueManager(queueConfig);

  // Set up event listeners for monitoring
  setupEventListeners(queueManager);

  try {
    // Initialize the queue manager
    console.log('📋 Initializing QueueManager...');
    await queueManager.initialize();
    console.log('✅ QueueManager initialized successfully\n');

    // Queue multiple workflow jobs
    console.log('📤 Queueing workflow jobs...');
    
    const workflows = [
      {
        topic: 'Artificial Intelligence and Machine Learning',
        duration: 90,
        style: 'educational',
        priority: 1
      },
      {
        topic: 'Climate Change Solutions',
        duration: 120,
        style: 'documentary',
        priority: 2
      },
      {
        topic: 'Space Exploration',
        duration: 60,
        style: 'narrative',
        priority: 3
      }
    ];

    const jobIds: string[] = [];

    for (const [index, workflowData] of workflows.entries()) {
      const jobData: WorkflowJobData = {
        workflowId: `workflow-${Date.now()}-${index}`,
        projectId: `project-${index + 1}`,
        userId: 'demo-user',
        workflowDefinition: sampleWorkflow,
        context: workflowData,
        priority: workflowData.priority,
        metadata: {
          title: `Content Creation: ${workflowData.topic}`,
          description: `${workflowData.style} style video about ${workflowData.topic}`,
          tags: ['ai-generated', workflowData.style],
          createdAt: new Date().toISOString()
        }
      };

      const jobId = await queueManager.queueWorkflow(jobData, {
        priority: workflowData.priority,
        attempts: 3
      });

      jobIds.push(jobId);
      console.log(`✅ Queued workflow: ${workflowData.topic} (Job ID: ${jobId})`);
    }

    console.log(`\n📊 Total jobs queued: ${jobIds.length}\n`);

    // Monitor queue statistics
    console.log('📈 Monitoring queue statistics...');
    const initialStats = await queueManager.getFullStats();
    console.log('Queue Stats:', JSON.stringify(initialStats.queue, null, 2));
    console.log('Worker Stats:', JSON.stringify(initialStats.worker, null, 2));

    // Wait for jobs to process (in a real app, you'd handle this via events)
    console.log('\n⏳ Processing jobs (this will take a few minutes)...');
    console.log('💡 Monitor the console output to see real-time progress\n');

    // Simulate monitoring for 2 minutes
    let monitoringTime = 0;
    const monitoringInterval = setInterval(async () => {
      try {
        const stats = await queueManager.getQueueStats();
        console.log(`[${monitoringTime}s] Active: ${stats.active}, Completed: ${stats.completed}, Failed: ${stats.failed}`);
        
        monitoringTime += 10;
        if (monitoringTime >= 120) { // 2 minutes
          clearInterval(monitoringInterval);
          await cleanupDemo(queueManager);
        }
      } catch (error) {
        console.error('Error getting stats:', error);
      }
    }, 10000); // Check every 10 seconds

  } catch (error) {
    console.error('❌ Demo failed:', error);
    await queueManager.close();
  }
}

function setupEventListeners(queueManager: QueueManager): void {
  console.log('🔧 Setting up event listeners...');

  // Queue events
  queueManager.on('queue.event', (event: QueueEvent) => {
    switch (event.type) {
      case 'workflow.queued':
        console.log(`📥 Workflow queued: ${event.data.workflowId}`);
        break;
      case 'workflow.started':
        console.log(`🏃 Workflow started: ${event.data.workflowId}`);
        break;
      case 'workflow.completed':
        console.log(`✅ Workflow completed: ${event.data.workflowId}`);
        break;
      case 'workflow.failed':
        console.log(`❌ Workflow failed: ${event.data.workflowId}`, event.data.error);
        break;
      case 'step.started':
        console.log(`🔄 Step started: ${event.data.stepId} in ${event.data.workflowId}`);
        break;
      case 'step.completed':
        console.log(`✓ Step completed: ${event.data.stepId} in ${event.data.workflowId}`);
        break;
    }
  });

  // Job status updates
  queueManager.on('job.update', (update: JobStatusUpdate) => {
    if (update.message) {
      console.log(`📊 ${update.workflowId} (${update.progress}%): ${update.message}`);
    }
  });

  // Worker events
  queueManager.on('worker.ready', () => {
    console.log('🟢 Worker is ready to process jobs');
  });

  queueManager.on('worker.error', (error) => {
    console.error('🔴 Worker error:', error.message);
  });

  // Health monitoring
  queueManager.on('error', (error) => {
    console.error('🔴 QueueManager error:', error.message);
  });

  console.log('✅ Event listeners configured\n');
}

async function cleanupDemo(queueManager: QueueManager): Promise<void> {
  console.log('\n🧹 Demo completed, cleaning up...');

  try {
    const finalStats = await queueManager.getFullStats();
    console.log('\n📈 Final Statistics:');
    console.log(`- Total jobs processed: ${finalStats.queue.completed + finalStats.queue.failed}`);
    console.log(`- Successfully completed: ${finalStats.queue.completed}`);
    console.log(`- Failed: ${finalStats.queue.failed}`);
    console.log(`- Still active: ${finalStats.queue.active}`);
    console.log(`- Waiting: ${finalStats.queue.waiting}`);

    // Clean up old jobs
    await queueManager.cleanQueue(1000); // Clean jobs older than 1 second
    console.log('✅ Queue cleaned');

    // Close the queue manager
    await queueManager.close();
    console.log('✅ QueueManager closed');

    console.log('\n🎉 BullMQ Integration Demo completed successfully!');
    console.log('\nKey Features Demonstrated:');
    console.log('✓ Async workflow job queuing');
    console.log('✓ Real-time progress tracking');
    console.log('✓ Event-driven monitoring');
    console.log('✓ Job retry and error handling');
    console.log('✓ Queue statistics and health checks');
    console.log('✓ Graceful cleanup and shutdown');

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

// Health check utility
export async function checkQueueHealth(queueManager: QueueManager): Promise<void> {
  console.log('🏥 Performing health check...');
  
  const health = await queueManager.healthCheck();
  console.log('Health Status:', health.status);
  console.log('Checks:', health.checks);
  
  if (health.status === 'unhealthy') {
    console.warn('⚠️  Queue system is unhealthy:', health.details);
  } else {
    console.log('✅ Queue system is healthy');
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateBullMQIntegration().catch(console.error);
} 