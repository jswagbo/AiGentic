'use client';

import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import NewProjectModal, { ProjectFormData } from '../modals/NewProjectModal';
import { ErrorBoundary } from '../error/ErrorBoundary';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newProjectModalOpen, setNewProjectModalOpen] = useState(false);

  const handleCreateProject = async (projectData: ProjectFormData) => {
    try {
      console.log('Creating project:', projectData);
      
      // TODO: Integrate with workflow engine
      // For now, just simulate project creation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Project created successfully:', projectData.name);
      
      // TODO: Redirect to project page or update projects list
      
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <Sidebar 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen}
          onNewProjectClick={() => setNewProjectModalOpen(true)}
        />
        
        <div className="lg:pl-64">
          <Header setSidebarOpen={setSidebarOpen} />
          
          <main className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <ErrorBoundary
                fallback={
                  <div className="min-h-[400px] flex items-center justify-center">
                    <div className="text-center">
                      <h2 className="text-lg font-semibold text-gray-900 mb-2">
                        Unable to load this section
                      </h2>
                      <p className="text-gray-600">
                        Please try refreshing the page or contact support if the issue persists.
                      </p>
                    </div>
                  </div>
                }
              >
                {children}
              </ErrorBoundary>
            </div>
          </main>
        </div>

        {/* New Project Modal */}
        <NewProjectModal
          isOpen={newProjectModalOpen}
          onClose={() => setNewProjectModalOpen(false)}
          onSubmit={handleCreateProject}
        />
      </div>
    </ErrorBoundary>
  );
};

// Single default export for consistency
export default DashboardLayout; 