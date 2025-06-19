'use client';

import { useState, useEffect } from 'react';

interface TrendsMetrics {
  totalViews: number;
  viewsGrowth: number;
  avgEngagement: number;
  engagementGrowth: number;
  trendingScore: number;
  scoreGrowth: number;
  contentSuggestions: number;
  suggestionsGrowth: number;
}

export default function TrendsOverview() {
  const [metrics, setMetrics] = useState<TrendsMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call to fetch trends data
    const fetchMetrics = async () => {
      try {
        // Mock data for now - will be replaced with real SocialBlade API
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setMetrics({
          totalViews: 2547892,
          viewsGrowth: 12.5,
          avgEngagement: 7.8,
          engagementGrowth: -2.3,
          trendingScore: 94,
          scoreGrowth: 8.7,
          contentSuggestions: 15,
          suggestionsGrowth: 25.0,
        });
      } catch (error) {
        console.error('Failed to fetch trends metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!metrics) return null;

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatGrowth = (growth: number) => {
    const sign = growth >= 0 ? '+' : '';
    return `${sign}${growth.toFixed(1)}%`;
  };

  const getGrowthColor = (growth: number) => {
    return growth >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getGrowthIcon = (growth: number) => {
    return growth >= 0 ? '↗️' : '↘️';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Views */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Views</p>
            <p className="text-2xl font-bold text-gray-900">{formatNumber(metrics.totalViews)}</p>
            <p className={`text-sm ${getGrowthColor(metrics.viewsGrowth)} flex items-center gap-1`}>
              <span>{getGrowthIcon(metrics.viewsGrowth)}</span>
              {formatGrowth(metrics.viewsGrowth)} vs last month
            </p>
          </div>
          <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <span className="text-2xl">📊</span>
          </div>
        </div>
      </div>

      {/* Average Engagement */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Avg. Engagement</p>
            <p className="text-2xl font-bold text-gray-900">{metrics.avgEngagement}%</p>
            <p className={`text-sm ${getGrowthColor(metrics.engagementGrowth)} flex items-center gap-1`}>
              <span>{getGrowthIcon(metrics.engagementGrowth)}</span>
              {formatGrowth(metrics.engagementGrowth)} vs last month
            </p>
          </div>
          <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <span className="text-2xl">❤️</span>
          </div>
        </div>
      </div>

      {/* Trending Score */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Trending Score</p>
            <p className="text-2xl font-bold text-gray-900">{metrics.trendingScore}/100</p>
            <p className={`text-sm ${getGrowthColor(metrics.scoreGrowth)} flex items-center gap-1`}>
              <span>{getGrowthIcon(metrics.scoreGrowth)}</span>
              {formatGrowth(metrics.scoreGrowth)} vs last month
            </p>
          </div>
          <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
            <span className="text-2xl">🔥</span>
          </div>
        </div>
      </div>

      {/* Content Suggestions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">New Suggestions</p>
            <p className="text-2xl font-bold text-gray-900">{metrics.contentSuggestions}</p>
            <p className={`text-sm ${getGrowthColor(metrics.suggestionsGrowth)} flex items-center gap-1`}>
              <span>{getGrowthIcon(metrics.suggestionsGrowth)}</span>
              {formatGrowth(metrics.suggestionsGrowth)} vs last week
            </p>
          </div>
          <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
            <span className="text-2xl">💡</span>
          </div>
        </div>
      </div>
    </div>
  );
} 