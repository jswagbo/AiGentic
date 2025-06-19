import { Provider } from '../types';

export abstract class BaseProvider implements Provider {
  public readonly name: string;
  public readonly type: string;
  protected requiredInputs: string[] = [];
  protected outputs: string[] = [];
  protected defaultConfig: Record<string, any> = {};

  constructor(name: string, type: string) {
    this.name = name;
    this.type = type;
  }

  abstract execute(config: Record<string, any>, inputs: Record<string, any>): Promise<Record<string, any>>;

  validate(config: Record<string, any>): boolean {
    // Basic validation - check if all required config keys are present
    const requiredKeys = this.getRequiredConfigKeys();
    for (const key of requiredKeys) {
      if (!(key in config)) {
        console.warn(`[${this.name}] Missing required config key: ${key}`);
        return false;
      }
    }

    // Validate config values
    return this.validateConfig(config);
  }

  getRequiredInputs(): string[] {
    return [...this.requiredInputs];
  }

  getOutputs(): string[] {
    return [...this.outputs];
  }

  // Protected methods for subclasses to override
  protected getRequiredConfigKeys(): string[] {
    return [];
  }

  protected validateConfig(config: Record<string, any>): boolean {
    // Override in subclasses for specific validation
    return true;
  }

  protected mergeConfig(config: Record<string, any>): Record<string, any> {
    return { ...this.defaultConfig, ...config };
  }

  protected log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${this.name}] ${level.toUpperCase()}: ${message}`;
    
    if (level === 'error') {
      console.error(logMessage, data || '');
    } else if (level === 'warn') {
      console.warn(logMessage, data || '');
    } else {
      console.log(logMessage, data || '');
    }
  }

  protected validateInputs(inputs: Record<string, any>): void {
    const missing = this.requiredInputs.filter(input => !(input in inputs));
    if (missing.length > 0) {
      throw new Error(`Missing required inputs: ${missing.join(', ')}`);
    }
  }

  protected createOutput(data: Record<string, any>): Record<string, any> {
    // Ensure all declared outputs are present
    const result: Record<string, any> = {};
    
    for (const output of this.outputs) {
      if (output in data) {
        result[output] = data[output];
      } else {
        this.log('warn', `Expected output '${output}' not found in result`);
      }
    }

    // Add any additional data
    for (const [key, value] of Object.entries(data)) {
      if (!this.outputs.includes(key)) {
        result[key] = value;
      }
    }

    return result;
  }

  // Utility methods for common operations
  protected async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected generateId(prefix?: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5);
    return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
  }

  protected formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000,
    backoff: 'linear' | 'exponential' = 'exponential'
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          break;
        }

        const waitTime = backoff === 'exponential' 
          ? delay * Math.pow(2, attempt - 1)
          : delay * attempt;
          
        this.log('warn', `Attempt ${attempt} failed, retrying in ${waitTime}ms`, error);
        await this.sleep(waitTime);
      }
    }
    
    throw lastError!;
  }

  // Provider lifecycle methods
  protected async onBeforeExecute(config: Record<string, any>, inputs: Record<string, any>): Promise<void> {
    // Override in subclasses for setup logic
  }

  protected async onAfterExecute(result: Record<string, any>): Promise<void> {
    // Override in subclasses for cleanup logic
  }

  protected async onError(error: Error, config: Record<string, any>, inputs: Record<string, any>): Promise<void> {
    // Override in subclasses for error handling
    this.log('error', `Provider execution failed: ${error.message}`, { config, inputs });
  }
} 