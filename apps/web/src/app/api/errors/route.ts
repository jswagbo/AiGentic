import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';

interface ErrorReport {
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  errorInfo?: {
    componentStack?: string;
  };
  context?: string;
  timestamp: string;
  url: string;
  userAgent: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const body: ErrorReport = await request.json();
    
    // Log error to console for immediate visibility
    console.error('🚨 Client Error Reported:', {
      error: body.error,
      context: body.context,
      url: body.url,
      userId: session?.user?.id,
      timestamp: body.timestamp
    });

    // Determine error severity
    const severity = determineErrorSeverity(body.error);
    
    // Store error in database if it's significant
    if (severity !== 'low') {
      try {
        const errorLog = await prisma.webhookLog.create({
          data: {
            webhookType: 'error-report',
            event: 'client-error',
            payload: JSON.stringify({
              error: body.error,
              errorInfo: body.errorInfo,
              context: body.context,
              url: body.url,
              userAgent: body.userAgent,
              userId: session?.user?.id,
              severity,
              timestamp: body.timestamp,
            }),
            status: 'received',
          },
        });

        // Send webhook alert for high-severity errors
        if (severity === 'high' || severity === 'critical') {
          await sendErrorAlert(body, session?.user?.id, severity);
        }

        return NextResponse.json({ 
          success: true, 
          errorId: errorLog.id,
          severity 
        });

      } catch (dbError) {
        console.error('Failed to store error in database:', dbError);
        // Still send alert even if DB storage fails
        if (severity === 'critical') {
          await sendErrorAlert(body, session?.user?.id, severity);
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      severity 
    });

  } catch (error) {
    console.error('Error processing error report:', error);
    return NextResponse.json(
      { error: 'Failed to process error report' },
      { status: 500 }
    );
  }
}

// GET endpoint for retrieving error statistics (admin only)
export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get error statistics from the last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const recentErrors = await prisma.webhookLog.findMany({
      where: {
        webhookType: 'error-report',
        createdAt: {
          gte: yesterday
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    });

    // Parse and analyze errors
    const errorStats = {
      total: recentErrors.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      by_type: {} as Record<string, number>,
      recent: recentErrors.slice(0, 10).map((error: any) => {
        try {
          const payload = JSON.parse(error.payload);
          return {
            id: error.id,
            type: payload.error?.name || 'Unknown',
            message: payload.error?.message || 'No message',
            severity: payload.severity || 'unknown',
            timestamp: error.createdAt,
            url: payload.url,
          };
        } catch {
          return {
            id: error.id,
            type: 'ParseError',
            message: 'Failed to parse error data',
            severity: 'low',
            timestamp: error.createdAt,
            url: 'unknown',
          };
        }
      })
    };

    // Calculate statistics
    recentErrors.forEach((error: any) => {
      try {
        const payload = JSON.parse(error.payload);
        const severity = payload.severity || 'low';
        const errorType = payload.error?.name || 'Unknown';

        errorStats[severity as keyof typeof errorStats]++;
        errorStats.by_type[errorType] = (errorStats.by_type[errorType] || 0) + 1;
      } catch {
        errorStats.low++;
      }
    });

    return NextResponse.json(errorStats);

  } catch (error) {
    console.error('Error retrieving error statistics:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve error statistics' },
      { status: 500 }
    );
  }
}

function determineErrorSeverity(error: ErrorReport['error']): 'low' | 'medium' | 'high' | 'critical' {
  const message = error.message?.toLowerCase() || '';
  const name = error.name?.toLowerCase() || '';

  // Critical errors
  if (
    name.includes('chunkerror') ||
    message.includes('network error') ||
    message.includes('failed to fetch') ||
    message.includes('authentication') ||
    message.includes('unauthorized')
  ) {
    return 'critical';
  }

  // High severity errors
  if (
    name.includes('typeerror') ||
    name.includes('referenceerror') ||
    message.includes('cannot read properties') ||
    message.includes('is not a function') ||
    message.includes('permission denied')
  ) {
    return 'high';
  }

  // Medium severity errors
  if (
    name.includes('error') ||
    message.includes('failed') ||
    message.includes('invalid') ||
    message.includes('timeout')
  ) {
    return 'medium';
  }

  // Low severity (warnings, info)
  return 'low';
}

async function sendErrorAlert(
  errorReport: ErrorReport, 
  userId: string | undefined, 
  severity: string
): Promise<void> {
  try {
    // Prepare alert payload
    const alertPayload = {
      text: `🚨 ${severity.toUpperCase()} Error Detected in AIGentic`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${severity.toUpperCase()} Error Alert`,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Error:* ${errorReport.error.name}`,
            },
            {
              type: 'mrkdwn',
              text: `*Message:* ${errorReport.error.message}`,
            },
            {
              type: 'mrkdwn',
              text: `*URL:* ${errorReport.url}`,
            },
            {
              type: 'mrkdwn',
              text: `*User:* ${userId || 'Anonymous'}`,
            },
            {
              type: 'mrkdwn',
              text: `*Time:* ${new Date(errorReport.timestamp).toLocaleString()}`,
            },
          ],
        },
      ],
    };

    // Send to webhook URL if configured
    const webhookUrl = process.env.ERROR_WEBHOOK_URL;
    if (webhookUrl) {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(alertPayload),
      });

      // Log webhook result
      await prisma.webhookLog.create({
        data: {
          webhookType: 'slack',
          event: 'error-alert',
          payload: JSON.stringify(alertPayload),
          response: await response.text(),
          status: response.ok ? 'sent' : 'failed',
        },
      });

      if (!response.ok) {
        console.error('Failed to send error alert webhook:', response.statusText);
      }
    } else {
      console.warn('ERROR_WEBHOOK_URL not configured, skipping alert');
    }

  } catch (alertError) {
    console.error('Failed to send error alert:', alertError);
  }
} 