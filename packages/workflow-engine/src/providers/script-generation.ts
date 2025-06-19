import { BaseProvider } from './base-provider';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';

export class OpenAIScriptProvider extends BaseProvider {
  private client?: OpenAI;

  constructor() {
    super('openai-script', 'script-generation');
    this.requiredInputs = ['topic', 'duration', 'style'];
    this.outputs = ['script', 'title', 'description', 'keywords'];
    this.defaultConfig = {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000
    };
  }

  protected getRequiredConfigKeys(): string[] {
    return ['apiKey'];
  }

  protected validateConfig(config: Record<string, any>): boolean {
    // Validate API key format
    if (!config.apiKey || !config.apiKey.startsWith('sk-')) {
      this.log('warn', 'Invalid OpenAI API key format');
      return false;
    }

    // Validate model is supported
    const supportedModels = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'];
    if (config.model && !supportedModels.includes(config.model)) {
      this.log('warn', `Unsupported model: ${config.model}`);
      return false;
    }

    // Validate temperature
    if (config.temperature && (config.temperature < 0 || config.temperature > 2)) {
      this.log('warn', 'Temperature must be between 0 and 2');
      return false;
    }

    return true;
  }

  private initializeClient(apiKey: string): void {
    if (!this.client) {
      this.client = new OpenAI({
        apiKey: apiKey,
      });
    }
  }

  async execute(config: Record<string, any>, inputs: Record<string, any>): Promise<Record<string, any>> {
    await this.onBeforeExecute(config, inputs);
    this.validateInputs(inputs);
    
    const mergedConfig = this.mergeConfig(config);
    const { topic, duration, style } = inputs;

    this.log('info', `Generating script with OpenAI for topic: ${topic}`);

    try {
      // Initialize OpenAI client
      this.initializeClient(mergedConfig.apiKey);
      
      if (!this.client) {
        throw new Error('Failed to initialize OpenAI client');
      }

      // Create system prompt for script generation
      const systemPrompt = this.createSystemPrompt(style, duration);
      const userPrompt = this.createUserPrompt(topic, duration, style);

      this.log('debug', `Calling OpenAI API with model: ${mergedConfig.model}`);

      // Call OpenAI API
      const completion = await this.client.chat.completions.create({
        model: mergedConfig.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: mergedConfig.temperature,
        max_tokens: mergedConfig.maxTokens,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI API');
      }

      // Parse the structured response
      const parsedResponse = this.parseScriptResponse(response);
      
      const result = this.createOutput({
        script: parsedResponse.script,
        title: parsedResponse.title,
        description: parsedResponse.description,
        keywords: parsedResponse.keywords,
        wordCount: parsedResponse.script.split(' ').length,
        estimatedDuration: duration,
        generatedAt: new Date().toISOString(),
        model: mergedConfig.model,
        tokensUsed: completion.usage?.total_tokens || 0
      });

      this.log('info', `Script generated successfully (${completion.usage?.total_tokens} tokens used)`);
      await this.onAfterExecute(result);
      return result;
    } catch (error) {
      this.log('error', `OpenAI API call failed: ${(error as Error).message}`);
      
      // If API fails, fallback to mock for development
      if (process.env.NODE_ENV === 'development') {
        this.log('warn', 'Falling back to mock generation for development');
        return this.generateMockResponse(topic, duration, style);
      }
      
      await this.onError(error as Error, config, inputs);
      throw error;
    }
  }

  private createSystemPrompt(style: string, duration: number): string {
    return `You are an expert video script writer specializing in ${style} content. 

Your task is to create engaging, high-quality video scripts that:
- Are appropriate for a ${duration}-minute video
- Match the ${style} style perfectly
- Include clear structure with introduction, main content, and conclusion
- Are optimized for viewer engagement and retention
- Include natural speaking patterns and pacing

Please respond with a JSON object containing:
{
  "title": "Compelling video title (50-60 characters)",
  "script": "Full video script with clear sections and timing",
  "description": "YouTube-optimized description with timestamps and hashtags",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
}

Ensure the script is conversational, engaging, and provides real value to viewers.`;
  }

  private createUserPrompt(topic: string, duration: number, style: string): string {
    return `Create a ${duration}-minute ${style} video script about: ${topic}

Requirements:
- Target duration: ${duration} minutes (approximately ${duration * 150} words)
- Style: ${style}
- Include hook in first 15 seconds
- Provide actionable insights or entertainment value
- Include call-to-action at the end
- Structure with clear sections and flow

Please generate a complete script that would engage viewers and provide value on this topic.`;
  }

  private parseScriptResponse(response: string): {
    title: string;
    script: string; 
    description: string;
    keywords: string[];
  } {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(response);
      return {
        title: parsed.title || 'Generated Video Title',
        script: parsed.script || response,
        description: parsed.description || `Learn about ${response.substring(0, 100)}...`,
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : ['video', 'content', 'education']
      };
    } catch (error) {
      // If JSON parsing fails, extract content manually
      this.log('warn', 'Failed to parse JSON response, extracting content manually');
      
      // Extract title (look for first line or "Title:" pattern)
      const titleMatch = response.match(/(?:Title:|#\s*)(.*?)(?:\n|$)/i);
      const title = titleMatch ? titleMatch[1].trim() : 'Generated Video Title';
      
      // Use the full response as script if no JSON structure
      const script = response.replace(/^.*?Title:.*?\n/i, '').trim();
      
      return {
        title,
        script: script || response,
        description: `An informative video about ${title}. Learn key insights and actionable tips in this comprehensive guide.`,
        keywords: ['education', 'tutorial', 'guide', 'tips', 'insights']
      };
    }
  }

  private async generateMockResponse(topic: string, duration: number, style: string): Promise<Record<string, any>> {
    this.log('info', 'Generating mock response for development');
    await this.sleep(1000); // Simulate some delay
    
    const script = this.generateMockScript(topic, duration, style);
    const title = this.generateMockTitle(topic);
    const description = this.generateMockDescription(topic, script);
    const keywords = this.generateMockKeywords(topic);

    return this.createOutput({
      script,
      title,
      description,
      keywords,
      wordCount: script.split(' ').length,
      estimatedDuration: duration,
      generatedAt: new Date().toISOString(),
      model: 'mock-fallback',
      tokensUsed: 0
    });
  }

  private generateMockScript(topic: string, duration: number, style: string): string {
    return `
# ${topic}

Welcome to today's video about ${topic}. This ${style} presentation will take approximately ${duration} minutes.

## Introduction
In today's rapidly evolving world, understanding ${topic} has become more important than ever. 

## Main Content
Let me walk you through the key aspects of ${topic}:

1. **Background**: The history and development of ${topic}
2. **Current State**: Where we stand today with ${topic}
3. **Future Implications**: What ${topic} means for the future

## Key Points
- ${topic} affects multiple industries
- Understanding ${topic} provides competitive advantages
- Implementation of ${topic} requires strategic planning

## Conclusion
As we've explored today, ${topic} represents both opportunities and challenges. By staying informed and adapting to these changes, we can leverage ${topic} for success.

Thank you for watching, and don't forget to subscribe for more content about ${topic} and related topics!
    `.trim();
  }

  private generateMockTitle(topic: string): string {
    const titleTemplates = [
      `The Ultimate Guide to ${topic}`,
      `Everything You Need to Know About ${topic}`,
      `${topic}: A Complete Overview`,
      `Understanding ${topic} in 2024`,
      `${topic} Explained: Key Insights`
    ];
    
    return titleTemplates[Math.floor(Math.random() * titleTemplates.length)];
  }

  private generateMockDescription(topic: string, script: string): string {
    return `In this comprehensive video, we explore ${topic} and its impact on modern society. Learn about the key concepts, current trends, and future implications. Perfect for beginners and professionals alike. 

🔔 Subscribe for more educational content
📚 Chapters:
0:00 Introduction
1:30 Background
3:00 Current State
4:30 Future Implications
6:00 Conclusion

#${topic.replace(/\s+/g, '')} #Education #Learning`;
  }

  private generateMockKeywords(topic: string): string[] {
    const baseKeywords = topic.toLowerCase().split(' ');
    const additionalKeywords = [
      'tutorial', 'guide', 'explanation', 'overview', 'analysis',
      '2024', 'beginner', 'advanced', 'tips', 'insights'
    ];
    
    return [...baseKeywords, ...additionalKeywords.slice(0, 5)];
  }
}

export class AnthropicScriptProvider extends BaseProvider {
  private client?: Anthropic;

  constructor() {
    super('anthropic-script', 'script-generation');
    this.requiredInputs = ['topic', 'duration', 'style'];
    this.outputs = ['script', 'title', 'description', 'keywords'];
    this.defaultConfig = {
      model: 'claude-3-sonnet-20240229',
      maxTokens: 2000
    };
  }

  protected getRequiredConfigKeys(): string[] {
    return ['apiKey'];
  }

  protected validateConfig(config: Record<string, any>): boolean {
    // Validate API key format
    if (!config.apiKey || !config.apiKey.startsWith('sk-ant-')) {
      this.log('warn', 'Invalid Anthropic API key format');
      return false;
    }

    const supportedModels = [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307'
    ];
    
    if (config.model && !supportedModels.includes(config.model)) {
      this.log('warn', `Unsupported Claude model: ${config.model}`);
      return false;
    }

    return true;
  }

  private initializeClient(apiKey: string): void {
    if (!this.client) {
      this.client = new Anthropic({
        apiKey: apiKey,
      });
    }
  }

  async execute(config: Record<string, any>, inputs: Record<string, any>): Promise<Record<string, any>> {
    await this.onBeforeExecute(config, inputs);
    this.validateInputs(inputs);
    
    const mergedConfig = this.mergeConfig(config);
    const { topic, duration, style } = inputs;

    this.log('info', `Generating script with Claude for topic: ${topic}`);

    try {
      // Initialize Anthropic client
      this.initializeClient(mergedConfig.apiKey);
      
      if (!this.client) {
        throw new Error('Failed to initialize Anthropic client');
      }

      // Create prompts for Claude
      const systemPrompt = this.createClaudeSystemPrompt(style, duration);
      const userPrompt = this.createClaudeUserPrompt(topic, duration, style);

      this.log('debug', `Calling Anthropic API with model: ${mergedConfig.model}`);

      // Call Anthropic API
      const response = await this.client.messages.create({
        model: mergedConfig.model,
        max_tokens: mergedConfig.maxTokens,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ],
      });

      const content = response.content[0];
      if (!content || content.type !== 'text') {
        throw new Error('No text response from Anthropic API');
      }

      // Parse the structured response
      const parsedResponse = this.parseClaudeResponse(content.text);
      
      const result = this.createOutput({
        script: parsedResponse.script,
        title: parsedResponse.title,
        description: parsedResponse.description,
        keywords: parsedResponse.keywords,
        wordCount: parsedResponse.script.split(' ').length,
        estimatedDuration: duration,
        generatedAt: new Date().toISOString(),
        model: mergedConfig.model,
        tokensUsed: response.usage.input_tokens + response.usage.output_tokens
      });

      this.log('info', `Script generated successfully with Claude (${response.usage.input_tokens + response.usage.output_tokens} tokens used)`);
      await this.onAfterExecute(result);
      return result;
    } catch (error) {
      this.log('error', `Anthropic API call failed: ${(error as Error).message}`);
      
      // If API fails, fallback to mock for development
      if (process.env.NODE_ENV === 'development') {
        this.log('warn', 'Falling back to mock generation for development');
        return this.generateClaudeMockResponse(topic, duration, style);
      }
      
      await this.onError(error as Error, config, inputs);
      throw error;
    }
  }

  private createClaudeSystemPrompt(style: string, duration: number): string {
    return `You are Claude, an expert video script writer with deep expertise in ${style} content creation.

Your expertise includes:
- Creating compelling, ${duration}-minute video scripts that engage viewers
- Understanding the ${style} format and audience expectations
- Structuring content for maximum retention and impact
- Writing in a conversational, natural speaking style
- Optimizing for video platform algorithms and viewer engagement

Please provide your response as a JSON object with this exact structure:
{
  "title": "An engaging, SEO-optimized title (50-60 characters)",
  "script": "Complete video script with natural speaking flow and clear sections",
  "description": "Platform-optimized description with key points and relevant hashtags",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
}

Focus on delivering exceptional value while maintaining the authentic ${style} voice throughout.`;
  }

  private createClaudeUserPrompt(topic: string, duration: number, style: string): string {
    return `I need you to create a ${duration}-minute ${style} video script about: "${topic}"

Specific requirements:
- Duration: Exactly ${duration} minutes (approximately ${duration * 150} words)
- Style: ${style} - ensure the tone and approach match this style perfectly
- Structure: Strong hook (first 15 seconds), valuable main content, clear conclusion with CTA
- Engagement: Include questions, examples, or interactive elements to keep viewers watching
- Value: Provide actionable insights, practical tips, or entertaining content
- Flow: Write for spoken delivery with natural pauses and conversational transitions

The script should feel authentic and provide genuine value to viewers interested in ${topic}. Make it compelling enough that viewers will want to watch until the end and potentially subscribe for more content.`;
  }

  private parseClaudeResponse(response: string): {
    title: string;
    script: string;
    description: string;
    keywords: string[];
  } {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(response);
      return {
        title: parsed.title || 'Claude Generated Title',
        script: parsed.script || response,
        description: parsed.description || `Discover insights about ${response.substring(0, 100)}...`,
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : ['analysis', 'insights', 'education', 'claude', 'ai']
      };
    } catch (error) {
      // If JSON parsing fails, extract content manually
      this.log('warn', 'Failed to parse Claude JSON response, extracting content manually');
      
      // Try to extract structured content from Claude's response
      const lines = response.split('\n');
      let title = 'Claude Generated Title';
      let script = response;
      let description = '';
      
      // Look for title patterns
      for (const line of lines) {
        if (line.toLowerCase().includes('title:') || line.startsWith('#')) {
          title = line.replace(/^.*?title:\s*/i, '').replace(/^#+\s*/, '').trim();
          break;
        }
      }
      
      // Clean up script (remove title line if found)
      script = response.replace(/^.*?title:.*?\n/i, '').trim();
      
      description = `An insightful ${title.toLowerCase()} analysis. Explore key concepts and practical applications in this comprehensive guide.`;
      
      return {
        title,
        script: script || response,
        description,
        keywords: ['claude', 'analysis', 'insights', 'ai-generated', 'educational']
      };
    }
  }

  private async generateClaudeMockResponse(topic: string, duration: number, style: string): Promise<Record<string, any>> {
    this.log('info', 'Generating Claude mock response for development');
    await this.sleep(1500); // Simulate some delay
    
    const script = this.generateClaudeMockScript(topic, duration, style);
    const title = this.generateClaudeMockTitle(topic);
    const description = this.generateClaudeMockDescription(topic);
    const keywords = this.generateClaudeMockKeywords(topic);

    return this.createOutput({
      script,
      title,
      description,
      keywords,
      wordCount: script.split(' ').length,
      estimatedDuration: duration,
      generatedAt: new Date().toISOString(),
      model: 'claude-mock-fallback',
      tokensUsed: 0
    });
  }

  private generateClaudeMockScript(topic: string, duration: number, style: string): string {
    return `
# ${topic}: A Comprehensive Analysis

[INTRO - 0:00]
Hello and welcome! Today we're diving deep into ${topic}, exploring its nuances and practical applications in our modern world.

[SECTION 1 - 0:30]
Let's begin by examining the foundational concepts of ${topic}:

**Core Principles:**
- Fundamental understanding of ${topic}
- Historical context and evolution
- Current relevance and applications

[SECTION 2 - ${Math.floor(duration * 0.3)}:00]
Now, let's explore the practical implications of ${topic}:

**Real-World Applications:**
1. Industry applications and use cases
2. Benefits and advantages
3. Challenges and considerations

[SECTION 3 - ${Math.floor(duration * 0.6)}:00]
Looking ahead, what does the future hold for ${topic}?

**Future Outlook:**
- Emerging trends and developments
- Potential impact on various sectors
- Opportunities for innovation

[CONCLUSION - ${Math.floor(duration * 0.85)}:00]
To wrap up, ${topic} represents a fascinating area with significant potential. By understanding these concepts, we're better equipped to navigate and leverage these opportunities.

Thank you for joining me today. If you found this valuable, please like and subscribe for more in-depth analyses!

[END - ${duration}:00]
    `.trim();
  }

  private generateClaudeMockTitle(topic: string): string {
    const titleStyles = [
      `${topic}: Deep Dive Analysis`,
      `Mastering ${topic}: Expert Insights`,
      `${topic} Decoded: What You NEED to Know`,
      `The Science Behind ${topic}`,
      `${topic}: From Theory to Practice`
    ];
    
    return titleStyles[Math.floor(Math.random() * titleStyles.length)];
  }

  private generateClaudeMockDescription(topic: string): string {
    return `Join us for an in-depth exploration of ${topic}, where we break down complex concepts into understandable insights. This comprehensive analysis covers theoretical foundations, practical applications, and future implications.

🎯 What You'll Learn:
• Core principles and concepts
• Real-world applications
• Industry perspectives
• Future trends and opportunities

💡 Perfect for:
• Students and researchers
• Industry professionals
• Anyone curious about ${topic}

⏱️ Timestamps in video for easy navigation
🔔 Subscribe for more analytical content

#${topic.replace(/\s+/g, '')} #Analysis #DeepDive #Education`;
  }

  private generateClaudeMockKeywords(topic: string): string[] {
    const topicWords = topic.toLowerCase().split(' ');
    const analyticalKeywords = [
      'analysis', 'deep dive', 'comprehensive', 'expert', 'insights',
      'theory', 'practice', 'applications', 'trends', 'future'
    ];
    
    return [...topicWords, ...analyticalKeywords.slice(0, 6)];
  }
}

export class GeminiScriptProvider extends BaseProvider {
  private client?: GoogleGenAI;

  constructor() {
    super('gemini-script', 'script-generation');
    this.requiredInputs = ['topic', 'duration', 'style'];
    this.outputs = ['script', 'title', 'description', 'keywords', 'chapters', 'seoTags'];
    this.defaultConfig = {
      model: 'gemini-2.5-flash',
      temperature: 0.7,
      maxOutputTokens: 4096,
      safetySettings: {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      }
    };
  }

  protected getRequiredConfigKeys(): string[] {
    return ['apiKey'];
  }

  protected validateConfig(config: Record<string, any>): boolean {
    // Validate API key (Google AI Studio keys start with "AIza")
    if (!config.apiKey || !config.apiKey.startsWith('AIza')) {
      this.log('warn', 'Invalid Google AI API key format');
      return false;
    }

    // Validate model
    const supportedModels = [
      'gemini-2.5-flash',
      'gemini-2.5-pro', 
      'gemini-1.5-flash',
      'gemini-1.5-pro'
    ];
    
    if (config.model && !supportedModels.includes(config.model)) {
      this.log('warn', `Unsupported Gemini model: ${config.model}`);
      return false;
    }

    return true;
  }

  private initializeClient(apiKey: string): void {
    if (!this.client) {
      this.client = new GoogleGenAI({ apiKey });
    }
  }

  async execute(config: Record<string, any>, inputs: Record<string, any>): Promise<Record<string, any>> {
    await this.onBeforeExecute(config, inputs);
    this.validateInputs(inputs);
    
    const mergedConfig = this.mergeConfig(config);
    const { topic, duration, style } = inputs;

    this.log('info', `Generating script with Gemini for topic: ${topic}`);

    try {
      // Initialize Gemini client
      this.initializeClient(mergedConfig.apiKey);
      
      if (!this.client) {
        throw new Error('Failed to initialize Gemini client');
      }

      // Create enhanced prompt for Gemini
      const prompt = this.createGeminiPrompt(topic, duration, style);

      this.log('debug', `Calling Gemini API with model: ${mergedConfig.model}`);

      // Call Gemini API
      const response = await this.client.models.generateContent({
        model: mergedConfig.model,
        contents: prompt,
        config: {
          temperature: mergedConfig.temperature,
          maxOutputTokens: mergedConfig.maxOutputTokens,
          safetySettings: [
            {
              category: 'HARM_CATEGORY_HARASSMENT' as any,
              threshold: 'BLOCK_MEDIUM_AND_ABOVE' as any
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH' as any,
              threshold: 'BLOCK_MEDIUM_AND_ABOVE' as any
            }
          ]
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('No response from Gemini API');
      }

      // Parse the structured response
      const parsedResponse = this.parseGeminiResponse(responseText);
      
      const result = this.createOutput({
        script: parsedResponse.script,
        title: parsedResponse.title,
        description: parsedResponse.description,
        keywords: parsedResponse.keywords,
        chapters: parsedResponse.chapters,
        seoTags: parsedResponse.seoTags,
        wordCount: parsedResponse.script.split(' ').length,
        estimatedDuration: duration,
        generatedAt: new Date().toISOString(),
        model: mergedConfig.model,
        tokensUsed: response.candidates?.[0]?.tokenCount || 0,
        contentStructure: 'enhanced-with-chapters'
      });

      this.log('info', `Script generated successfully with Gemini (${response.candidates?.[0]?.tokenCount || 0} tokens used)`);
      await this.onAfterExecute(result);
      return result;
    } catch (error) {
      this.log('error', `Gemini API call failed: ${(error as Error).message}`);
      
      // If API fails, fallback to mock for development
      if (process.env.NODE_ENV === 'development') {
        this.log('warn', 'Falling back to mock generation for development');
        return this.generateGeminiMockResponse(topic, duration, style);
      }
      
      await this.onError(error as Error, config, inputs);
      throw error;
    }
  }

  private createGeminiPrompt(topic: string, duration: number, style: string): string {
    return `You are Gemini, Google's advanced AI assistant specialized in creating exceptional video content. Your expertise spans content strategy, scriptwriting, SEO optimization, and audience engagement.

Create a comprehensive ${duration}-minute ${style} video script about: "${topic}"

CONTENT REQUIREMENTS:
- Duration: ${duration} minutes (approximately ${duration * 160} words)
- Style: ${style} - maintain authentic tone throughout
- Structure: Compelling hook, valuable content, strong conclusion
- Engagement: Include interactive elements and viewer retention tactics
- SEO: Optimize for search and discovery

ADVANCED FEATURES TO INCLUDE:
1. Chapter breakdown with timestamps
2. SEO-optimized tags and keywords
3. Audience engagement strategies
4. Content structure for maximum retention
5. Platform-specific optimization hints

Please respond with a JSON object containing:
{
  "title": "SEO-optimized title (50-60 characters)",
  "script": "Complete video script with timestamps and section markers",
  "description": "Platform-optimized description with rich formatting",
  "keywords": ["primary", "secondary", "long-tail", "trending", "niche"],
  "chapters": [
    {"timestamp": "0:00", "title": "Introduction", "description": "Hook and overview"},
    {"timestamp": "1:30", "title": "Main Content", "description": "Core value delivery"}
  ],
  "seoTags": {
    "primary": ["main topic keywords"],
    "secondary": ["related terms"],
    "trending": ["current trend keywords"],
    "hashtags": ["#relevant", "#hashtags"]
  }
}

Focus on creating content that genuinely serves the audience while optimizing for platform algorithms and search discovery.`;
  }

  private parseGeminiResponse(response: string): {
    title: string;
    script: string;
    description: string;
    keywords: string[];
    chapters: Array<{timestamp: string; title: string; description: string}>;
    seoTags: {
      primary: string[];
      secondary: string[];
      trending: string[];
      hashtags: string[];
    };
  } {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(response);
      return {
        title: parsed.title || 'Gemini Generated Video',
        script: parsed.script || response,
        description: parsed.description || `Explore ${response.substring(0, 100)}... in this comprehensive guide.`,
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : ['video', 'education', 'content'],
        chapters: Array.isArray(parsed.chapters) ? parsed.chapters : [
          {timestamp: '0:00', title: 'Introduction', description: 'Opening and overview'},
          {timestamp: '1:30', title: 'Main Content', description: 'Core information'},
          {timestamp: `${Math.floor(parsed.estimatedDuration * 0.8)}:00`, title: 'Conclusion', description: 'Summary and call to action'}
        ],
        seoTags: parsed.seoTags || {
          primary: ['education', 'tutorial'],
          secondary: ['guide', 'tips'],
          trending: ['2024', 'latest'],
          hashtags: ['#education', '#tutorial']
        }
      };
    } catch (error) {
      // If JSON parsing fails, extract content manually with enhanced structure
      this.log('warn', 'Failed to parse Gemini JSON response, extracting content manually');
      
      const lines = response.split('\n').filter(line => line.trim());
      let title = 'Gemini Generated Video';
      let script = response;
      
      // Look for title patterns
      for (const line of lines) {
        if (line.toLowerCase().includes('title:') || line.startsWith('#')) {
          title = line.replace(/^.*?title:\s*/i, '').replace(/^#+\s*/, '').trim();
          break;
        }
      }
      
      // Generate enhanced structure even from unstructured response
      const chapters = this.generateChaptersFromScript(script, title);
      const seoTags = this.generateSEOTags(title, script);
      
      return {
        title,
        script: script || response,
        description: this.generateEnhancedDescription(title, script),
        keywords: this.extractKeywords(title + ' ' + script),
        chapters,
        seoTags
      };
    }
  }

  private generateChaptersFromScript(script: string, title: string): Array<{timestamp: string; title: string; description: string}> {
    const chapters = [];
    const lines = script.split('\n').filter(line => line.trim());
    
    // Look for section headers or create logical breaks
    let currentTime = 0;
    const timePerSection = Math.floor(script.split(' ').length / 150); // Approximate speaking pace
    
    chapters.push({
      timestamp: '0:00',
      title: 'Introduction',
      description: 'Opening hook and topic introduction'
    });
    
    chapters.push({
      timestamp: `${Math.floor(timePerSection * 0.3)}:${String(Math.floor((timePerSection * 0.3 % 1) * 60)).padStart(2, '0')}`,
      title: 'Main Content',
      description: 'Core concepts and key insights'
    });
    
    chapters.push({
      timestamp: `${Math.floor(timePerSection * 0.8)}:${String(Math.floor((timePerSection * 0.8 % 1) * 60)).padStart(2, '0')}`,
      title: 'Conclusion',
      description: 'Summary and call to action'
    });
    
    return chapters;
  }

  private generateSEOTags(title: string, script: string): {
    primary: string[];
    secondary: string[];
    trending: string[];
    hashtags: string[];
  } {
    const text = (title + ' ' + script).toLowerCase();
    const words = text.split(/\s+/).filter(word => word.length > 3);
    
    // Simple keyword extraction (in real implementation, you'd use more sophisticated NLP)
    const wordFreq = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const sortedWords = Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 15)
      .map(([word]) => word);
    
    return {
      primary: sortedWords.slice(0, 5),
      secondary: sortedWords.slice(5, 10),
      trending: ['2024', 'latest', 'guide', 'tutorial', 'tips'],
      hashtags: sortedWords.slice(0, 8).map(word => `#${word}`)
    };
  }

  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase().split(/\s+/).filter(word => word.length > 3);
    const wordFreq = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  private generateEnhancedDescription(title: string, script: string): string {
    const preview = script.substring(0, 200).trim();
    
    return `🎯 ${title}

${preview}${preview.length === 200 ? '...' : ''}

💡 What You'll Learn:
• Key concepts and insights
• Practical applications
• Expert tips and strategies
• Future trends and opportunities

🔔 Subscribe for more quality content
👍 Like if this was helpful
💬 Share your thoughts in comments

⏱️ Use chapters below for easy navigation
🔗 Links and resources in description

#Education #Tutorial #Guide #Insights #Learning`;
  }

  private async generateGeminiMockResponse(topic: string, duration: number, style: string): Promise<Record<string, any>> {
    this.log('info', 'Generating Gemini mock response for development');
    await this.sleep(1200); // Simulate some delay
    
    const script = this.generateGeminiMockScript(topic, duration, style);
    const title = this.generateGeminiMockTitle(topic);
    const description = this.generateEnhancedDescription(title, script);
    const keywords = this.extractKeywords(title + ' ' + script);
    const chapters = this.generateChaptersFromScript(script, title);
    const seoTags = this.generateSEOTags(title, script);

    return this.createOutput({
      script,
      title,
      description,
      keywords,
      chapters,
      seoTags,
      wordCount: script.split(' ').length,
      estimatedDuration: duration,
      generatedAt: new Date().toISOString(),
      model: 'gemini-mock-fallback',
      tokensUsed: 0,
      contentStructure: 'enhanced-with-chapters'
    });
  }

  private generateGeminiMockScript(topic: string, duration: number, style: string): string {
    return `
[INTRO - 0:00] 🎬
Hey everyone! Welcome back to the channel. Today we're exploring ${topic}, and I promise you're going to walk away with some incredible insights. If you're new here, hit that subscribe button - you won't want to miss what's coming!

[HOOK - 0:15] ⚡
Did you know that ${topic} has completely transformed how we approach modern challenges? In the next ${duration} minutes, I'm going to show you exactly why this matters and how you can leverage it.

[SECTION 1: FOUNDATION - 1:00] 🏗️
Let's start with the fundamentals. ${topic} represents a paradigm shift in how we think about:

✅ Core principles and underlying concepts
✅ Historical context and evolution
✅ Why it matters in today's landscape

The key insight here is that ${topic} isn't just a trend - it's a fundamental shift that's reshaping entire industries.

[SECTION 2: PRACTICAL APPLICATIONS - ${Math.floor(duration * 0.4)}:00] 🚀
Now, here's where it gets really interesting. Let me show you three real-world applications:

🎯 **Application 1**: Industry transformation
- How leading companies are implementing ${topic}
- Measurable results and outcomes
- Lessons learned from early adopters

🎯 **Application 2**: Personal and professional growth
- Skills and competencies you need to develop
- Career opportunities and paths
- Building your expertise in this area

🎯 **Application 3**: Future opportunities
- Emerging trends and developments
- Where the smart money is going
- How to position yourself for success

[DEEP DIVE - ${Math.floor(duration * 0.6)}:00] 🔍
Let's go deeper. The most successful people in this space understand three critical factors:

1. **Timing**: When to make your move
2. **Strategy**: How to approach implementation
3. **Execution**: What separates success from failure

[EXPERT INSIGHTS - ${Math.floor(duration * 0.75)}:00] 💡
I recently spoke with industry leaders, and here's what they told me about ${topic}:

"The organizations that master ${topic} will have a significant competitive advantage in the next decade."

This isn't just opinion - the data backs it up. Studies show that early adopters see measurable improvements in efficiency, innovation, and market position.

[CALL TO ACTION - ${Math.floor(duration * 0.9)}:00] 📢
So here's what I want you to do right now:

1. **Subscribe** if you haven't already - I'm sharing more insights like this every week
2. **Comment** below with your biggest takeaway from today's video
3. **Share** this with someone who needs to understand ${topic}

[CONCLUSION - ${Math.floor(duration * 0.95)}:00] 🎯
To wrap up: ${topic} isn't just about understanding concepts - it's about taking action. The future belongs to those who embrace these changes and position themselves accordingly.

Thanks for watching, and I'll see you in the next video!

[END SCREEN - ${duration}:00] 👋
    `.trim();
  }

  private generateGeminiMockTitle(topic: string): string {
    const titleFormats = [
      `${topic}: The Complete 2024 Guide`,
      `Why Everyone's Talking About ${topic}`,
      `${topic} Explained: What You NEED to Know`,
      `The Future of ${topic}: Expert Analysis`,
      `Master ${topic}: Essential Strategies & Insights`
    ];
    
    return titleFormats[Math.floor(Math.random() * titleFormats.length)];
  }
} 