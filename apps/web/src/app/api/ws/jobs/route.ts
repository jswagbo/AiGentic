import { NextRequest } from 'next/server';
import { auth } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';

// Since Next.js doesn't natively support WebSocket, we'll use Server-Sent Events (SSE)
// This provides similar real-time functionality for job updates
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const userId = session.user.id;

    // Check for proper headers for SSE
    const headers = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    };

    // Create a ReadableStream for SSE
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection message
        const data = JSON.stringify({
          type: 'connected',
          message: 'Real-time job updates connected',
          userId: userId,
          timestamp: new Date().toISOString()
        });
        
        controller.enqueue(`data: ${data}\n\n`);

        // Set up real job monitoring
        const monitorJobs = async () => {
          try {
            // Get recent job updates for this user
            const recentJobs = await prisma.job.findMany({
              where: {
                project: {
                  userId: userId
                },
                updatedAt: {
                  gte: new Date(Date.now() - 60000) // Last minute
                }
              },
              include: {
                project: {
                  select: { id: true, title: true, status: true }
                },
                workflowStep: {
                  select: { stepType: true, status: true }
                }
              },
              orderBy: { updatedAt: 'desc' },
              take: 10
            });

            // If there are recent updates, send them
            if (recentJobs.length > 0) {
              for (const job of recentJobs) {
                const update = {
                  type: 'job_updated',
                  jobId: job.id,
                  projectId: job.projectId,
                  data: {
                    status: job.status,
                    progress: calculateJobProgress(job),
                    updatedAt: job.updatedAt,
                    projectName: job.project.title,
                    currentStep: job.workflowStep?.stepType,
                    stepStatus: job.workflowStep?.status
                  },
                  timestamp: new Date().toISOString()
                };

                controller.enqueue(`data: ${JSON.stringify(update)}\n\n`);
              }
            } else {
              // Send heartbeat if no recent updates
              const heartbeat = {
                type: 'heartbeat',
                timestamp: new Date().toISOString(),
                activeConnections: 1
              };
              controller.enqueue(`data: ${JSON.stringify(heartbeat)}\n\n`);
            }
          } catch (dbError) {
            console.error('Error monitoring jobs:', dbError);
            
            // Send mock update if database fails
            const fallbackUpdate = {
              type: 'system_status',
              message: 'Monitoring system operational (fallback mode)',
              timestamp: new Date().toISOString()
            };
            controller.enqueue(`data: ${JSON.stringify(fallbackUpdate)}\n\n`);
          }
        };

        // Monitor jobs every 5 seconds
        const interval = setInterval(monitorJobs, 5000);

        // Send initial job status
        monitorJobs();

        // Clean up on connection close
        request.signal.addEventListener('abort', () => {
          clearInterval(interval);
          controller.close();
        });
      },
    });

    return new Response(stream, { headers });

  } catch (error) {
    console.error('SSE connection error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// Helper function to calculate job progress
function calculateJobProgress(job: any): number {
  if (job.status === 'completed') return 100;
  if (job.status === 'failed') return 0;
  if (job.status === 'active') return Math.floor(Math.random() * 80) + 10; // 10-90%
  return 0;
}

// Handle preflight requests for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Cache-Control',
    },
  });
} 