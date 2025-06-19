import { Suspense } from 'react';
import { auth } from '../../../lib/auth';
import { redirect } from 'next/navigation';
import TrendsOverview from '../../../components/trends/TrendsOverview';
import SocialBladeStats from '../../../components/trends/SocialBladeStats';
import ContentRecommendations from '../../../components/trends/ContentRecommendations';
import TrendingTopics from '../../../components/trends/TrendingTopics';

export default async function TrendsPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/signin');
  }

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Content Trends & Analytics</h1>
        <p className="text-gray-600 mt-1">
          Discover trending topics and analyze performance metrics for content optimization
        </p>
      </div>

      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }>
        {/* Overview Stats Grid */}
        <TrendsOverview />
        
        {/* SocialBlade Integration */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SocialBladeStats />
          <ContentRecommendations />
        </div>
        
        {/* Trending Topics */}
        <TrendingTopics />
      </Suspense>
    </div>
  );
} 