// Validation utilities for workflow engine

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function isValidWorkflowId(id: string): boolean {
  // Alphanumeric with hyphens and underscores, 3-50 characters
  const idRegex = /^[a-zA-Z0-9_-]{3,50}$/;
  return idRegex.test(id);
}

export function isValidStepId(id: string): boolean {
  return isValidWorkflowId(id);
}

export function isValidProviderName(name: string): boolean {
  // Lowercase with hyphens, 2-30 characters
  const nameRegex = /^[a-z0-9-]{2,30}$/;
  return nameRegex.test(name);
}

export function validateApiKey(apiKey: string, provider: string): boolean {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }

  // Basic validation based on provider
  switch (provider.toLowerCase()) {
    case 'openai':
      return apiKey.startsWith('sk-') && apiKey.length > 20;
    case 'anthropic':
      return apiKey.startsWith('sk-ant-') && apiKey.length > 20;
    case 'elevenlabs':
      return apiKey.length === 32; // ElevenLabs API keys are 32 chars
    default:
      return apiKey.length > 10; // Basic length check
  }
}

export function sanitizeInput(input: string): string {
  // Remove potentially dangerous characters
  return input.replace(/[<>\"'&]/g, '');
}

export function validateFileExtension(filename: string, allowedExtensions: string[]): boolean {
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension ? allowedExtensions.includes(extension) : false;
}

export function validateDuration(duration: number): boolean {
  return duration > 0 && duration <= 3600; // Max 1 hour
}

export function validateTimeout(timeout: number): boolean {
  return timeout > 0 && timeout <= 86400000; // Max 24 hours in milliseconds
}

export function validateRetryConfig(retry: { maxAttempts: number; delay: number; backoff?: string }): boolean {
  return (
    retry.maxAttempts > 0 && 
    retry.maxAttempts <= 10 &&
    retry.delay > 0 && 
    retry.delay <= 60000 && // Max 1 minute delay
    (!retry.backoff || ['linear', 'exponential'].includes(retry.backoff))
  );
} 