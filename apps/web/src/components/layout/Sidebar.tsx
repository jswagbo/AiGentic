'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  PlusIcon,
  ChartBarIcon,
  FolderIcon,
  CogIcon,
  XMarkIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, type: 'link' },
  { name: 'New Project', href: '/dashboard/new', icon: PlusIcon, type: 'modal' },
  { name: 'Projects', href: '/dashboard/projects', icon: FolderIcon, type: 'link' },
  { name: 'Trends', href: '/dashboard/trends', icon: ChartBarIcon, type: 'link' },
  { name: 'Settings', href: '/dashboard/settings', icon: CogIcon, type: 'link' },
];

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  onNewProjectClick?: () => void;
}

export default function Sidebar({ sidebarOpen, setSidebarOpen, onNewProjectClick }: SidebarProps) {
  const pathname = usePathname();

  const handleNavClick = (item: typeof navigation[0]) => {
    if (item.type === 'modal' && item.name === 'New Project') {
      onNewProjectClick?.();
      setSidebarOpen(false); // Close mobile sidebar after clicking
    }
  };

  return (
    <>
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl font-bold text-indigo-600">AIGentic</span>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <nav className="mt-6 px-3">
            <div className="space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                const commonClasses = `${
                  isActive
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                    : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                } group flex items-center px-2 py-2 text-sm font-medium border-l-4 rounded-r-md transition-colors duration-200`;
                
                if (item.type === 'modal') {
                  return (
                    <button
                      key={item.name}
                      onClick={() => handleNavClick(item)}
                      className={`${commonClasses} w-full text-left`}
                    >
                      <item.icon
                        className={`${
                          isActive ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'
                        } mr-3 h-6 w-6 flex-shrink-0`}
                      />
                      {item.name}
                    </button>
                  );
                }
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={commonClasses}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon
                      className={`${
                        isActive ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'
                      } mr-3 h-6 w-6 flex-shrink-0`}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white shadow-xl">
          <div className="flex h-16 items-center px-6 border-b border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl font-bold text-indigo-600">AIGentic</span>
              </div>
            </div>
          </div>
          <nav className="mt-6 flex-1 px-3">
            <div className="space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                const commonClasses = `${
                  isActive
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                    : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                } group flex items-center px-2 py-2 text-sm font-medium border-l-4 rounded-r-md transition-colors duration-200`;
                
                if (item.type === 'modal') {
                  return (
                    <button
                      key={item.name}
                      onClick={() => handleNavClick(item)}
                      className={`${commonClasses} w-full text-left`}
                    >
                      <item.icon
                        className={`${
                          isActive ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'
                        } mr-3 h-6 w-6 flex-shrink-0`}
                      />
                      {item.name}
                    </button>
                  );
                }
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={commonClasses}
                  >
                    <item.icon
                      className={`${
                        isActive ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'
                      } mr-3 h-6 w-6 flex-shrink-0`}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </div>
    </>
  );
} 