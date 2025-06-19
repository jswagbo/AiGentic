import { Metadata } from 'next';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { MonitoringDashboard } from '../../../components/monitoring/MonitoringDashboard';

export const metadata: Metadata = {
  title: 'System Monitoring | AIGentic',
  description: 'Monitor system health, errors, and workflow performance',
};

export default function MonitoringPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Monitoring</h1>
          <p className="text-gray-600 mt-2">
            Monitor system health, track errors, and manage workflow performance.
          </p>
        </div>
        
        <MonitoringDashboard />
      </div>
    </DashboardLayout>
  );
} 