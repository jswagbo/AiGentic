'use client';

import React, { useState, useEffect } from 'react';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ChartBarIcon,
  BellIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface HealthMetrics {
  status: 'healthy' | 'degraded' | 'critical';
  uptime: number;
  metrics: {
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    activeJobs: number;
    avgProcessingTime: number;
    errorRate: number;
    deadLetterCount: number;
  };
  lastCheck: Date;
  alerts: AlertRecord[];
}

interface AlertRecord {
  id: string;
  type: 'error' | 'performance' | 'resource' | 'recovery';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
  context?: Record<string, any>;
}

interface ErrorStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  by_type: Record<string, number>;
  recent: Array<{
    id: string;
    type: string;
    message: string;
    severity: string;
    timestamp: Date;
    url: string;
  }>;
}

export const MonitoringDashboard: React.FC = () => {
  const [healthMetrics, setHealthMetrics] = useState<HealthMetrics | null>(null);
  const [errorStats, setErrorStats] = useState<ErrorStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    fetchMonitoringData();
    const interval = setInterval(fetchMonitoringData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchMonitoringData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch error statistics
      const errorResponse = await fetch('/api/errors');
      if (errorResponse.ok) {
        const errorData = await errorResponse.json();
        setErrorStats(errorData);
      }

      // Simulate health metrics (would come from monitoring API)
      const mockHealthMetrics: HealthMetrics = {
        status: 'healthy',
        uptime: 86400, // 24 hours in seconds
        metrics: {
          totalJobs: 150,
          completedJobs: 142,
          failedJobs: 5,
          activeJobs: 3,
          avgProcessingTime: 45000, // 45 seconds
          errorRate: 3.3,
          deadLetterCount: 2,
        },
        lastCheck: new Date(),
        alerts: [
          {
            id: 'alert-1',
            type: 'performance',
            severity: 'medium',
            message: 'High memory usage detected',
            timestamp: new Date(Date.now() - 300000), // 5 minutes ago
            resolved: false,
          },
        ],
      };
      
      setHealthMetrics(mockHealthMetrics);
      setLastUpdate(new Date());
      
    } catch (error) {
      console.error('Failed to fetch monitoring data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  if (isLoading && !healthMetrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Monitoring</h2>
          <p className="text-sm text-gray-600">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={fetchMonitoringData}
          disabled={isLoading}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <ArrowPathIcon className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* System Health Overview */}
      {healthMetrics && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <ChartBarIcon className="h-5 w-5 mr-2" />
            System Health
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Overall Status */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Status</span>
                {healthMetrics.status === 'healthy' ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                ) : healthMetrics.status === 'degraded' ? (
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
                ) : (
                  <XCircleIcon className="h-5 w-5 text-red-600" />
                )}
              </div>
              <div className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-2 ${getStatusColor(healthMetrics.status)}`}>
                {healthMetrics.status.toUpperCase()}
              </div>
            </div>

            {/* Uptime */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Uptime</span>
                <ClockIcon className="h-5 w-5 text-gray-400" />
              </div>
              <div className="text-lg font-semibold text-gray-900 mt-1">
                {formatUptime(healthMetrics.uptime)}
              </div>
            </div>

            {/* Error Rate */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Error Rate</span>
                <div className={`h-2 w-2 rounded-full ${healthMetrics.metrics.errorRate > 5 ? 'bg-red-500' : 'bg-green-500'}`}></div>
              </div>
              <div className="text-lg font-semibold text-gray-900 mt-1">
                {healthMetrics.metrics.errorRate.toFixed(1)}%
              </div>
            </div>

            {/* Active Jobs */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Active Jobs</span>
                <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
              </div>
              <div className="text-lg font-semibold text-gray-900 mt-1">
                {healthMetrics.metrics.activeJobs}
              </div>
            </div>
          </div>

          {/* Detailed Metrics */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {healthMetrics.metrics.completedJobs}
              </div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {healthMetrics.metrics.failedJobs}
              </div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {healthMetrics.metrics.totalJobs}
              </div>
              <div className="text-sm text-gray-600">Total Jobs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {formatDuration(healthMetrics.metrics.avgProcessingTime)}
              </div>
              <div className="text-sm text-gray-600">Avg Processing</div>
            </div>
          </div>
        </div>
      )}

      {/* Alerts */}
      {healthMetrics && healthMetrics.alerts.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <BellIcon className="h-5 w-5 mr-2" />
            Active Alerts ({healthMetrics.alerts.filter(a => !a.resolved).length})
          </h3>
          
          <div className="space-y-3">
            {healthMetrics.alerts.filter(a => !a.resolved).map((alert) => (
              <div key={alert.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(alert.severity)}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-600 capitalize">
                        {alert.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 mb-2">{alert.message}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <button className="text-sm text-blue-600 hover:text-blue-800">
                    Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Statistics */}
      {errorStats && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
            Error Statistics (24h)
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {errorStats.total}
              </div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {errorStats.critical}
              </div>
              <div className="text-sm text-gray-600">Critical</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {errorStats.high}
              </div>
              <div className="text-sm text-gray-600">High</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {errorStats.medium}
              </div>
              <div className="text-sm text-gray-600">Medium</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {errorStats.low}
              </div>
              <div className="text-sm text-gray-600">Low</div>
            </div>
          </div>

          {/* Recent Errors */}
          {errorStats.recent.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Recent Errors</h4>
              <div className="space-y-2">
                {errorStats.recent.slice(0, 5).map((error) => (
                  <div key={error.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(error.severity)}`}>
                          {error.severity}
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {error.type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">{error.message}</p>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(error.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 