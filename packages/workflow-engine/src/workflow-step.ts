import { 
  WorkflowStepConfig, 
  StepExecutionResult, 
  StepStatus, 
  StepExecutionError,
  Provider 
} from './types';

export class WorkflowStep {
  private config: WorkflowStepConfig;
  private provider: Provider;
  private status: StepStatus = 'pending';
  private startTime?: Date;
  private endTime?: Date;
  private retryCount = 0;
  private logs: string[] = [];
  private outputs?: Record<string, any>;
  private error?: string;

  constructor(config: WorkflowStepConfig, provider: Provider) {
    this.config = config;
    this.provider = provider;
    this.validateConfig();
  }

  private validateConfig(): void {
    if (!this.config.id) {
      throw new Error('Step ID is required');
    }
    if (!this.config.name) {
      throw new Error('Step name is required');
    }
    if (!this.config.provider) {
      throw new Error('Step provider is required');
    }
    if (!this.provider.validate(this.config.config)) {
      throw new Error(`Invalid configuration for provider ${this.config.provider}`);
    }
  }

  async execute(inputs: Record<string, any> = {}): Promise<StepExecutionResult> {
    this.log(`Starting execution of step: ${this.config.name}`);
    this.startTime = new Date();
    this.status = 'running';

    try {
      // Merge step inputs with provided inputs
      const mergedInputs = { ...this.config.inputs, ...inputs };
      
      // Validate required inputs
      const requiredInputs = this.provider.getRequiredInputs();
      for (const required of requiredInputs) {
        if (!(required in mergedInputs)) {
          throw new StepExecutionError(
            `Missing required input: ${required}`,
            this.config.id,
            this.config.provider
          );
        }
      }

      // Execute with timeout if configured
      const executePromise = this.provider.execute(this.config.config, mergedInputs);
      
      if (this.config.timeout) {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new StepExecutionError(
              `Step execution timed out after ${this.config.timeout}ms`,
              this.config.id,
              this.config.provider
            ));
          }, this.config.timeout);
        });
        
        this.outputs = await Promise.race([executePromise, timeoutPromise]) as Record<string, any>;
      } else {
        this.outputs = await executePromise;
      }

      this.status = 'completed';
      this.endTime = new Date();
      this.log(`Step completed successfully in ${this.getDuration()}ms`);

      return this.getResult();
    } catch (error) {
      return await this.handleError(error as Error, inputs);
    }
  }

  private async handleError(error: Error, inputs: Record<string, any>): Promise<StepExecutionResult> {
    this.error = error.message;
    this.log(`Step failed: ${error.message}`);

    // Check if we should retry
    if (this.shouldRetry()) {
      this.retryCount++;
      this.status = 'retrying';
      this.log(`Retrying step (attempt ${this.retryCount}/${this.config.retry?.maxAttempts})`);
      
      // Wait for retry delay
      if (this.config.retry?.delay) {
        const delay = this.calculateRetryDelay();
        this.log(`Waiting ${delay}ms before retry`);
        await this.sleep(delay);
      }

      // Reset for retry
      this.error = undefined;
      return await this.execute(inputs);
    }

    // No more retries, mark as failed
    this.status = 'failed';
    this.endTime = new Date();
    this.log(`Step failed permanently after ${this.retryCount} retries`);
    
    return this.getResult();
  }

  private shouldRetry(): boolean {
    if (!this.config.retry) return false;
    return this.retryCount < this.config.retry.maxAttempts;
  }

  private calculateRetryDelay(): number {
    if (!this.config.retry) return 0;
    
    const baseDelay = this.config.retry.delay;
    const backoff = this.config.retry.backoff || 'linear';
    
    switch (backoff) {
      case 'exponential':
        return baseDelay * Math.pow(2, this.retryCount - 1);
      case 'linear':
      default:
        return baseDelay * this.retryCount;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    this.logs.push(logEntry);
    console.log(`[WorkflowStep:${this.config.id}] ${message}`);
  }

  private getDuration(): number {
    if (!this.startTime) return 0;
    const endTime = this.endTime || new Date();
    return endTime.getTime() - this.startTime.getTime();
  }

  getResult(): StepExecutionResult {
    return {
      stepId: this.config.id,
      status: this.status,
      startTime: this.startTime!,
      endTime: this.endTime,
      inputs: this.config.inputs || {},
      outputs: this.outputs,
      error: this.error,
      retryCount: this.retryCount,
      logs: [...this.logs],
      metadata: {
        provider: this.config.provider,
        type: this.config.type,
        duration: this.getDuration()
      }
    };
  }

  // Getters
  get id(): string {
    return this.config.id;
  }

  get name(): string {
    return this.config.name;
  }

  get type(): string {
    return this.config.type;
  }

  get dependencies(): string[] {
    return this.config.dependsOn || [];
  }

  get currentStatus(): StepStatus {
    return this.status;
  }

  get isCompleted(): boolean {
    return this.status === 'completed';
  }

  get isFailed(): boolean {
    return this.status === 'failed';
  }

  get isRunning(): boolean {
    return this.status === 'running';
  }

  // Check if step can execute based on condition
  canExecute(variables: Record<string, any>): boolean {
    if (!this.config.condition) return true;
    
    try {
      // Simple condition evaluation - in production, use a proper expression evaluator
      return this.evaluateCondition(this.config.condition, variables);
    } catch (error) {
      this.log(`Condition evaluation failed: ${error}`);
      return false;
    }
  }

  private evaluateCondition(condition: string, variables: Record<string, any>): boolean {
    // Simple condition evaluator - replace with proper parser in production
    // For now, support basic equality checks like "variable === 'value'"
    
    // Remove spaces and parse
    const cleanCondition = condition.replace(/\s+/g, '');
    
    // Simple equality check
    const equalityMatch = cleanCondition.match(/^(.+)===(.+)$/);
    if (equalityMatch) {
      const [, left, right] = equalityMatch;
      const leftValue = this.resolveValue(left, variables);
      const rightValue = this.resolveValue(right, variables);
      return leftValue === rightValue;
    }
    
    // Simple boolean check
    if (cleanCondition in variables) {
      return Boolean(variables[cleanCondition]);
    }
    
    // Default to true if condition cannot be evaluated
    return true;
  }

  private resolveValue(value: string, variables: Record<string, any>): any {
    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }
    
    // Check if it's a variable
    if (value in variables) {
      return variables[value];
    }
    
    // Try parsing as number
    const numberValue = Number(value);
    if (!isNaN(numberValue)) {
      return numberValue;
    }
    
    // Try parsing as boolean
    if (value === 'true') return true;
    if (value === 'false') return false;
    
    // Return as string
    return value;
  }
} 