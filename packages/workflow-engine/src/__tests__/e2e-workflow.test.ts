/**
 * End-to-End Workflow Testing Suite
 * 
 * This test validates the complete idea → video pipeline works without intervention
 * Tests the full content creation workflow: Script → Video → Voice → Storage
 */

import { WorkflowEngine } from '../workflow-engine';
import { createSampleWorkflow } from '../utils/workflow-parser';
import { WorkflowConfig, WorkflowExecutionContext } from '../types';

interface TestResult {
  passed: boolean;
  name: string;
  duration: number;
  error?: string;
  details?: any;
}

class E2EWorkflowTester {
  private engine: WorkflowEngine;
  private testResults: TestResult[] = [];
  private startTime: number = 0;

  constructor() {
    this.engine = new WorkflowEngine({
      providers: {},
      storage: { type: 'memory', config: {} },
      logging: { level: 'info', storage: 'memory' }
    });
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting End-to-End Workflow Testing Suite\n');
    this.startTime = Date.now();

    try {
      // Test 1: Basic workflow validation
      await this.testWorkflowValidation();

      // Test 2: Complete pipeline execution
      await this.testCompletePipeline();

      // Test 3: Multiple topic workflows
      await this.testMultipleTopics();

      // Test 4: Error handling and recovery
      await this.testErrorHandling();

      // Test 5: Provider fallback system
      await this.testProviderFallbacks();

      // Test 6: Workflow cancellation
      await this.testWorkflowCancellation();

      // Test 7: Progress tracking
      await this.testProgressTracking();

      // Generate final report
      this.generateTestReport();

    } catch (error) {
      console.error('💥 Test suite failed:', error);
      throw error;
    }
  }

  private async testWorkflowValidation(): Promise<void> {
    const testName = 'Workflow Configuration Validation';
    const startTime = Date.now();
    
    try {
      console.log(`📋 Testing: ${testName}`);

      // Test valid workflow
      const validWorkflow = createSampleWorkflow('Test Topic');
      const isValid = await this.engine.validateWorkflow(validWorkflow);
      
      if (!isValid) {
        throw new Error('Valid workflow should pass validation');
      }

      // Test provider availability
      const providers = this.engine.getProviderRegistry();
      const requiredProviders = ['openai-script', 'veo-video', 'elevenlabs-voice', 'google-drive'];
      
      for (const provider of requiredProviders) {
        if (!providers.hasProvider(provider)) {
          throw new Error(`Required provider not available: ${provider}`);
        }
      }

      this.addTestResult({
        passed: true,
        name: testName,
        duration: Date.now() - startTime,
        details: {
          workflowSteps: validWorkflow.steps.length,
          providersAvailable: requiredProviders.length
        }
      });

      console.log('✅ Workflow validation passed\n');

    } catch (error) {
      this.addTestResult({
        passed: false,
        name: testName,
        duration: Date.now() - startTime,
        error: (error as Error).message
      });
      console.log(`❌ Workflow validation failed: ${(error as Error).message}\n`);
    }
  }

  private async testCompletePipeline(): Promise<void> {
    const testName = 'Complete Idea-to-Video Pipeline';
    const startTime = Date.now();
    
    try {
      console.log(`🎬 Testing: ${testName}`);

      const topic = 'Artificial Intelligence and Machine Learning';
      const workflow = createSampleWorkflow(topic);
      
      // Add environment variables for testing
      const variables = {
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'mock-key',
        VEO_API_KEY: 'mock-key',
        ELEVENLABS_API_KEY: 'mock-key', 
        GOOGLE_SERVICE_ACCOUNT_KEY: 'mock-key'
      };

      console.log('  → Executing complete workflow...');
      const context = await this.engine.executeWorkflow(workflow, variables, {
        projectId: 'test-project',
        userId: 'test-user',
        metadata: { testRun: true }
      });

      // Validate workflow completion
      if (context.status !== 'completed') {
        throw new Error(`Workflow failed with status: ${context.status}`);
      }

      // Validate all steps completed
      const expectedSteps = ['generate-script', 'create-video', 'synthesize-voice', 'store-video'];
      for (const stepId of expectedSteps) {
        const stepResult = context.stepResults[stepId];
        if (!stepResult || stepResult.status !== 'completed') {
          throw new Error(`Step ${stepId} did not complete successfully`);
        }
      }

      // Validate step outputs
      this.validateStepOutputs(context);

      this.addTestResult({
        passed: true,
        name: testName,
        duration: Date.now() - startTime,
        details: {
          workflowId: context.workflowId,
          executionTime: context.endTime && context.startTime 
            ? context.endTime.getTime() - context.startTime.getTime()
            : 0,
          completedSteps: Object.keys(context.stepResults).length,
          totalVariables: Object.keys(context.variables).length
        }
      });

      console.log('✅ Complete pipeline test passed');
      console.log(`  → Workflow ID: ${context.workflowId}`);
      console.log(`  → Execution time: ${context.endTime && context.startTime ? context.endTime.getTime() - context.startTime.getTime() : 0}ms`);
      console.log(`  → Steps completed: ${Object.keys(context.stepResults).length}\n`);

    } catch (error) {
      this.addTestResult({
        passed: false,
        name: testName,
        duration: Date.now() - startTime,
        error: (error as Error).message
      });
      console.log(`❌ Complete pipeline test failed: ${(error as Error).message}\n`);
    }
  }

  private async testMultipleTopics(): Promise<void> {
    const testName = 'Multiple Topic Workflows';
    const startTime = Date.now();
    
    try {
      console.log(`📚 Testing: ${testName}`);

      const topics = [
        'Climate Change Solutions',
        'Space Exploration Technology',
        'Future of Remote Work',
        'Renewable Energy Innovation'
      ];

      const results: WorkflowExecutionContext[] = [];

      for (const topic of topics) {
        console.log(`  → Processing: ${topic}`);
        const workflow = createSampleWorkflow(topic);
        const context = await this.engine.executeWorkflow(workflow, {
          OPENAI_API_KEY: 'mock-key',
          VEO_API_KEY: 'mock-key',
          ELEVENLABS_API_KEY: 'mock-key',
          GOOGLE_SERVICE_ACCOUNT_KEY: 'mock-key'
        });

        if (context.status !== 'completed') {
          throw new Error(`Workflow for topic "${topic}" failed: ${context.status}`);
        }

        results.push(context);
      }

      this.addTestResult({
        passed: true,
        name: testName,
        duration: Date.now() - startTime,
        details: {
          topicsProcessed: topics.length,
          successfulWorkflows: results.length,
          averageExecutionTime: results.reduce((sum, r) => 
            sum + (r.endTime && r.startTime ? r.endTime.getTime() - r.startTime.getTime() : 0), 0
          ) / results.length
        }
      });

      console.log(`✅ Multiple topics test passed (${topics.length} workflows)\n`);

    } catch (error) {
      this.addTestResult({
        passed: false,
        name: testName,
        duration: Date.now() - startTime,
        error: (error as Error).message
      });
      console.log(`❌ Multiple topics test failed: ${(error as Error).message}\n`);
    }
  }

  private async testErrorHandling(): Promise<void> {
    const testName = 'Error Handling and Recovery';
    const startTime = Date.now();
    
    try {
      console.log(`🛡️ Testing: ${testName}`);

      // Create workflow with invalid provider to test error handling
      const invalidWorkflow: WorkflowConfig = {
        ...createSampleWorkflow('Error Test'),
        steps: [
          {
            id: 'invalid-step',
            name: 'Invalid Step',
            type: 'webhook',
            provider: 'non-existent-provider',
            config: {},
            inputs: {},
            outputs: []
          }
        ]
      };

      let errorCaught = false;
      try {
        await this.engine.executeWorkflow(invalidWorkflow);
      } catch (error) {
        errorCaught = true;
        console.log('  → Expected error caught:', (error as Error).message);
      }

      if (!errorCaught) {
        throw new Error('Expected error was not thrown for invalid provider');
      }

      this.addTestResult({
        passed: true,
        name: testName,
        duration: Date.now() - startTime,
        details: {
          errorHandlingWorking: true,
          invalidProviderDetected: true
        }
      });

      console.log('✅ Error handling test passed\n');

    } catch (error) {
      this.addTestResult({
        passed: false,
        name: testName,
        duration: Date.now() - startTime,
        error: (error as Error).message
      });
      console.log(`❌ Error handling test failed: ${(error as Error).message}\n`);
    }
  }

  private async testProviderFallbacks(): Promise<void> {
    const testName = 'Provider Fallback System';
    const startTime = Date.now();
    
    try {
      console.log(`🔄 Testing: ${testName}`);

      // Test that providers work with mock fallbacks when no API keys provided
      const workflow = createSampleWorkflow('Fallback Test');
      const context = await this.engine.executeWorkflow(workflow, {
        // Intentionally not providing API keys to test fallbacks
      });

      if (context.status !== 'completed') {
        throw new Error(`Fallback workflow failed: ${context.status}`);
      }

      // All steps should complete using mock providers
      const allStepsCompleted = Object.values(context.stepResults).every(
        result => result.status === 'completed'
      );

      if (!allStepsCompleted) {
        throw new Error('Not all steps completed with fallback providers');
      }

      this.addTestResult({
        passed: true,
        name: testName,
        duration: Date.now() - startTime,
        details: {
          fallbackProvidersWorking: true,
          stepsCompletedWithFallbacks: Object.keys(context.stepResults).length
        }
      });

      console.log('✅ Provider fallback test passed\n');

    } catch (error) {
      this.addTestResult({
        passed: false,
        name: testName,
        duration: Date.now() - startTime,
        error: (error as Error).message
      });
      console.log(`❌ Provider fallback test failed: ${(error as Error).message}\n`);
    }
  }

  private async testWorkflowCancellation(): Promise<void> {
    const testName = 'Workflow Cancellation';
    const startTime = Date.now();
    
    try {
      console.log(`⏹️ Testing: ${testName}`);

      const workflow = createSampleWorkflow('Cancellation Test');
      
      // Start workflow execution (don't await)
      const executionPromise = this.engine.executeWorkflow(workflow, {
        OPENAI_API_KEY: 'mock-key'
      });

      // Give it a moment to start
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get running workflows
      const runningWorkflows = this.engine.getRunningWorkflows();
      
      if (runningWorkflows.length === 0) {
        throw new Error('No running workflows found to cancel');
      }

      // Cancel the workflow
      const cancelled = await this.engine.cancelWorkflow(runningWorkflows[0]);
      
      if (!cancelled) {
        throw new Error('Failed to cancel workflow');
      }

      // Wait for execution to complete with cancellation
      try {
        await executionPromise;
      } catch (error) {
        // Expected to throw due to cancellation
      }

      this.addTestResult({
        passed: true,
        name: testName,
        duration: Date.now() - startTime,
        details: {
          cancellationWorking: true,
          workflowsCancelled: 1
        }
      });

      console.log('✅ Workflow cancellation test passed\n');

    } catch (error) {
      this.addTestResult({
        passed: false,
        name: testName,
        duration: Date.now() - startTime,
        error: (error as Error).message
      });
      console.log(`❌ Workflow cancellation test failed: ${(error as Error).message}\n`);
    }
  }

  private async testProgressTracking(): Promise<void> {
    const testName = 'Progress Tracking';
    const startTime = Date.now();
    
    try {
      console.log(`📊 Testing: ${testName}`);

      const workflow = createSampleWorkflow('Progress Test');
      let progressUpdates = 0;
      let lastProgress = 0;

      // Set up progress event listeners
      this.engine.on('step.started', () => progressUpdates++);
      this.engine.on('step.completed', () => progressUpdates++);
      this.engine.on('workflow.progress', (event) => {
        lastProgress = event.progress;
      });

      const context = await this.engine.executeWorkflow(workflow, {
        OPENAI_API_KEY: 'mock-key'
      });

      if (context.status !== 'completed') {
        throw new Error(`Progress tracking workflow failed: ${context.status}`);
      }

      if (progressUpdates === 0) {
        throw new Error('No progress updates were received');
      }

      this.addTestResult({
        passed: true,
        name: testName,
        duration: Date.now() - startTime,
        details: {
          progressUpdatesReceived: progressUpdates,
          finalProgress: lastProgress,
          progressTrackingWorking: true
        }
      });

      console.log('✅ Progress tracking test passed');
      console.log(`  → Progress updates received: ${progressUpdates}\n`);

    } catch (error) {
      this.addTestResult({
        passed: false,
        name: testName,
        duration: Date.now() - startTime,
        error: (error as Error).message
      });
      console.log(`❌ Progress tracking test failed: ${(error as Error).message}\n`);
    }
  }

  private validateStepOutputs(context: WorkflowExecutionContext): void {
    // Validate script generation outputs
    const scriptResult = context.stepResults['generate-script'];
    if (!scriptResult?.outputs?.script) {
      throw new Error('Script generation did not produce script output');
    }

    // Validate video creation outputs
    const videoResult = context.stepResults['create-video'];
    if (!videoResult?.outputs?.videoUrl) {
      throw new Error('Video creation did not produce video URL');
    }

    // Validate voice synthesis outputs
    const voiceResult = context.stepResults['synthesize-voice'];
    if (!voiceResult?.outputs?.audioUrl) {
      throw new Error('Voice synthesis did not produce audio URL');
    }

    // Validate storage outputs
    const storageResult = context.stepResults['store-video'];
    if (!storageResult?.outputs?.driveUrl) {
      throw new Error('Storage did not produce drive URL');
    }
  }

  private addTestResult(result: TestResult): void {
    this.testResults.push(result);
  }

  private generateTestReport(): void {
    const totalDuration = Date.now() - this.startTime;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = this.testResults.length - passedTests;

    console.log('\n' + '='.repeat(60));
    console.log('🧪 END-TO-END TEST SUITE RESULTS');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${this.testResults.length}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`⏱️ Total Duration: ${totalDuration}ms`);
    console.log(`📊 Success Rate: ${((passedTests / this.testResults.length) * 100).toFixed(1)}%`);

    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`  • ${r.name}: ${r.error}`);
        });
    }

    console.log('\n✅ Passed Tests:');
    this.testResults
      .filter(r => r.passed)
      .forEach(r => {
        console.log(`  • ${r.name} (${r.duration}ms)`);
      });

    console.log('\n' + '='.repeat(60));
    
    if (failedTests === 0) {
      console.log('🎉 ALL TESTS PASSED! The complete idea-to-video pipeline is working correctly.');
    } else {
      console.log('⚠️ Some tests failed. Please check the errors above.');
      throw new Error(`${failedTests} tests failed`);
    }
  }
}

// Export for programmatic use
export { E2EWorkflowTester };

// Main execution function
export async function runE2ETests(): Promise<void> {
  const tester = new E2EWorkflowTester();
  await tester.runAllTests();
}

// Run tests if this file is executed directly
if (require.main === module) {
  runE2ETests()
    .then(() => {
      console.log('\n🎉 E2E Test Suite completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 E2E Test Suite failed:', error.message);
      process.exit(1);
    });
} 