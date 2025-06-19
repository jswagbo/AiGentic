import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { NextRequest, NextResponse } from 'next/server';

// Rate limiting configurations
export const createRateLimit = (windowMs: number, max: number, message?: string) => {
  return rateLimit({
    windowMs,
    max,
    message: message || 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Different rate limits for different endpoints
export const rateLimits = {
  // Authentication endpoints - more restrictive
  auth: createRateLimit(15 * 60 * 1000, 5, 'Too many authentication attempts, please try again in 15 minutes.'),
  
  // API endpoints - moderate
  api: createRateLimit(15 * 60 * 1000, 100, 'API rate limit exceeded, please try again in 15 minutes.'),
  
  // AI provider endpoints - more restrictive due to cost
  ai: createRateLimit(60 * 60 * 1000, 20, 'AI API rate limit exceeded, please try again in 1 hour.'),
  
  // General requests - lenient
  general: createRateLimit(15 * 60 * 1000, 1000),
};

// Security headers configuration
export const securityHeaders = {
  'X-DNS-Prefetch-Control': 'off',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'origin-when-cross-origin',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': [
    'default-src \'self\'',
    'script-src \'self\' \'unsafe-inline\' \'unsafe-eval\'',
    'style-src \'self\' \'unsafe-inline\'',
    'img-src \'self\' data: https:',
    'font-src \'self\'',
    'connect-src \'self\' https:',
    'frame-ancestors \'none\'',
  ].join('; '),
};

// Input validation utilities
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .substring(0, 10000); // Limit length
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

export const validateApiKey = (key: string, provider: string): boolean => {
  const patterns = {
    openai: /^sk-[a-zA-Z0-9]{20,}$/,
    anthropic: /^sk-ant-[a-zA-Z0-9-]+$/,
    elevenlabs: /^[a-f0-9]{32}$/,
    google: /^[A-Za-z0-9_-]{39}$/,
  };
  
  const pattern = patterns[provider as keyof typeof patterns];
  return pattern ? pattern.test(key) : key.length > 10 && key.length < 200;
};

// CSRF token generation and validation
export const generateCSRFToken = (): string => {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

export const validateCSRFToken = (token: string, sessionToken: string): boolean => {
  return token === sessionToken && token.length === 64;
};

// Error response without sensitive information
export const createSecureErrorResponse = (
  message: string, 
  statusCode: number = 400,
  details?: string
): NextResponse => {
  const response = {
    error: message,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && details && { details }),
  };
  
  return NextResponse.json(response, { 
    status: statusCode,
    headers: securityHeaders,
  });
};

// Request validation middleware
export const validateRequest = async (
  request: NextRequest,
  requiredFields: string[] = [],
  requireAuth: boolean = true
): Promise<{ isValid: boolean; data?: any; error?: string }> => {
  try {
    // Check content type for POST requests
    if (request.method === 'POST' && !request.headers.get('content-type')?.includes('application/json')) {
      return { isValid: false, error: 'Content-Type must be application/json' };
    }
    
    // Parse and validate JSON body
    let data = {};
    if (request.method === 'POST') {
      try {
        data = await request.json();
      } catch (error) {
        return { isValid: false, error: 'Invalid JSON body' };
      }
    }
    
    // Validate required fields
    for (const field of requiredFields) {
      if (!(field in data) || !data[field as keyof typeof data]) {
        return { isValid: false, error: `Missing required field: ${field}` };
      }
    }
    
    // Sanitize string inputs
    const sanitizedData: Record<string, any> = { ...data };
    Object.keys(sanitizedData).forEach(key => {
      if (typeof sanitizedData[key] === 'string') {
        sanitizedData[key] = sanitizeInput(sanitizedData[key]);
      }
    });
    
    return { isValid: true, data: sanitizedData };
  } catch (error) {
    return { isValid: false, error: 'Request validation failed' };
  }
};

// Security audit function
export const performSecurityAudit = () => {
  const issues: string[] = [];
  
  // Check environment variables
  const requiredEnvVars = [
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'DATABASE_URL',
  ];
  
  requiredEnvVars.forEach(envVar => {
    if (!process.env[envVar]) {
      issues.push(`Missing required environment variable: ${envVar}`);
    }
  });
  
  // Check if secrets are properly configured
  if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length < 32) {
    issues.push('NEXTAUTH_SECRET should be at least 32 characters long');
  }
  
  // Check database URL format
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('postgresql://')) {
    issues.push('DATABASE_URL should use PostgreSQL in production');
  }
  
  return {
    secure: issues.length === 0,
    issues,
    timestamp: new Date().toISOString(),
  };
};

// API key management utilities
export const maskApiKey = (key: string): string => {
  if (!key || key.length < 8) return '***';
  return `${key.slice(0, 4)}${'*'.repeat(key.length - 8)}${key.slice(-4)}`;
};

export const validateAndStoreApiKey = (key: string, provider: string) => {
  const isValid = validateApiKey(key, provider);
  if (!isValid) {
    throw new Error(`Invalid API key format for ${provider}`);
  }
  
  // In production, encrypt before storing
  return {
    masked: maskApiKey(key),
    encrypted: key, // TODO: Implement proper encryption
    provider,
    createdAt: new Date().toISOString(),
  };
}; 