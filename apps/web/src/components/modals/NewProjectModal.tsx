'use client';

import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { PlayIcon, DocumentTextIcon, VideoCameraIcon, SpeakerWaveIcon, CloudArrowUpIcon } from '@heroicons/react/24/solid';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (projectData: ProjectFormData) => void;
}

export interface ProjectFormData {
  name: string;
  description: string;
  topic: string;
  style: 'educational' | 'entertainment' | 'documentary' | 'tutorial' | 'review';
  duration: number;
  includeScript: boolean;
  includeVideo: boolean;
  includeVoice: boolean;
  includeStorage: boolean;
}

const PROJECT_STYLES = [
  { value: 'educational', label: 'Educational', description: 'Informative content for learning' },
  { value: 'entertainment', label: 'Entertainment', description: 'Engaging and fun content' },
  { value: 'documentary', label: 'Documentary', description: 'In-depth factual exploration' },
  { value: 'tutorial', label: 'Tutorial', description: 'Step-by-step instructional content' },
  { value: 'review', label: 'Review', description: 'Analysis and evaluation content' },
] as const;

const WORKFLOW_STEPS = [
  {
    id: 'includeScript',
    label: 'Script Generation',
    description: 'AI-generated script with SEO optimization',
    icon: DocumentTextIcon,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    id: 'includeVideo',
    label: 'Video Creation',
    description: 'Professional video generation with Veo3',
    icon: VideoCameraIcon,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  {
    id: 'includeVoice',
    label: 'Voice Synthesis',
    description: 'Natural voice narration with ElevenLabs',
    icon: SpeakerWaveIcon,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    id: 'includeStorage',
    label: 'Cloud Storage',
    description: 'Organized storage to Google Drive',
    icon: CloudArrowUpIcon,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
] as const;

export default function NewProjectModal({ isOpen, onClose, onSubmit }: NewProjectModalProps) {
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    description: '',
    topic: '',
    style: 'educational',
    duration: 5,
    includeScript: true,
    includeVideo: true,
    includeVoice: true,
    includeStorage: true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof ProjectFormData, string>>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ProjectFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    }
    if (!formData.topic.trim()) {
      newErrors.topic = 'Topic is required';
    }
    if (formData.duration < 1 || formData.duration > 60) {
      newErrors.duration = 'Duration must be between 1 and 60 minutes';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error creating project:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateFormData = (field: keyof ProjectFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const selectedStepsCount = WORKFLOW_STEPS.filter(step => formData[step.id as keyof ProjectFormData]).length;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    Create New Project
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="rounded-md p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                  {/* Project Name */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Project Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={formData.name}
                      onChange={(e) => updateFormData('name', e.target.value)}
                      className={`mt-1 block w-full rounded-md border ${
                        errors.name ? 'border-red-300' : 'border-gray-300'
                      } px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm`}
                      placeholder="Enter project name"
                    />
                    {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                  </div>

                  {/* Topic */}
                  <div>
                    <label htmlFor="topic" className="block text-sm font-medium text-gray-700">
                      Content Topic *
                    </label>
                    <input
                      type="text"
                      id="topic"
                      value={formData.topic}
                      onChange={(e) => updateFormData('topic', e.target.value)}
                      className={`mt-1 block w-full rounded-md border ${
                        errors.topic ? 'border-red-300' : 'border-gray-300'
                      } px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm`}
                      placeholder="e.g., 'Artificial Intelligence', 'Climate Change', 'Cooking Tips'"
                    />
                    {errors.topic && <p className="mt-1 text-sm text-red-600">{errors.topic}</p>}
                  </div>

                  {/* Description */}
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <textarea
                      id="description"
                      rows={3}
                      value={formData.description}
                      onChange={(e) => updateFormData('description', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                      placeholder="Optional: Describe your project goals and requirements"
                    />
                  </div>

                  {/* Style and Duration */}
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="style" className="block text-sm font-medium text-gray-700">
                        Content Style
                      </label>
                      <select
                        id="style"
                        value={formData.style}
                        onChange={(e) => updateFormData('style', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                      >
                        {PROJECT_STYLES.map((style) => (
                          <option key={style.value} value={style.value}>
                            {style.label}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-sm text-gray-500">
                        {PROJECT_STYLES.find(s => s.value === formData.style)?.description}
                      </p>
                    </div>

                    <div>
                      <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
                        Duration (minutes)
                      </label>
                      <input
                        type="number"
                        id="duration"
                        min="1"
                        max="60"
                        value={formData.duration}
                        onChange={(e) => updateFormData('duration', parseInt(e.target.value))}
                        className={`mt-1 block w-full rounded-md border ${
                          errors.duration ? 'border-red-300' : 'border-gray-300'
                        } px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm`}
                      />
                      {errors.duration && <p className="mt-1 text-sm text-red-600">{errors.duration}</p>}
                    </div>
                  </div>

                  {/* Workflow Steps */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-700">
                        Workflow Steps
                      </label>
                      <span className="text-sm text-gray-500">
                        {selectedStepsCount} of {WORKFLOW_STEPS.length} selected
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {WORKFLOW_STEPS.map((step) => {
                        const isSelected = formData[step.id as keyof ProjectFormData] as boolean;
                        return (
                          <label
                            key={step.id}
                            className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none ${
                              isSelected
                                ? 'border-indigo-600 ring-2 ring-indigo-600'
                                : 'border-gray-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={isSelected}
                              onChange={(e) => updateFormData(step.id as keyof ProjectFormData, e.target.checked)}
                            />
                            <div className="flex w-full items-center justify-between">
                              <div className="flex items-center">
                                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${step.bgColor}`}>
                                  <step.icon className={`h-6 w-6 ${step.color}`} />
                                </div>
                                <div className="ml-3">
                                  <p className={`text-sm font-medium ${isSelected ? 'text-indigo-900' : 'text-gray-900'}`}>
                                    {step.label}
                                  </p>
                                  <p className={`text-sm ${isSelected ? 'text-indigo-700' : 'text-gray-500'}`}>
                                    {step.description}
                                  </p>
                                </div>
                              </div>
                              {isSelected && (
                                <div className="flex-shrink-0">
                                  <PlayIcon className="h-5 w-5 text-indigo-600" />
                                </div>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex justify-end space-x-3 pt-6">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || selectedStepsCount === 0}
                      className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Creating...
                        </>
                      ) : (
                        'Create Project'
                      )}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
