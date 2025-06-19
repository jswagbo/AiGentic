import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create a sample user
  const user = await prisma.user.upsert({
    where: { email: 'demo@aigentic.com' },
    update: {},
    create: {
      email: 'demo@aigentic.com',
      name: 'Demo User',
      image: 'https://avatars.githubusercontent.com/u/1?v=4',
    },
  });

  console.log('✅ Created user:', user.name);

  // Create provider accounts for the user
  const providers = [
    {
      providerType: 'openai',
      providerName: 'OpenAI ChatGPT',
      accountId: 'openai-demo-account',
    },
    {
      providerType: 'veo3',
      providerName: 'Google Veo 3',
      accountId: 'veo3-demo-account',
    },
    {
      providerType: 'elevenlabs',
      providerName: 'ElevenLabs Voice',
      accountId: 'elevenlabs-demo-account',
    },
    {
      providerType: 'google-drive',
      providerName: 'Google Drive',
      accountId: 'drive-demo-account',
    },
    {
      providerType: 'socialblade',
      providerName: 'SocialBlade Analytics',
      accountId: 'socialblade-demo-account',
    },
  ];

  for (const provider of providers) {
    await prisma.providerAccount.upsert({
      where: {
        userId_providerType: {
          userId: user.id,
          providerType: provider.providerType,
        },
      },
      update: {},
      create: {
        userId: user.id,
        providerType: provider.providerType,
        providerName: provider.providerName,
        accountId: provider.accountId,
        isActive: true,
      },
    });
  }

  console.log('✅ Created provider accounts');

  // Create the sample "Yeti Blogging" project
  const yetiProject = await prisma.project.upsert({
    where: { id: 'yeti-blogging-sample' },
    update: {},
    create: {
      id: 'yeti-blogging-sample',
      userId: user.id,
      title: 'The Ultimate Guide to Yeti Blogging in 2024',
      description: 'A comprehensive guide about mythical creature blogging strategies',
      contentIdea: `Create an engaging video about "How to Start a Successful Yeti Blog in 2024". 
      
The video should cover:
- Finding your unique yeti voice and niche
- Essential blogging tools for cryptid content creators  
- Building an audience in the supernatural community
- Monetization strategies for mythical creature influencers
- Common mistakes new yeti bloggers make

Make it fun, informative, and slightly humorous while maintaining credibility. Target audience: aspiring content creators interested in niche/unusual topics.`,
      status: 'ready',
      language: 'en',
      scriptProvider: 'openai',
      videoProvider: 'veo3',
      voiceProvider: 'elevenlabs',
      generatedScript: `# The Ultimate Guide to Yeti Blogging in 2024

Welcome back to my channel! I'm your host, and today we're diving into something absolutely wild - how to start a successful Yeti blog in 2024.

## Finding Your Yeti Voice

First things first - authenticity is key. Whether you're a mountain-dwelling cryptid or just passionate about the mysterious, your unique perspective is what will set you apart...

## Essential Tools for Cryptid Content

Let's talk tools. You'll need:
- A reliable camera (snow-proof preferred)
- Quality microphone for those howling winds
- Content management system
- SEO tools for those "bigfoot sighting" keywords

## Building Your Supernatural Community

Engagement is everything. Respond to comments, collaborate with other mystery bloggers, and always remember - your audience wants authenticity, not just blurry photos.

## Monetization Magic

From affiliate marketing yeti gear to sponsored posts with outdoor brands, there are ethical ways to monetize your cryptid content...

Remember, whether you're 8 feet tall and covered in fur or just really passionate about the unknown, consistency and authenticity will always win.

Hit that subscribe button for more unconventional content creator tips!`,
      videoUrl: 'https://example.com/yeti-blogging-video.mp4',
      audioUrl: 'https://example.com/yeti-blogging-audio.mp3',
      thumbnailUrl: 'https://example.com/yeti-blogging-thumbnail.jpg',
      tags: '["blogging", "content-creation", "yeti", "cryptid", "tutorial"]',
      targetNiche: 'lifestyle',
      keywords: '["yeti blogging", "cryptid content", "niche blogging", "content creation 2024"]',
      publishedAt: new Date(),
    },
  });

  console.log('✅ Created sample Yeti Blogging project');

  // Create workflow steps for the Yeti project
  const workflowSteps = [
    {
      stepName: 'script-generation',
      stepType: 'script',
      provider: 'openai',
      status: 'completed',
      order: 1,
      config: '{"model": "gpt-4", "temperature": 0.7, "max_tokens": 2000}',
      outputData: '{"script": "Generated script content..."}',
      completedAt: new Date(Date.now() - 3600000), // 1 hour ago
    },
    {
      stepName: 'video-creation',
      stepType: 'video',
      provider: 'veo3',
      status: 'completed',
      order: 2,
      config: '{"duration": 180, "style": "educational", "resolution": "1080p"}',
      outputData: '{"videoUrl": "https://example.com/yeti-blogging-video.mp4"}',
      completedAt: new Date(Date.now() - 1800000), // 30 minutes ago
    },
    {
      stepName: 'voice-synthesis',
      stepType: 'audio',
      provider: 'elevenlabs',
      status: 'completed',
      order: 3,
      config: '{"voice": "professional-male", "language": "en"}',
      outputData: '{"audioUrl": "https://example.com/yeti-blogging-audio.mp3"}',
      completedAt: new Date(Date.now() - 900000), // 15 minutes ago
    },
    {
      stepName: 'storage',
      stepType: 'storage',
      provider: 'google-drive',
      status: 'completed',
      order: 4,
      config: '{"folder": "/AI-Videos/2024-01-15/", "filename": "yeti-blogging-guide.mp4"}',
      outputData: '{"driveUrl": "https://drive.google.com/file/d/example/view"}',
      completedAt: new Date(Date.now() - 300000), // 5 minutes ago
    },
  ];

  for (const step of workflowSteps) {
    await prisma.workflowStep.upsert({
      where: {
        projectId_stepName: {
          projectId: yetiProject.id,
          stepName: step.stepName,
        },
      },
      update: {},
      create: {
        projectId: yetiProject.id,
        ...step,
      },
    });
  }

  console.log('✅ Created workflow steps');

  // Create some sample jobs
  const completedJob = await prisma.job.create({
    data: {
      projectId: yetiProject.id,
      jobType: 'workflow-step',
      status: 'completed',
      data: '{"stepName": "script-generation", "input": "Yeti blogging guide"}',
      result: '{"success": true, "script": "Generated script..."}',
      completedAt: new Date(Date.now() - 3600000),
    },
  });

  console.log('✅ Created sample jobs');

  // Add some trending data for the Trends page
  const trendingData = [
    {
      niche: 'gaming',
      keyword: 'minecraft tutorials',
      popularity: 95.5,
      growth: 12.3,
    },
    {
      niche: 'tech',
      keyword: 'AI productivity tools',
      popularity: 88.2,
      growth: 23.7,
    },
    {
      niche: 'lifestyle',
      keyword: 'morning routines',
      popularity: 76.8,
      growth: 8.5,
    },
    {
      niche: 'gaming',
      keyword: 'indie game reviews',
      popularity: 71.4,
      growth: 15.2,
    },
    {
      niche: 'tech',
      keyword: 'smartphone comparisons',
      popularity: 82.1,
      growth: 5.8,
    },
  ];

  for (const trend of trendingData) {
    await prisma.trendData.create({
      data: {
        niche: trend.niche,
        keyword: trend.keyword,
        popularity: trend.popularity,
        growth: trend.growth,
        date: new Date(),
      },
    });
  }

  console.log('✅ Created trending data');

  // Add system configuration for feature flags
  const systemConfigs = [
    {
      key: 'NEXT_PUBLIC_MULTI_TENANT',
      value: 'false',
      type: 'boolean',
      category: 'feature-flags',
    },
    {
      key: 'ENABLE_AUTO_PUBLISH',
      value: 'false',
      type: 'boolean',
      category: 'feature-flags',
    },
    {
      key: 'MAX_PROJECTS_PER_USER',
      value: '10',
      type: 'number',
      category: 'limits',
    },
    {
      key: 'DEFAULT_VIDEO_DURATION',
      value: '180',
      type: 'number',
      category: 'defaults',
    },
  ];

  for (const config of systemConfigs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: {},
      create: config,
    });
  }

  console.log('✅ Created system configuration');

  // Create a sample webhook log
  await prisma.webhookLog.create({
    data: {
      projectId: yetiProject.id,
      webhookType: 'slack',
      event: 'project-completed',
      payload: '{"text": "Project \\"Yeti Blogging Guide\\" completed successfully!"}',
      response: '{"ok": true}',
      status: 'sent',
    },
  });

  console.log('✅ Created webhook log sample');

  console.log('🎉 Database seeded successfully!');
  console.log(`
📊 Summary:
- 1 User created (demo@aigentic.com)
- 5 Provider accounts configured
- 1 Sample "Yeti Blogging" project with complete workflow
- 4 Workflow steps (all completed)
- 1 Sample job
- 5 Trending data entries
- 4 System configuration entries
- 1 Webhook log entry

🚀 You can now:
- Run 'pnpm db:studio' to view the data in Prisma Studio
- Start the Next.js app to see the seeded data in action
  `);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 