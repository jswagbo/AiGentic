import { Provider, ProviderConfig, ProviderError } from '../types';

export class ProviderRegistry {
  private providers = new Map<string, Provider>();
  private configs = new Map<string, ProviderConfig>();

  constructor() {
    // Initialize with default providers
    this.registerDefaultProviders();
  }

  registerProvider(provider: Provider, config?: ProviderConfig): void {
    if (this.providers.has(provider.name)) {
      throw new ProviderError(
        `Provider ${provider.name} is already registered`,
        provider.name
      );
    }

    this.providers.set(provider.name, provider);
    
    if (config) {
      this.configs.set(provider.name, config);
    }

    console.log(`[ProviderRegistry] Registered provider: ${provider.name} (type: ${provider.type})`);
  }

  unregisterProvider(name: string): boolean {
    const removed = this.providers.delete(name);
    this.configs.delete(name);
    
    if (removed) {
      console.log(`[ProviderRegistry] Unregistered provider: ${name}`);
    }
    
    return removed;
  }

  getProvider(name: string): Provider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new ProviderError(
        `Provider ${name} not found. Available providers: ${this.getAvailableProviders().join(', ')}`,
        name
      );
    }

    // Check if provider is enabled
    const config = this.configs.get(name);
    if (config && !config.enabled) {
      throw new ProviderError(
        `Provider ${name} is disabled`,
        name
      );
    }

    return provider;
  }

  getProviderConfig(name: string): ProviderConfig | undefined {
    return this.configs.get(name);
  }

  updateProviderConfig(name: string, config: Partial<ProviderConfig>): void {
    const existingConfig = this.configs.get(name);
    if (!existingConfig) {
      throw new ProviderError(
        `No configuration found for provider ${name}`,
        name
      );
    }

    const updatedConfig = { ...existingConfig, ...config };
    this.configs.set(name, updatedConfig);
    
    console.log(`[ProviderRegistry] Updated configuration for provider: ${name}`);
  }

  hasProvider(name: string): boolean {
    return this.providers.has(name);
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  getProvidersByType(type: string): Provider[] {
    return Array.from(this.providers.values()).filter(provider => provider.type === type);
  }

  getEnabledProviders(): Provider[] {
    return Array.from(this.providers.values()).filter(provider => {
      const config = this.configs.get(provider.name);
      return !config || config.enabled;
    });
  }

  validateProvider(name: string, config: Record<string, any>): boolean {
    const provider = this.getProvider(name);
    return provider.validate(config);
  }

  // Get provider with rate limiting and timeout handling
  async executeWithProvider(
    providerName: string, 
    config: Record<string, any>, 
    inputs: Record<string, any>
  ): Promise<Record<string, any>> {
    const provider = this.getProvider(providerName);
    const providerConfig = this.configs.get(providerName);

    // Apply rate limiting if configured
    if (providerConfig?.rateLimit) {
      await this.handleRateLimit(providerName, providerConfig.rateLimit);
    }

    // Execute with timeout if configured
    if (providerConfig?.timeout) {
      return await this.executeWithTimeout(
        () => provider.execute(config, inputs),
        providerConfig.timeout,
        providerName
      );
    }

    return await provider.execute(config, inputs);
  }

  private async handleRateLimit(
    providerName: string, 
    rateLimit: { requests: number; window: number }
  ): Promise<void> {
    // Simple in-memory rate limiting - replace with Redis in production
    const key = `ratelimit:${providerName}`;
    const now = Date.now();
    
    // For now, just log the rate limit - implement proper rate limiting in production
    console.log(`[ProviderRegistry] Rate limit check for ${providerName}: ${rateLimit.requests} requests per ${rateLimit.window}ms`);
  }

  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeout: number,
    providerName: string
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new ProviderError(
          `Provider ${providerName} execution timed out after ${timeout}ms`,
          providerName,
          'TIMEOUT'
        ));
      }, timeout);

      operation()
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  private registerDefaultProviders(): void {
    // Default providers will be registered here
    // For now, we'll create placeholder providers
    console.log('[ProviderRegistry] Initializing default providers...');
  }

  // Debug and monitoring methods
  getProviderStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [name, provider] of this.providers) {
      const config = this.configs.get(name);
      stats[name] = {
        type: provider.type,
        enabled: !config || config.enabled,
        hasConfig: !!config,
        requiredInputs: provider.getRequiredInputs(),
        outputs: provider.getOutputs()
      };
    }
    
    return stats;
  }

  listProviders(): void {
    console.log('\n=== Provider Registry Status ===');
    console.log(`Total providers: ${this.providers.size}`);
    
    for (const [name, provider] of this.providers) {
      const config = this.configs.get(name);
      const status = !config || config.enabled ? '✅ ENABLED' : '❌ DISABLED';
      
      console.log(`\n${name} (${provider.type}) ${status}`);
      console.log(`  Required inputs: ${provider.getRequiredInputs().join(', ') || 'none'}`);
      console.log(`  Outputs: ${provider.getOutputs().join(', ') || 'none'}`);
      
      if (config) {
        console.log(`  Rate limit: ${config.rateLimit ? `${config.rateLimit.requests}/${config.rateLimit.window}ms` : 'none'}`);
        console.log(`  Timeout: ${config.timeout ? `${config.timeout}ms` : 'none'}`);
      }
    }
    console.log('===============================\n');
  }
} 