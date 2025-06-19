import { BaseProvider } from './base-provider';

export class YouTubePublishingProvider extends BaseProvider {
  constructor() {
    super('youtube-publisher', 'publishing');
    this.requiredInputs = ['videoUrl', 'title', 'description'];
    this.outputs = ['videoId', 'publishUrl', 'metadata'];
    this.defaultConfig = {
      privacy: 'private',
      category: '22', // People & Blogs
      tags: []
    };
  }

  protected getRequiredConfigKeys(): string[] {
    return ['clientId', 'clientSecret', 'refreshToken'];
  }

  async execute(config: Record<string, any>, inputs: Record<string, any>): Promise<Record<string, any>> {
    await this.onBeforeExecute(config, inputs);
    this.validateInputs(inputs);
    
    const mergedConfig = this.mergeConfig(config);
    const { videoUrl, title, description } = inputs;

    this.log('info', `Publishing video to YouTube: ${title}`);

    try {
      // Mock video upload and publishing
      await this.sleep(8000); // Simulate upload time

      const videoId = this.generateId('yt');
      const result = this.createOutput({
        videoId,
        publishUrl: `https://youtube.com/watch?v=${videoId}`,
        metadata: {
          title,
          description,
          privacy: mergedConfig.privacy,
          category: mergedConfig.category,
          tags: mergedConfig.tags,
          publishedAt: new Date().toISOString(),
          status: 'uploaded'
        }
      });

      await this.onAfterExecute(result);
      return result;
    } catch (error) {
      await this.onError(error as Error, config, inputs);
      throw error;
    }
  }
}

export class InstagramPublishingProvider extends BaseProvider {
  constructor() {
    super('instagram-publisher', 'publishing');
    this.requiredInputs = ['videoUrl', 'caption'];
    this.outputs = ['postId', 'publishUrl', 'metadata'];
    this.defaultConfig = {
      type: 'reel'
    };
  }

  protected getRequiredConfigKeys(): string[] {
    return ['accessToken'];
  }

  async execute(config: Record<string, any>, inputs: Record<string, any>): Promise<Record<string, any>> {
    await this.onBeforeExecute(config, inputs);
    this.validateInputs(inputs);
    
    const { videoUrl, caption } = inputs;
    this.log('info', `Publishing to Instagram: ${caption.substring(0, 50)}...`);

    try {
      await this.sleep(5000);

      const postId = this.generateId('ig');
      const result = this.createOutput({
        postId,
        publishUrl: `https://instagram.com/p/${postId}`,
        metadata: {
          caption,
          type: config.type || this.defaultConfig.type,
          publishedAt: new Date().toISOString(),
          status: 'published'
        }
      });

      await this.onAfterExecute(result);
      return result;
    } catch (error) {
      await this.onError(error as Error, config, inputs);
      throw error;
    }
  }
}

export class TikTokPublishingProvider extends BaseProvider {
  constructor() {
    super('tiktok-publisher', 'publishing');
    this.requiredInputs = ['videoUrl', 'description'];
    this.outputs = ['videoId', 'publishUrl', 'metadata'];
    this.defaultConfig = {
      privacy: 'PUBLIC_TO_EVERYONE',
      allowDuet: true,
      allowStitch: true
    };
  }

  protected getRequiredConfigKeys(): string[] {
    return ['accessToken'];
  }

  async execute(config: Record<string, any>, inputs: Record<string, any>): Promise<Record<string, any>> {
    await this.onBeforeExecute(config, inputs);
    this.validateInputs(inputs);
    
    const { videoUrl, description } = inputs;
    this.log('info', `Publishing to TikTok: ${description.substring(0, 50)}...`);

    try {
      await this.sleep(6000);

      const videoId = this.generateId('tt');
      const result = this.createOutput({
        videoId,
        publishUrl: `https://tiktok.com/@user/video/${videoId}`,
        metadata: {
          description,
          privacy: config.privacy || this.defaultConfig.privacy,
          allowDuet: config.allowDuet ?? this.defaultConfig.allowDuet,
          allowStitch: config.allowStitch ?? this.defaultConfig.allowStitch,
          publishedAt: new Date().toISOString(),
          status: 'published'
        }
      });

      await this.onAfterExecute(result);
      return result;
    } catch (error) {
      await this.onError(error as Error, config, inputs);
      throw error;
    }
  }
} 