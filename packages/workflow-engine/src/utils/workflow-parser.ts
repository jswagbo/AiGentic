import { WorkflowConfig, WorkflowStepConfig, WorkflowError } from '../types';

// Simple YAML parser implementation (replace with js-yaml in production)
export function parseWorkflowYaml(yamlString: string): WorkflowConfig {
  try {
    // For now, expect JSON format - replace with proper YAML parsing
    const config = JSON.parse(yamlString) as WorkflowConfig;
    return validateWorkflowConfig(config);
  } catch (error) {
    throw new WorkflowError(
      `Failed to parse workflow YAML: ${error}`,
      'unknown',
      undefined,
      'PARSE_ERROR'
    );
  }
}

export function validateWorkflowConfig(config: any): WorkflowConfig {
  // Basic validation
  if (!config.id) {
    throw new WorkflowError('Workflow ID is required', 'unknown', undefined, 'VALIDATION_ERROR');
  }
  
  if (!config.name) {
    throw new WorkflowError('Workflow name is required', config.id, undefined, 'VALIDATION_ERROR');
  }
  
  if (!config.version) {
    throw new WorkflowError('Workflow version is required', config.id, undefined, 'VALIDATION_ERROR');
  }
  
  if (!Array.isArray(config.steps) || config.steps.length === 0) {
    throw new WorkflowError('Workflow must have at least one step', config.id, undefined, 'VALIDATION_ERROR');
  }

  // Validate each step
  for (const step of config.steps) {
    validateStepConfig(step, config.id);
  }

  // Validate dependencies
  validateStepDependencies(config.steps, config.id);

  return config as WorkflowConfig;
}

function validateStepConfig(step: any, workflowId: string): void {
  if (!step.id) {
    throw new WorkflowError('Step ID is required', workflowId, undefined, 'VALIDATION_ERROR');
  }
  
  if (!step.name) {
    throw new WorkflowError('Step name is required', workflowId, step.id, 'VALIDATION_ERROR');
  }
  
  if (!step.type) {
    throw new WorkflowError('Step type is required', workflowId, step.id, 'VALIDATION_ERROR');
  }
  
  if (!step.provider) {
    throw new WorkflowError('Step provider is required', workflowId, step.id, 'VALIDATION_ERROR');
  }

  // Validate step configuration
  if (!step.config || typeof step.config !== 'object') {
    throw new WorkflowError('Step config must be an object', workflowId, step.id, 'VALIDATION_ERROR');
  }
}

function validateStepDependencies(steps: WorkflowStepConfig[], workflowId: string): void {
  const stepIds = new Set(steps.map(step => step.id));
  
  for (const step of steps) {
    if (step.dependsOn) {
      for (const depId of step.dependsOn) {
        if (!stepIds.has(depId)) {
          throw new WorkflowError(
            `Step ${step.id} depends on non-existent step: ${depId}`,
            workflowId,
            step.id,
            'VALIDATION_ERROR'
          );
        }
      }
    }
  }

  // Check for circular dependencies
  checkCircularDependencies(steps, workflowId);
}

function checkCircularDependencies(steps: WorkflowStepConfig[], workflowId: string): void {
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const stepMap = new Map(steps.map(step => [step.id, step]));

  function hasCycle(stepId: string): boolean {
    if (inStack.has(stepId)) {
      return true; // Cycle detected
    }
    
    if (visited.has(stepId)) {
      return false; // Already processed
    }

    visited.add(stepId);
    inStack.add(stepId);

    const step = stepMap.get(stepId);
    if (step?.dependsOn) {
      for (const depId of step.dependsOn) {
        if (hasCycle(depId)) {
          return true;
        }
      }
    }

    inStack.delete(stepId);
    return false;
  }

  for (const step of steps) {
    if (hasCycle(step.id)) {
      throw new WorkflowError(
        `Circular dependency detected involving step: ${step.id}`,
        workflowId,
        step.id,
        'VALIDATION_ERROR'
      );
    }
  }
}

export function createWorkflow(config: WorkflowConfig | string): WorkflowConfig {
  if (typeof config === 'string') {
    return parseWorkflowYaml(config);
  }
  
  return validateWorkflowConfig(config);
}

// Utility to create sample workflow configurations
export function createSampleWorkflow(topic: string): WorkflowConfig {
  return {
    id: `workflow-${Date.now()}`,
    name: `AI Video Creation: ${topic}`,
    description: `Automated video creation workflow for ${topic}`,
    version: '1.0.0',
    onError: 'stop',
    maxRetries: 3,
    timeout: 600000, // 10 minutes
    steps: [
      {
        id: 'generate-script',
        name: 'Generate Script',
        type: 'script-generation',
        provider: 'openai-script',
        config: {
          apiKey: '${OPENAI_API_KEY}',
          model: 'gpt-4',
          temperature: 0.7
        },
        inputs: {
          topic,
          duration: 5,
          style: 'educational'
        },
        outputs: ['script', 'title', 'description', 'keywords'],
        retry: {
          maxAttempts: 3,
          delay: 2000,
          backoff: 'exponential'
        }
      },
      {
        id: 'create-video',
        name: 'Create Video',
        type: 'video-creation',
        provider: 'veo-video',
        config: {
          apiKey: '${VEO_API_KEY}',
          quality: 'high'
        },
        inputs: {
          script: '${generate-script.script}',
          style: 'professional',
          duration: '${generate-script.estimatedDuration}'
        },
        outputs: ['videoUrl', 'thumbnailUrl', 'metadata'],
        dependsOn: ['generate-script'],
        retry: {
          maxAttempts: 2,
          delay: 5000,
          backoff: 'linear'
        }
      },
      {
        id: 'synthesize-voice',
        name: 'Synthesize Voice',
        type: 'voice-synthesis',
        provider: 'elevenlabs-voice',
        config: {
          apiKey: '${ELEVENLABS_API_KEY}',
          stability: 0.75
        },
        inputs: {
          text: '${generate-script.script}',
          voiceId: 'default-voice'
        },
        outputs: ['audioUrl', 'duration', 'metadata'],
        dependsOn: ['generate-script'],
        retry: {
          maxAttempts: 3,
          delay: 1000,
          backoff: 'exponential'
        }
      },
      {
        id: 'store-video',
        name: 'Store in Google Drive',
        type: 'storage',
        provider: 'google-drive',
        config: {
          serviceAccountKey: '${GOOGLE_SERVICE_ACCOUNT_KEY}',
          folder: 'AI-Videos'
        },
        inputs: {
          fileUrl: '${create-video.videoUrl}',
          fileName: '${generate-script.title}.mp4'
        },
        outputs: ['driveFileId', 'driveUrl', 'metadata'],
        dependsOn: ['create-video'],
        retry: {
          maxAttempts: 3,
          delay: 2000,
          backoff: 'exponential'
        }
      }
    ]
  };
}

// Utility to resolve variable references in workflow config
export function resolveVariables(
  value: any, 
  variables: Record<string, any>,
  stepResults: Record<string, any> = {}
): any {
  if (typeof value === 'string') {
    // Replace ${variable} and ${stepId.output} references
    return value.replace(/\$\{([^}]+)\}/g, (match, varPath) => {
      if (varPath.includes('.')) {
        // Step result reference like ${step-id.output}
        const [stepId, outputKey] = varPath.split('.');
        const stepResult = stepResults[stepId];
        return stepResult?.outputs?.[outputKey] || match;
      } else {
        // Variable reference like ${VARIABLE}
        return variables[varPath] || match;
      }
    });
  }
  
  if (Array.isArray(value)) {
    return value.map(item => resolveVariables(item, variables, stepResults));
  }
  
  if (value && typeof value === 'object') {
    const resolved: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      resolved[key] = resolveVariables(val, variables, stepResults);
    }
    return resolved;
  }
  
  return value;
}

// Utility to get execution order based on dependencies
export function getExecutionOrder(steps: WorkflowStepConfig[]): string[] {
  const stepMap = new Map(steps.map(step => [step.id, step]));
  const visited = new Set<string>();
  const result: string[] = [];

  function visit(stepId: string): void {
    if (visited.has(stepId)) {
      return;
    }

    visited.add(stepId);
    const step = stepMap.get(stepId);
    
    if (step?.dependsOn) {
      for (const depId of step.dependsOn) {
        visit(depId);
      }
    }

    result.push(stepId);
  }

  for (const step of steps) {
    visit(step.id);
  }

  return result;
} 