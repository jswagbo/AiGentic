'use client';

import { useState, useEffect } from 'react';

interface ContentRecommendation {
  id: string;
  title: string;
  description: string;
  category: string;
  trendScore: number;
  estimatedViews: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  timeInvestment: string;
  potential: 'High' | 'Medium' | 'Low';
}

export default function ContentRecommendations() {
  const [recommendations, setRecommendations] = useState<ContentRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        // Mock AI-generated recommendations
        await new Promise(resolve => setTimeout(resolve, 1200));
        
        setRecommendations([
          {
            id: '1',
            title: 'AI Tools for Content Creation',
            description: 'Tutorial series covering the latest AI tools transforming content creation workflows',
            category: 'Technology',
            trendScore: 94,
            estimatedViews: 45000,
            difficulty: 'Medium',
            tags: ['AI', 'Tutorial', 'Productivity'],
            timeInvestment: '2-3 hours',
            potential: 'High'
          },
          {
            id: '2',
            title: 'Sustainable Living Hacks',
            description: 'Quick tips for eco-friendly lifestyle changes that actually make a difference',
            category: 'Lifestyle',
            trendScore: 87,
            estimatedViews: 32000,
            difficulty: 'Easy',
            tags: ['Sustainability', 'Tips', 'Environment'],
            timeInvestment: '1-2 hours',
            potential: 'High'
          },
          {
            id: '3',
            title: 'Crypto Market Analysis 2024',
            description: 'Deep dive into market trends and predictions for major cryptocurrencies',
            category: 'Finance',
            trendScore: 82,
            estimatedViews: 28000,
            difficulty: 'Hard',
            tags: ['Crypto', 'Analysis', 'Investment'],
            timeInvestment: '4-5 hours',
            potential: 'Medium'
          },
          {
            id: '4',
            title: '15-Minute Mediterranean Meals',
            description: 'Quick and healthy Mediterranean recipes for busy weeknights',
            category: 'Food',
            trendScore: 79,
            estimatedViews: 25000,
            difficulty: 'Easy',
            tags: ['Cooking', 'Healthy', 'Quick'],
            timeInvestment: '1 hour',
            potential: 'Medium'
          }
        ]);
      } catch (error) {
        console.error('Failed to fetch recommendations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  const categories = ['All', 'Technology', 'Lifestyle', 'Finance', 'Food'];
  
  const filteredRecommendations = selectedCategory === 'All' 
    ? recommendations 
    : recommendations.filter(rec => rec.category === selectedCategory);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPotentialColor = (potential: string) => {
    switch (potential) {
      case 'High': return 'bg-emerald-100 text-emerald-800';
      case 'Medium': return 'bg-blue-100 text-blue-800';
      case 'Low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatViews = (views: number) => {
    if (views >= 1000) return `${(views / 1000).toFixed(0)}K`;
    return views.toString();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-3"></div>
                <div className="flex gap-2">
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
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
        <h3 className="text-lg font-semibold text-gray-900">AI Content Recommendations</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Powered by AI</span>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              selectedCategory === category
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Recommendations List */}
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {filteredRecommendations.map((rec) => (
          <div key={rec.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-medium text-gray-900 text-sm">{rec.title}</h4>
              <div className="flex items-center gap-1 text-xs text-orange-600">
                <span>🔥</span>
                <span>{rec.trendScore}</span>
              </div>
            </div>
            
            <p className="text-gray-600 text-xs mb-3 line-clamp-2">{rec.description}</p>
            
            <div className="flex flex-wrap gap-2 mb-3">
              {rec.tags.map((tag) => (
                <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                  {tag}
                </span>
              ))}
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full font-medium ${getDifficultyColor(rec.difficulty)}`}>
                  {rec.difficulty}
                </span>
                <span className={`px-2 py-1 rounded-full font-medium ${getPotentialColor(rec.potential)}`}>
                  {rec.potential} Potential
                </span>
              </div>
              <div className="text-gray-500">
                ~{formatViews(rec.estimatedViews)} views • {rec.timeInvestment}
              </div>
            </div>
            
            <button className="w-full mt-3 px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors">
              Generate Content Plan
            </button>
          </div>
        ))}
      </div>

      {filteredRecommendations.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          <div className="text-2xl mb-2">🔍</div>
          <p className="text-sm">No recommendations found for this category</p>
        </div>
      )}

      {/* Refresh Button */}
      <div className="pt-4 border-t border-gray-100 mt-6">
        <button className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all">
          🔄 Generate New Recommendations
        </button>
      </div>
    </div>
  );
} 