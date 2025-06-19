import { WorkflowEngine } from '../workflow-engine';
import { WorkflowConfig } from '../types';

/**
 * Enhanced Script Generation Demonstration
 * 
 * This example showcases the enhanced script generation capabilities including:
 * 1. Multiple AI providers (OpenAI, Anthropic, Gemini)
 * 2. Advanced content planning and SEO optimization
 * 3. Structured output with chapters and timestamps
 * 4. Content style variations and audience targeting
 */

// Content planning workflow with enhanced script generation
const enhancedScriptWorkflow: WorkflowConfig = {
  id: 'enhanced-script-generation',
  name: 'Enhanced Script Generation Pipeline',
  description: 'AI-powered content planning with multiple providers and advanced features',
  version: '1.0',
  steps: [
    {
      id: 'openai-script',
      name: 'OpenAI Script Generation',
      type: 'script-generation',
      provider: 'openai-script',
      config: {
        model: 'gpt-4-turbo',
        temperature: 0.7,
        maxTokens: 3000
      },
      inputs: {
        topic: '${workflow.topic}',
        duration: '${workflow.duration}',
        style: '${workflow.style}'
      },
      outputs: ['script', 'title', 'description', 'keywords']
    },
    {
      id: 'anthropic-script',
      name: 'Anthropic Script Generation',
      type: 'script-generation',
      provider: 'anthropic-script',
      config: {
        model: 'claude-3-sonnet-20240229',
        maxTokens: 3000
      },
      inputs: {
        topic: '${workflow.topic}',
        duration: '${workflow.duration}',
        style: '${workflow.style}'
      },
      outputs: ['script', 'title', 'description', 'keywords']
    },
    {
      id: 'gemini-script',
      name: 'Gemini Enhanced Script Generation',
      type: 'script-generation',
      provider: 'gemini-script',
      config: {
        model: 'gemini-2.5-flash',
        temperature: 0.7,
        maxOutputTokens: 4096
      },
      inputs: {
        topic: '${workflow.topic}',
        duration: '${workflow.duration}',
        style: '${workflow.style}'
      },
      outputs: ['script', 'title', 'description', 'keywords', 'chapters', 'seoTags']
    }
  ],
  onError: 'continue', // Continue with other providers if one fails
  maxRetries: 2,
  timeout: 300000 // 5 minutes
};

// Different content styles and their characteristics
const contentStyles = {
  educational: {
    description: 'Informative and instructional content',
    audience: 'learners and professionals',
    tone: 'authoritative yet approachable',
    structure: 'problem → solution → implementation'
  },
  entertainment: {
    description: 'Engaging and fun content',
    audience: 'general viewers seeking entertainment',
    tone: 'casual and energetic',
    structure: 'hook → story → payoff'
  },
  documentary: {
    description: 'In-depth investigative content',
    audience: 'curious minds and researchers',
    tone: 'journalistic and objective',
    structure: 'exploration → discovery → implications'
  },
  tutorial: {
    description: 'Step-by-step instructional content',
    audience: 'hands-on learners',
    tone: 'clear and supportive',
    structure: 'preparation → execution → verification'
  },
  review: {
    description: 'Analytical evaluation content',
    audience: 'decision-makers and consumers',
    tone: 'balanced and detailed',
    structure: 'overview → analysis → recommendation'
  }
};

export async function demonstrateEnhancedScriptGeneration(): Promise<void> {
  console.log('🎬 Starting Enhanced Script Generation Demo\n');

  // Initialize workflow engine
  const engine = new WorkflowEngine({
    providers: {},
    storage: { type: 'memory', config: {} },
    logging: { level: 'info', storage: 'memory' }
  });

  const topics = [
    'Artificial Intelligence and the Future of Work',
    'Sustainable Living: Small Changes, Big Impact',
    'Cryptocurrency: Investment or Speculation?',
    'Mental Health in the Digital Age',
    'The Rise of Remote Work Culture'
  ];

  for (const [index, topic] of topics.entries()) {
    const style = Object.keys(contentStyles)[index % Object.keys(contentStyles).length];
    const duration = [5, 8, 10, 12, 15][index % 5]; // Vary duration

    console.log(`\n📝 Generating content for: "${topic}"`);
    console.log(`🎭 Style: ${style} (${contentStyles[style as keyof typeof contentStyles].description})`);
    console.log(`⏱️ Duration: ${duration} minutes`);
    console.log('=' + '='.repeat(80));

    try {
      // Execute the enhanced script generation workflow
      const context = await engine.executeWorkflow(enhancedScriptWorkflow, {
        topic,
        duration,
        style
      });

      // Compare outputs from different providers
      console.log('\n🤖 Provider Comparison:');
      
      // OpenAI Results
      const openaiResult = context.stepResults['openai-script'];
      if (openaiResult?.status === 'completed' && openaiResult.outputs) {
        console.log('\n🟢 OpenAI GPT Results:');
        console.log(`Title: ${openaiResult.outputs.title}`);
        console.log(`Word Count: ${openaiResult.outputs.wordCount}`);
        console.log(`Keywords: ${openaiResult.outputs.keywords?.join(', ')}`);
        console.log(`Model: ${openaiResult.outputs.model}`);
        console.log(`Tokens Used: ${openaiResult.outputs.tokensUsed}`);
      }

      // Anthropic Results
      const anthropicResult = context.stepResults['anthropic-script'];
      if (anthropicResult?.status === 'completed' && anthropicResult.outputs) {
        console.log('\n🔵 Anthropic Claude Results:');
        console.log(`Title: ${anthropicResult.outputs.title}`);
        console.log(`Word Count: ${anthropicResult.outputs.wordCount}`);
        console.log(`Keywords: ${anthropicResult.outputs.keywords?.join(', ')}`);
        console.log(`Model: ${anthropicResult.outputs.model}`);
        console.log(`Tokens Used: ${anthropicResult.outputs.tokensUsed}`);
      }

      // Gemini Results (Enhanced with chapters and SEO)
      const geminiResult = context.stepResults['gemini-script'];
      if (geminiResult?.status === 'completed' && geminiResult.outputs) {
        console.log('\n🟡 Google Gemini Results (Enhanced):');
        console.log(`Title: ${geminiResult.outputs.title}`);
        console.log(`Word Count: ${geminiResult.outputs.wordCount}`);
        console.log(`Keywords: ${geminiResult.outputs.keywords?.join(', ')}`);
        console.log(`Model: ${geminiResult.outputs.model}`);
        
        // Enhanced features from Gemini
        if (geminiResult.outputs.chapters) {
          console.log('\n📚 Chapter Breakdown:');
          geminiResult.outputs.chapters.forEach((chapter: any, idx: number) => {
            console.log(`  ${idx + 1}. ${chapter.timestamp} - ${chapter.title}`);
            console.log(`     ${chapter.description}`);
          });
        }

        if (geminiResult.outputs.seoTags) {
          const seoTags = geminiResult.outputs.seoTags;
          console.log('\n🏷️ SEO Optimization:');
          console.log(`Primary Keywords: ${seoTags.primary?.join(', ')}`);
          console.log(`Secondary Keywords: ${seoTags.secondary?.join(', ')}`);
          console.log(`Trending Tags: ${seoTags.trending?.join(', ')}`);
          console.log(`Hashtags: ${seoTags.hashtags?.join(' ')}`);
        }
      }

      // Performance comparison
      console.log('\n⚡ Performance Metrics:');
      const steps = ['openai-script', 'anthropic-script', 'gemini-script'];
      steps.forEach(stepId => {
        const result = context.stepResults[stepId];
        if (result?.status === 'completed') {
          const duration = result.endTime && result.startTime 
            ? result.endTime.getTime() - result.startTime.getTime()
            : 0;
          console.log(`${stepId}: ${duration}ms (${result.outputs?.tokensUsed || 0} tokens)`);
        } else {
          console.log(`${stepId}: Failed or skipped`);
        }
      });

      // Show sample script preview
      const bestResult = geminiResult?.outputs || anthropicResult?.outputs || openaiResult?.outputs;
      if (bestResult?.script) {
        console.log('\n📄 Script Preview (First 300 characters):');
        console.log(bestResult.script.substring(0, 300) + '...');
      }

    } catch (error) {
      console.error(`❌ Failed to generate content for "${topic}":`, (error as Error).message);
    }

    console.log('\n' + '='.repeat(80));
  }

  // Performance summary
  console.log('\n📊 Demo Summary:');
  console.log('✅ Demonstrated multiple AI provider integration');
  console.log('✅ Showcased enhanced content features (chapters, SEO)');
  console.log('✅ Compared different content styles and approaches');
  console.log('✅ Highlighted performance and token usage metrics');
  
  console.log('\n🚀 Key Enhancements Delivered:');
  console.log('• Google Gemini integration with advanced features');
  console.log('• Chapter breakdown with timestamps');
  console.log('• SEO optimization tags and keywords');
  console.log('• Multi-provider fallback and comparison');
  console.log('• Enhanced content structure and formatting');
  console.log('• Real-time performance metrics');
  
  console.log('\n🎉 Enhanced Script Generation Demo Complete!');
}

// Content planning utility functions
export function generateContentPlan(topic: string, style: string, duration: number) {
  const styleConfig = contentStyles[style as keyof typeof contentStyles];
  
  return {
    topic,
    style,
    duration,
    targetAudience: styleConfig.audience,
    contentTone: styleConfig.tone,
    structure: styleConfig.structure,
    estimatedWords: duration * 160, // Words per minute for video content
    recommendedProviders: style === 'educational' ? ['openai-script', 'gemini-script'] 
                        : style === 'entertainment' ? ['anthropic-script', 'gemini-script']
                        : ['openai-script', 'anthropic-script', 'gemini-script']
  };
}

export function analyzeContentQuality(scriptResult: any): {
  readabilityScore: number;
  engagementFactors: string[];
  seoStrength: number;
  improvementSuggestions: string[];
} {
  const script = scriptResult.script || '';
  const wordCount = script.split(' ').length;
  const sentenceCount = script.split(/[.!?]+/).length;
  const avgWordsPerSentence = wordCount / sentenceCount;

  // Simple readability calculation
  const readabilityScore = Math.max(0, Math.min(100, 100 - (avgWordsPerSentence - 15) * 2));

  // Engagement factors detection
  const engagementFactors = [];
  if (script.includes('?')) engagementFactors.push('Questions for audience engagement');
  if (script.includes('!')) engagementFactors.push('Exclamatory statements for emphasis');
  if (script.match(/\b(you|your)\b/gi)) engagementFactors.push('Direct audience address');
  if (script.match(/\b(subscribe|like|comment)\b/gi)) engagementFactors.push('Call-to-action elements');

  // SEO strength (based on keyword density and structure)
  const keywords = scriptResult.keywords || [];
  const keywordDensity = keywords.length > 0 
    ? keywords.reduce((acc: number, keyword: string) => {
        const regex = new RegExp(keyword, 'gi');
        const matches = script.match(regex);
        return acc + (matches ? matches.length : 0);
      }, 0) / wordCount * 100
    : 0;

  const seoStrength = Math.min(100, keywordDensity * 20);

  // Improvement suggestions
  const suggestions = [];
  if (readabilityScore < 60) suggestions.push('Simplify sentence structure for better readability');
  if (engagementFactors.length < 2) suggestions.push('Add more interactive elements to engage viewers');
  if (seoStrength < 50) suggestions.push('Increase keyword usage for better SEO performance');
  if (wordCount < 500) suggestions.push('Consider expanding content for more comprehensive coverage');

  return {
    readabilityScore,
    engagementFactors,
    seoStrength,
    improvementSuggestions: suggestions
  };
}

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateEnhancedScriptGeneration().catch(console.error);
} 