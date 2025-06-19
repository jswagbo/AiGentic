'use client';

import { useState, useEffect } from 'react';

interface SocialBladeData {
  channelName: string;
  subscribers: number;
  subscribersGrowth: number;
  totalViews: number;
  viewsGrowth: number;
  uploadFrequency: string;
  averageViews: number;
  estimatedEarnings: {
    min: number;
    max: number;
  };
  rank: {
    global: number;
    country: number;
    category: number;
  };
  grade: string;
}

export default function SocialBladeStats() {
  const [data, setData] = useState<SocialBladeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSocialBladeData = async () => {
      try {
        // For now, using mock data. This would be replaced with actual SocialBlade API integration
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        setData({
          channelName: "Content Creator Channel",
          subscribers: 125600,
          subscribersGrowth: 3.2,
          totalViews: 8945712,
          viewsGrowth: 8.7,
          uploadFrequency: "2-3 times per week",
          averageViews: 15400,
          estimatedEarnings: {
            min: 2100,
            max: 8900
          },
          rank: {
            global: 45892,
            country: 1023,
            category: 156
          },
          grade: "A+"
        });
      } catch (err) {
        setError('Failed to fetch SocialBlade data');
        console.error('SocialBlade API error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSocialBladeData();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded w-full"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-2">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">SocialBlade Integration</h3>
          <p className="text-red-600 text-sm">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const formatGrowth = (growth: number) => {
    const sign = growth >= 0 ? '+' : '';
    return `${sign}${growth.toFixed(1)}%`;
  };

  const getGradeColor = (grade: string) => {
    switch (grade.charAt(0)) {
      case 'A': return 'text-green-600 bg-green-100';
      case 'B': return 'text-blue-600 bg-blue-100';
      case 'C': return 'text-yellow-600 bg-yellow-100';
      case 'D': return 'text-orange-600 bg-orange-100';
      default: return 'text-red-600 bg-red-100';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">SocialBlade Analytics</h3>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getGradeColor(data.grade)}`}>
            Grade {data.grade}
          </span>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Channel Overview */}
        <div className="border-b border-gray-100 pb-4">
          <h4 className="font-medium text-gray-900 mb-2">{data.channelName}</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Subscribers:</span>
              <div className="font-semibold">{formatNumber(data.subscribers)}</div>
              <div className="text-green-600 text-xs">{formatGrowth(data.subscribersGrowth)}</div>
            </div>
            <div>
              <span className="text-gray-600">Total Views:</span>
              <div className="font-semibold">{formatNumber(data.totalViews)}</div>
              <div className="text-green-600 text-xs">{formatGrowth(data.viewsGrowth)}</div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="border-b border-gray-100 pb-4">
          <h4 className="font-medium text-gray-900 mb-2">Performance</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Average Views:</span>
              <span className="font-medium">{formatNumber(data.averageViews)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Upload Frequency:</span>
              <span className="font-medium">{data.uploadFrequency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Est. Monthly Earnings:</span>
              <span className="font-medium">
                ${formatNumber(data.estimatedEarnings.min)} - ${formatNumber(data.estimatedEarnings.max)}
              </span>
            </div>
          </div>
        </div>

        {/* Rankings */}
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Rankings</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Global Rank:</span>
              <span className="font-medium">#{data.rank.global.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Country Rank:</span>
              <span className="font-medium">#{data.rank.country.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Category Rank:</span>
              <span className="font-medium">#{data.rank.category.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-4 border-t border-gray-100">
          <button className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all">
            View Detailed Analytics →
          </button>
        </div>
      </div>
    </div>
  );
} 