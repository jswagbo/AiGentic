import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get real projects and jobs from database
    try {
      const projects = await prisma.project.findMany({
        where: {
          userId: session.user.id // Filter by current user
        },
        include: {
          workflowSteps: {
            orderBy: { order: 'asc' }
          },
          jobs: {
            orderBy: { createdAt: 'desc' },
            take: 1 // Get latest job status
          }
        },
        orderBy: { updatedAt: 'desc' },
        take: 20 // Limit to recent projects
      });

             // Transform database data to match frontend expectations
               const workflowJobs = projects.map((project: any) => {
         const latestJob = project.jobs[0];
         
         // Parse tags and keywords for metadata
         let tags: string[] = [];
         let keywords: string[] = [];
         try {
           tags = project.tags ? JSON.parse(project.tags) : [];
           keywords = project.keywords ? JSON.parse(project.keywords) : [];
         } catch (e) {
           // Handle malformed JSON gracefully
         }
         
         // Determine current state based on workflow steps
         let currentState = 'pending';
         let progress = 0;
         
         if (project.workflowSteps.length > 0) {
           const completedSteps = project.workflowSteps.filter((step: any) => step.status === 'completed').length;
           const totalSteps = project.workflowSteps.length;
           progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
           
           // Determine current state based on actual status field and workflow steps
           if (project.status === 'failed') {
             currentState = 'failed';
           } else if (project.status === 'published' || completedSteps === totalSteps) {
             currentState = 'completed';
           } else if (project.status === 'rendering') {
             // Find the current step
             const runningStep = project.workflowSteps.find((step: any) => step.status === 'running');
             if (runningStep) {
               // Map workflow step types to UI states
               const stepTypeToState: Record<string, string> = {
                 'script': 'script-generation',
                 'video': 'video-creation', 
                 'audio': 'voice-synthesis',
                 'storage': 'storage'
               };
               currentState = stepTypeToState[runningStep.stepType] || 'processing';
             } else {
               currentState = 'processing';
             }
           }
         }

         return {
           id: project.id,
           name: project.title, // Use 'title' field from schema
           description: project.description || project.contentIdea || 'AI-generated content project',
           state: currentState,
           progress,
           createdAt: project.createdAt,
           updatedAt: project.updatedAt,
           metadata: {
             contentStyle: project.targetNiche || 'Educational',
             duration: 10, // Default duration, can be extracted from workflowConfig
             selectedSteps: project.workflowSteps.map((step: any) => step.stepType),
             topic: project.contentIdea,
             language: project.language,
             tags,
             keywords,
             providers: {
               script: project.scriptProvider,
               video: project.videoProvider,
               voice: project.voiceProvider
             }
           },
           ...(currentState === 'failed' && latestJob?.result && {
             error: (() => {
               try {
                 return JSON.parse(latestJob.result)?.error || 'Workflow execution failed';
               } catch {
                 return latestJob.errorMessage || 'Workflow execution failed';
               }
             })()
           })
         };
       });

      return NextResponse.json(workflowJobs);
    } catch (dbError) {
      console.error('Database query failed, falling back to sample data:', dbError);
      
      // Fallback to sample data if database query fails
      const fallbackJobs = [
        {
          id: 'sample-1',
          name: 'Sample Project: Getting Started',
          description: 'This is a sample project to demonstrate the workflow system',
          state: 'completed',
          progress: 100,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 30 * 60 * 1000),
          metadata: {
            contentStyle: 'Educational',
            duration: 10,
            selectedSteps: ['script', 'video', 'voice', 'storage']
          }
        }
      ];
      
      return NextResponse.json(fallbackJobs);
    }

  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Create actual project in database
    try {
      const newProject = await prisma.project.create({
        data: {
          userId: session.user.id,
          title: body.name || 'New Project',
          description: body.description,
          contentIdea: body.topic || body.description || 'AI-generated content',
          status: 'draft',
          language: body.language || 'en',
          scriptProvider: body.providers?.script || 'openai',
          videoProvider: body.providers?.video || 'veo3',
          voiceProvider: body.providers?.voice || 'elevenlabs',
          targetNiche: body.metadata?.contentStyle || 'Educational',
          tags: JSON.stringify(body.metadata?.tags || []),
          keywords: JSON.stringify(body.metadata?.keywords || [])
        }
      });

      // Create workflow steps based on selected steps
      const selectedSteps = body.metadata?.selectedSteps || ['script', 'video', 'voice', 'storage'];
      const stepPromises = selectedSteps.map((stepType: string, index: number) => {
        const stepNames: Record<string, string> = {
          'script': 'script-generation',
          'video': 'video-creation',
          'voice': 'voice-synthesis',
          'storage': 'storage'
        };

        const providers: Record<string, string> = {
          'script': newProject.scriptProvider,
          'video': newProject.videoProvider,
          'voice': newProject.voiceProvider,
          'storage': 'google-drive'
        };

        return prisma.workflowStep.create({
          data: {
            projectId: newProject.id,
            stepName: stepNames[stepType] || stepType,
            stepType,
            provider: providers[stepType] || 'default',
            order: index,
            config: JSON.stringify({
              duration: body.metadata?.duration || 10,
              style: body.metadata?.style || 'professional'
            })
          }
        });
      });

      await Promise.all(stepPromises);

      // Return the created project in the expected format
      const newJob = {
        id: newProject.id,
        name: newProject.title,
        description: newProject.description || newProject.contentIdea,
        state: 'pending',
        progress: 0,
        createdAt: newProject.createdAt,
        updatedAt: newProject.updatedAt,
        metadata: {
          contentStyle: newProject.targetNiche,
          duration: body.metadata?.duration || 10,
          selectedSteps: selectedSteps,
          topic: newProject.contentIdea,
          language: newProject.language,
          providers: {
            script: newProject.scriptProvider,
            video: newProject.videoProvider,
            voice: newProject.voiceProvider
          }
        }
      };

      return NextResponse.json(newJob, { status: 201 });
    } catch (dbError) {
      console.error('Failed to create project:', dbError);
      return NextResponse.json(
        { error: 'Failed to create project' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error creating job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 