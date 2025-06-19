'use client';

import { useState, useEffect } from 'react';

interface TrendingTopic {
  id: string;
  name: string;
  category: string;
  hashtag: string;
  mentions: number;
  growth: number;
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  platforms: string[];
  peakTime: string;
  relatedTopics: string[];
}

export default function TrendingTopics() {
  const [topics, setTopics] = useState<TrendingTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('All');

  useEffect(() => {
    const fetchTrendingTopics = async () => {
      try {
        // Mock trending topics data
        await new Promise(resolve => setTimeout(resolve, 800));
        
        setTopics([
          {
            id: '1',
            name: 'AI Content Creation',
            category: 'Technology',
            hashtag: '#AIContent',
            mentions: 127500,
            growth: 156.3,
            sentiment: 'Positive',
            platforms: ['YouTube', 'TikTok', 'Twitter'],
            peakTime: '2-4 PM EST',
            relatedTopics: ['OpenAI', 'ChatGPT', 'Automation']
          },
          {
            id: '2',
            name: 'Climate Action',
            category: 'Environment',
            hashtag: '#ClimateAction',
            mentions: 89200,
            growth: 78.9,
            sentiment: 'Positive',
            platforms: ['Instagram', 'YouTube', 'Twitter'],
            peakTime: '6-8 PM EST',
            relatedTopics: ['Sustainability', 'GreenTech', 'RenewableEnergy']
          },
          {
            id: '3',
            name: 'Remote Work Tips',
            category: 'Lifestyle',
            hashtag: '#WFH',
            mentions: 64800,
            growth: 34.2,
            sentiment: 'Neutral',
            platforms: ['LinkedIn', 'YouTube', 'Twitter'],
            peakTime: '9-11 AM EST',
            relatedTopics: ['Productivity', 'HomeOffice', 'WorkLifeBalance']
          },
          {
            id: '4',
            name: 'Crypto Recovery',
            category: 'Finance',
            hashtag: '#CryptoRecovery',
            mentions: 92100,
            growth: -12.5,
            sentiment: 'Negative',
            platforms: ['Twitter', 'Reddit', 'YouTube'],
            peakTime: '10 AM-12 PM EST',
            relatedTopics: ['Bitcoin', 'Ethereum', 'Trading']
          },
          {
            id: '5',
            name: 'Mental Health Awareness',
            category: 'Health',
            hashtag: '#MentalHealthMatters',
            mentions: 156300,
            growth: 89.4,
            sentiment: 'Positive',
            platforms: ['Instagram', 'TikTok', 'YouTube'],
            peakTime: '7-9 PM EST',
            relatedTopics: ['Wellness', 'SelfCare', 'Therapy']
          },
          {
            id: '6',
            name: 'Quick Recipes',
            category: 'Food',
            hashtag: '#QuickMeals',
            mentions: 73400,
            growth: 45.7,
            sentiment: 'Positive',
            platforms: ['TikTok', 'Instagram', 'YouTube'],
            peakTime: '5-7 PM EST',
            relatedTopics: ['Cooking', 'HealthyEating', 'MealPrep']
          }
        ]);
      } catch (error) {
        console.error('Failed to fetch trending topics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrendingTopics();
  }, []);

  const platforms = ['All', 'YouTube', 'TikTok', 'Instagram', 'Twitter', 'LinkedIn'];
  
  const filteredTopics = selectedPlatform === 'All' 
    ? topics 
    : topics.filter(topic => topic.platforms.includes(selectedPlatform));

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'Positive': return 'text-green-600 bg-green-100';
      case 'Neutral': return 'text-yellow-600 bg-yellow-100';
      case 'Negative': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'Positive': return '😊';
      case 'Neutral': return '😐';
      case 'Negative': return '😔';
      default: return '🤔';
    }
  };

  const formatMentions = (mentions: number) => {
    if (mentions >= 1000000) return `${(mentions / 1000000).toFixed(1)}M`;
    if (mentions >= 1000) return `${(mentions / 1000).toFixed(1)}K`;
    return mentions.toLocaleString();
  };

  const formatGrowth = (growth: number) => {
    const sign = growth >= 0 ? '+' : '';
    return `${sign}${growth.toFixed(1)}%`;
  };

  const getGrowthColor = (growth: number) => {
    return growth >= 0 ? 'text-green-600' : 'text-red-600';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-3"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Trending Topics</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Real-time data</span>
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
        </div>
      </div>

      {/* Platform Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {platforms.map((platform) => (
          <button
            key={platform}
            onClick={() => setSelectedPlatform(platform)}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              selectedPlatform === platform
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {platform}
          </button>
        ))}
      </div>

      {/* Topics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTopics.map((topic) => (
          <div key={topic.id} className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-medium text-gray-900 text-sm">{topic.name}</h4>
                <p className="text-purple-600 text-xs font-mono">{topic.hashtag}</p>
              </div>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {topic.category}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Mentions:</span>
                <span className="font-semibold">{formatMentions(topic.mentions)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Growth:</span>
                <span className={`font-semibold ${getGrowthColor(topic.growth)}`}>
                  {formatGrowth(topic.growth)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Peak Time:</span>
                <span className="font-medium">{topic.peakTime}</span>
              </div>
            </div>

            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-600">Sentiment:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSentimentColor(topic.sentiment)}`}>
                  {getSentimentIcon(topic.sentiment)} {topic.sentiment}
                </span>
              </div>
            </div>

            <div className="mb-3">
              <p className="text-xs text-gray-600 mb-1">Platforms:</p>
              <div className="flex flex-wrap gap-1">
                {topic.platforms.map((platform) => (
                  <span key={platform} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                    {platform}
                  </span>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs text-gray-600 mb-1">Related:</p>
              <div className="flex flex-wrap gap-1">
                {topic.relatedTopics.slice(0, 3).map((related) => (
                  <span key={related} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                    {related}
                  </span>
                ))}
              </div>
            </div>

            <button className="w-full px-3 py-2 bg-purple-600 text-white text-xs font-medium rounded hover:bg-purple-700 transition-colors">
              Create Content
            </button>
          </div>
        ))}
      </div>

      {filteredTopics.length === 0 && (
        <div className="text-center text-gray-500 py-12">
          <div className="text-3xl mb-3">📊</div>
          <p className="text-sm">No trending topics found for this platform</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-6 border-t border-gray-100 mt-6">
        <button className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all">
          📈 View Detailed Analytics
        </button>
        <button className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-green-700 hover:to-blue-700 transition-all">
          ⚡ Set Trend Alerts
        </button>
      </div>
    </div>
  );
} 