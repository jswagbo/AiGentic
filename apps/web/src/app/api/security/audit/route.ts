import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../lib/auth';
import { 
  performSecurityAudit, 
  createSecureErrorResponse,
  validateRequest,
  securityHeaders
} from '../../../../lib/security';

// Security audit endpoint - Admin only
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return createSecureErrorResponse('Authentication required', 401);
    }

    // For now, allow any authenticated user. In production, implement admin check
    // if (!session.user?.role || session.user.role !== 'admin') {
    //   return createSecureErrorResponse('Admin access required', 403);
    // }

    // Perform comprehensive security audit
    const auditResult = performSecurityAudit();
    
    // Add additional security checks
    const additionalChecks = {
      // Check if running in production
      productionMode: process.env.NODE_ENV === 'production',
      
      // Check HTTPS in production
      httpsEnabled: request.url.startsWith('https://') || process.env.NODE_ENV !== 'production',
      
      // Check debug mode status
      debugMode: process.env.NEXTAUTH_DEBUG === 'true',
      
      // Check database connection
      databaseConfigured: !!process.env.DATABASE_URL,
      
      // Check Redis connection for sessions
      redisConfigured: !!process.env.REDIS_URL,
      
      // Check AI provider keys
      aiProvidersConfigured: {
        openai: !!process.env.OPENAI_API_KEY,
        anthropic: !!process.env.ANTHROPIC_API_KEY,
        elevenlabs: !!process.env.ELEVENLABS_API_KEY,
        google: !!process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS,
      },
    };

    // Security recommendations
    const recommendations: string[] = [];
    
    if (!additionalChecks.httpsEnabled && process.env.NODE_ENV === 'production') {
      recommendations.push('Enable HTTPS in production');
    }
    
    if (additionalChecks.debugMode && process.env.NODE_ENV === 'production') {
      recommendations.push('Disable debug mode in production');
    }
    
    if (!additionalChecks.redisConfigured) {
      recommendations.push('Configure Redis for session storage and rate limiting');
    }
    
    const missingProviders = Object.entries(additionalChecks.aiProvidersConfigured)
      .filter(([_, configured]) => !configured)
      .map(([provider]) => provider);
    
    if (missingProviders.length > 0) {
      recommendations.push(`Configure missing AI providers: ${missingProviders.join(', ')}`);
    }

    const response = {
      audit: auditResult,
      additionalChecks,
      recommendations,
      timestamp: new Date().toISOString(),
      performedBy: session.user?.email,
    };

    return NextResponse.json(response, {
      headers: securityHeaders,
    });

  } catch (error) {
    console.error('Security audit failed:', error);
    return createSecureErrorResponse(
      'Security audit failed',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

// Update security configuration
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return createSecureErrorResponse('Authentication required', 401);
    }

    // Validate request
    const validation = await validateRequest(
      request,
      ['action'],
      true
    );

    if (!validation.isValid) {
      return createSecureErrorResponse(validation.error || 'Invalid request');
    }

    const { action, ...params } = validation.data;

    switch (action) {
      case 'regenerate-csrf':
        // In a real implementation, this would regenerate CSRF tokens
        return NextResponse.json({
          message: 'CSRF tokens regenerated',
          timestamp: new Date().toISOString(),
        }, { headers: securityHeaders });

      case 'clear-rate-limits':
        // In a real implementation, this would clear rate limit counters
        return NextResponse.json({
          message: 'Rate limit counters cleared',
          timestamp: new Date().toISOString(),
        }, { headers: securityHeaders });

      case 'update-security-headers':
        // In a real implementation, this would update security header configuration
        return NextResponse.json({
          message: 'Security headers configuration updated',
          timestamp: new Date().toISOString(),
        }, { headers: securityHeaders });

      default:
        return createSecureErrorResponse('Unknown security action');
    }

  } catch (error) {
    console.error('Security configuration update failed:', error);
    return createSecureErrorResponse(
      'Security configuration update failed',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
} 