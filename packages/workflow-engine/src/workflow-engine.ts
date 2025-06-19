import { EventEmitter } from 'events';
import {
  WorkflowConfig,
  WorkflowStepConfig,
  WorkflowExecutionContext,
  WorkflowStatus,
  WorkflowProgress,
  WorkflowEngineConfig,
  WorkflowEventData,
  WorkflowError,
  StepExecutionResult
} from './types';
import { WorkflowStep } from './workflow-step';
import { ProviderRegistry } from './providers/provider-registry';
import { 
  OpenAIScriptProvider, 
  AnthropicScriptProvider,
  GeminiScriptProvider 
} from './providers/script-generation';
import {
  VeoVideoProvider,
  RunwayVideoProvider,
  PikaVideoProvider,
  HeyGenVideoProvider
} from './providers/video-creation';
import { ElevenLabsVoiceProvider } from './providers/voice-synthesis';
import { GoogleDriveStorageProvider } from './providers/storage';
import {
  YouTubePublishingProvider,
  InstagramPublishingProvider,
  TikTokPublishingProvider
} from './providers/publishing';
import { resolveVariables, getExecutionOrder } from './utils/workflow-parser';

export class WorkflowEngine extends EventEmitter {
  private providerRegistry: ProviderRegistry;
  private runningWorkflows = new Map<string, WorkflowExecutionContext>();
  private config: WorkflowEngineConfig;

  constructor(config: WorkflowEngineConfig) {
    super();
    this.config = config;
    this.providerRegistry = new ProviderRegistry();
    this.initializeDefaultProviders();
  }

  private initializeDefaultProviders(): void {
    // Register script generation providers
    this.providerRegistry.registerProvider(new OpenAIScriptProvider());
    this.providerRegistry.registerProvider(new AnthropicScriptProvider());
    this.providerRegistry.registerProvider(new GeminiScriptProvider());

    // Register video creation providers
    this.providerRegistry.registerProvider(new VeoVideoProvider());
    this.providerRegistry.registerProvider(new RunwayVideoProvider());
    this.providerRegistry.registerProvider(new PikaVideoProvider());
    this.providerRegistry.registerProvider(new HeyGenVideoProvider());

    // Register voice synthesis providers
    this.providerRegistry.registerProvider(new ElevenLabsVoiceProvider());

    // Register storage providers
    this.providerRegistry.registerProvider(new GoogleDriveStorageProvider());

    // Register publishing providers
    this.providerRegistry.registerProvider(new YouTubePublishingProvider());
    this.providerRegistry.registerProvider(new InstagramPublishingProvider());
    this.providerRegistry.registerProvider(new TikTokPublishingProvider());

    console.log('[WorkflowEngine] Default providers initialized');
    this.providerRegistry.listProviders();
  }

  async executeWorkflow(
    workflow: WorkflowConfig,
    variables: Record<string, any> = {},
    options: {
      projectId?: string;
      userId?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<WorkflowExecutionContext> {
    const workflowId = `${workflow.id}-${Date.now()}`;
    
    // Create execution context
    const context: WorkflowExecutionContext = {
      workflowId,
      projectId: options.projectId || 'default',
      userId: options.userId || 'system',
      variables: { ...variables },
      startTime: new Date(),
      status: 'running',
      stepResults: {},
      metadata: options.metadata
    };

    this.runningWorkflows.set(workflowId, context);
    this.log('info', `Starting workflow execution: ${workflow.name}`, { workflowId });

    try {
      await this.emitEvent('workflow.started', workflowId, {
        workflowName: workflow.name,
        stepCount: workflow.steps.length
      });

      // Get execution order based on dependencies
      const executionOrder = getExecutionOrder(workflow.steps);
      this.log('info', `Execution order: ${executionOrder.join(' -> ')}`, { workflowId });

      // Execute steps in order
      for (const stepId of executionOrder) {
        const stepConfig = workflow.steps.find(s => s.id === stepId);
        if (!stepConfig) {
          throw new WorkflowError(
            `Step configuration not found: ${stepId}`,
            workflowId,
            stepId
          );
        }

        context.currentStep = stepId;
        await this.executeStep(stepConfig, context, workflow);

        // Check if workflow should continue
        if (context.status === 'failed' && workflow.onError === 'stop') {
          break;
        }
      }

      // Determine final status
      const hasFailedSteps = Object.values(context.stepResults).some(
        result => result.status === 'failed'
      );

      if (hasFailedSteps) {
        context.status = 'failed';
        await this.emitEvent('workflow.failed', workflowId, {
          failedSteps: Object.values(context.stepResults)
            .filter(r => r.status === 'failed')
            .map(r => r.stepId)
        });
      } else {
        context.status = 'completed';
        await this.emitEvent('workflow.completed', workflowId, {
          duration: Date.now() - context.startTime.getTime(),
          stepResults: Object.keys(context.stepResults)
        });
      }

      context.endTime = new Date();
      this.log('info', `Workflow execution ${context.status}: ${workflow.name}`, { 
        workflowId, 
        duration: context.endTime.getTime() - context.startTime.getTime() 
      });

      return context;

    } catch (error) {
      context.status = 'failed';
      context.endTime = new Date();
      
      this.log('error', `Workflow execution failed: ${error}`, { workflowId });
      await this.emitEvent('workflow.failed', workflowId, { error: (error as Error).message });
      
      throw error;
    } finally {
      this.runningWorkflows.delete(workflowId);
    }
  }

  private async executeStep(
    stepConfig: WorkflowStepConfig,
    context: WorkflowExecutionContext,
    workflow: WorkflowConfig
  ): Promise<void> {
    const { workflowId } = context;
    
    this.log('info', `Executing step: ${stepConfig.name}`, { workflowId, stepId: stepConfig.id });

    try {
      // Get provider
      const provider = this.providerRegistry.getProvider(stepConfig.provider);
      
      // Create workflow step
      const step = new WorkflowStep(stepConfig, provider);

      // Check if step should be executed based on condition
      if (!step.canExecute(context.variables)) {
        this.log('info', `Skipping step due to condition: ${stepConfig.condition}`, {
          workflowId,
          stepId: stepConfig.id
        });
        
        context.stepResults[stepConfig.id] = {
          stepId: stepConfig.id,
          status: 'skipped',
          startTime: new Date(),
          endTime: new Date(),
          inputs: {},
          retryCount: 0,
          logs: ['Step skipped due to condition']
        };
        return;
      }

      await this.emitEvent('step.started', workflowId, stepConfig.id, {
        stepName: stepConfig.name,
        provider: stepConfig.provider
      });

      // Resolve step inputs with variables and previous step results
      const resolvedInputs = resolveVariables(
        stepConfig.inputs || {},
        context.variables,
        context.stepResults
      );

      // Execute the step
      const result = await step.execute(resolvedInputs);
      context.stepResults[stepConfig.id] = result;

      if (result.status === 'completed') {
        // Update context variables with step outputs
        if (result.outputs) {
          for (const [key, value] of Object.entries(result.outputs)) {
            context.variables[`${stepConfig.id}.${key}`] = value;
          }
        }

        await this.emitEvent('step.completed', workflowId, stepConfig.id, {
          outputs: result.outputs,
          duration: result.endTime && result.startTime 
            ? result.endTime.getTime() - result.startTime.getTime() 
            : 0
        });

        this.log('info', `Step completed: ${stepConfig.name}`, {
          workflowId,
          stepId: stepConfig.id,
          duration: result.endTime && result.startTime 
            ? result.endTime.getTime() - result.startTime.getTime() 
            : 0
        });
      } else {
        await this.emitEvent('step.failed', workflowId, stepConfig.id, {
          error: result.error,
          retryCount: result.retryCount
        });

        this.log('error', `Step failed: ${stepConfig.name}`, {
          workflowId,
          stepId: stepConfig.id,
          error: result.error
        });

        // Handle workflow error policy
        if (workflow.onError === 'stop') {
          context.status = 'failed';
          throw new WorkflowError(
            `Step ${stepConfig.id} failed: ${result.error}`,
            workflowId,
            stepConfig.id
          );
        }
      }

    } catch (error) {
      const errorMessage = (error as Error).message;
      
      context.stepResults[stepConfig.id] = {
        stepId: stepConfig.id,
        status: 'failed',
        startTime: new Date(),
        endTime: new Date(),
        inputs: {},
        error: errorMessage,
        retryCount: 0,
        logs: [`Step execution failed: ${errorMessage}`]
      };

      await this.emitEvent('step.failed', workflowId, stepConfig.id, {
        error: errorMessage
      });

      throw error;
    }
  }

  async cancelWorkflow(workflowId: string): Promise<boolean> {
    const context = this.runningWorkflows.get(workflowId);
    if (!context) {
      return false;
    }

    context.status = 'cancelled';
    context.endTime = new Date();

    await this.emitEvent('workflow.cancelled', workflowId, {
      reason: 'User requested cancellation'
    });

    this.log('info', `Workflow cancelled: ${workflowId}`);
    this.runningWorkflows.delete(workflowId);
    
    return true;
  }

  getWorkflowProgress(workflowId: string): WorkflowProgress | null {
    const context = this.runningWorkflows.get(workflowId);
    if (!context) {
      return null;
    }

    const totalSteps = Object.keys(context.stepResults).length;
    const completedSteps = Object.values(context.stepResults).filter(
      result => result.status === 'completed'
    ).length;

    const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    return {
      workflowId,
      totalSteps,
      completedSteps,
      currentStep: context.currentStep || null,
      status: context.status,
      progress,
      errors: Object.values(context.stepResults)
        .filter(result => result.error)
        .map(result => result.error!)
    };
  }

  getRunningWorkflows(): string[] {
    return Array.from(this.runningWorkflows.keys());
  }

  getProviderRegistry(): ProviderRegistry {
    return this.providerRegistry;
  }

  private async emitEvent(
    type: string,
    workflowId: string,
    stepId?: string | Record<string, any>,
    data?: Record<string, any>
  ): Promise<void> {
    let eventData: WorkflowEventData;
    
    if (typeof stepId === 'string') {
      eventData = {
        type: type as any,
        workflowId,
        stepId,
        timestamp: new Date(),
        data: data || {}
      };
    } else {
      eventData = {
        type: type as any,
        workflowId,
        timestamp: new Date(),
        data: stepId || {}
      };
    }

    this.emit('workflow-event', eventData);
    this.emit(type, eventData);
  }

  private log(level: 'info' | 'warn' | 'error', message: string, context?: Record<string, any>): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [WorkflowEngine] ${level.toUpperCase()}: ${message}`;
    
    if (level === 'error') {
      console.error(logMessage, context || '');
    } else if (level === 'warn') {
      console.warn(logMessage, context || '');
    } else {
      console.log(logMessage, context || '');
    }
  }

  // Utility methods
  async validateWorkflow(workflow: WorkflowConfig): Promise<boolean> {
    try {
      // Validate all providers are available
      for (const step of workflow.steps) {
        if (!this.providerRegistry.hasProvider(step.provider)) {
          throw new Error(`Provider not found: ${step.provider}`);
        }
        
        // Validate provider configuration
        if (!this.providerRegistry.validateProvider(step.provider, step.config)) {
          throw new Error(`Invalid configuration for provider: ${step.provider}`);
        }
      }
      
      return true;
    } catch (error) {
      this.log('error', `Workflow validation failed: ${error}`);
      return false;
    }
  }

  getEngineStats(): Record<string, any> {
    return {
      runningWorkflows: this.runningWorkflows.size,
      workflowIds: Array.from(this.runningWorkflows.keys()),
      providers: this.providerRegistry.getProviderStats(),
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };
  }
} 