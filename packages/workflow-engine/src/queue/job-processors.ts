import { Job } from 'bullmq';
import {
  WorkflowJobData,
  StepJobData,
  WorkflowConfig,
  WorkflowStepConfig
} from '../types';
import { WorkflowEngine } from '../workflow-engine';

export interface JobProcessorContext {
  workflowEngine: WorkflowEngine;
  logger?: (level: 'info' | 'warn' | 'error', message: string, context?: any) => void;
}

/**
 * Process a workflow job by executing all its steps
 */
export async function processWorkflowJob(
  job: Job<WorkflowJobData>,
  context: JobProcessorContext
): Promise<any> {
  const { workflowId, workflowDefinition, context: variables = {} } = job.data;
  const { workflowEngine, logger } = context;

  try {
    logger?.('info', `Starting workflow processing: ${workflowId}`, { jobId: job.id });
    
    // Update job progress
    await job.updateProgress({ percent: 5, message: 'Initializing workflow' });

    // Setup progress tracking for the workflow engine
    const progressHandler = (event: any) => {
      const percent = Math.min(95, 10 + (event.progress || 0) * 0.85);
      job.updateProgress({ 
        percent, 
        message: `Workflow progress: ${event.progress || 0}%` 
      });
    };

    const stepStartHandler = (event: any) => {
      job.updateProgress({ 
        percent: 20, 
        message: `Starting step: ${event.stepId}` 
      });
    };

    const stepCompleteHandler = (event: any) => {
      job.updateProgress({ 
        percent: 50, 
        message: `Completed step: ${event.stepId}` 
      });
    };

    // Attach event listeners
    workflowEngine.on('workflow.progress', progressHandler);
    workflowEngine.on('step.started', stepStartHandler);
    workflowEngine.on('step.completed', stepCompleteHandler);

    try {
      // Execute the workflow
      const result = await workflowEngine.executeWorkflow(
        workflowDefinition,
        variables,
        {
          projectId: job.data.projectId,
          userId: job.data.userId,
          metadata: job.data.metadata
        }
      );

      await job.updateProgress({ percent: 98, message: 'Workflow execution completed' });

      logger?.('info', `Workflow completed successfully: ${workflowId}`, { 
        jobId: job.id,
        duration: Date.now() - (job.processedOn || Date.now())
      });

      return {
        workflowId,
        status: result.status,
        result: {
          executionContext: result,
          stepResults: result.stepResults,
          completedSteps: Object.keys(result.stepResults).length,
          duration: result.endTime && result.startTime 
            ? result.endTime.getTime() - result.startTime.getTime() 
            : undefined
        },
        completedAt: new Date().toISOString(),
      };

    } finally {
      // Cleanup event listeners
      workflowEngine.off('workflow.progress', progressHandler);
      workflowEngine.off('step.started', stepStartHandler);
      workflowEngine.off('step.completed', stepCompleteHandler);
    }

  } catch (error) {
    logger?.('error', `Workflow processing failed: ${workflowId}`, { 
      jobId: job.id, 
      error: (error as Error).message 
    });
    throw error;
  }
}

/**
 * Process a single step job
 */
export async function processStepJob(
  job: Job<StepJobData>,
  context: JobProcessorContext
): Promise<any> {
  const { workflowId, stepId, stepDefinition, context: variables } = job.data;
  const { workflowEngine, logger } = context;

  try {
    logger?.('info', `Starting step processing: ${stepId}`, { 
      jobId: job.id, 
      workflowId 
    });

    await job.updateProgress({ percent: 10, message: `Initializing step: ${stepId}` });

    // Get the provider for this step
    const provider = workflowEngine.getProviderRegistry().getProvider(stepDefinition.provider);
    if (!provider) {
      throw new Error(`Provider not found: ${stepDefinition.provider}`);
    }

    await job.updateProgress({ 
      percent: 20, 
      message: `Executing step with provider: ${stepDefinition.provider}` 
    });

    // Resolve step inputs with context variables
    const resolvedInputs = stepDefinition.inputs ? 
      resolveStepInputs(stepDefinition.inputs, variables) : 
      {};

    await job.updateProgress({ percent: 30, message: 'Step inputs resolved' });

    // Execute the step through the provider
    const stepResult = await provider.execute(stepDefinition.config, resolvedInputs);

    await job.updateProgress({ percent: 90, message: `Step execution completed: ${stepId}` });

    logger?.('info', `Step completed successfully: ${stepId}`, { 
      jobId: job.id,
      workflowId,
      duration: Date.now() - (job.processedOn || Date.now())
    });

    return {
      workflowId,
      stepId,
      status: 'completed',
      result: stepResult,
      provider: stepDefinition.provider,
      completedAt: new Date().toISOString(),
      executionTime: Date.now() - (job.processedOn || Date.now()),
    };

  } catch (error) {
    logger?.('error', `Step processing failed: ${stepId}`, { 
      jobId: job.id,
      workflowId,
      error: (error as Error).message 
    });
    throw error;
  }
}

/**
 * Utility function to resolve step inputs with variables
 */
function resolveStepInputs(
  inputs: Record<string, any>,
  variables: Record<string, any>
): Record<string, any> {
  const resolved: Record<string, any> = {};

  for (const [key, value] of Object.entries(inputs)) {
    if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
      // Extract variable name
      const varName = value.slice(2, -1).trim();
      resolved[key] = variables[varName] ?? value;
    } else {
      resolved[key] = value;
    }
  }

  return resolved;
}

/**
 * Job processor factory that creates processors with the given context
 */
export function createJobProcessors(context: JobProcessorContext) {
  return {
    workflow: (job: Job<WorkflowJobData>) => processWorkflowJob(job, context),
    step: (job: Job<StepJobData>) => processStepJob(job, context),
  };
}

/**
 * Generic job processor that routes to the appropriate processor based on job name
 */
export async function routeJobProcessor(
  job: Job,
  context: JobProcessorContext
): Promise<any> {
  const processors = createJobProcessors(context);
  
  switch (job.name) {
    case 'workflow':
      return processors.workflow(job as Job<WorkflowJobData>);
    case 'step':
      return processors.step(job as Job<StepJobData>);
    default:
      throw new Error(`Unknown job type: ${job.name}`);
  }
} 