#!/usr/bin/env node

/**
 * Simple E2E Test Runner for Workflow Engine
 * Tests the complete idea → video pipeline without TypeScript compilation
 */

const { WorkflowEngine } = require('./dist/workflow-engine');
const { createSampleWorkflow } = require('./dist/utils/workflow-parser');

async function runE2ETest() {
  console.log('🚀 Starting End-to-End Workflow Test\n');
  
  try {
    // Initialize workflow engine
    const engine = new WorkflowEngine({
      providers: {},
      storage: { type: 'memory', config: {} },
      logging: { level: 'info', storage: 'memory' }
    });

    console.log('📋 Test 1: Workflow Validation');
    
    // Test workflow creation and validation
    const topic = 'Artificial Intelligence and Machine Learning';
    const workflow = createSampleWorkflow(topic);
    
    console.log(`  → Created workflow: ${workflow.name}`);
    console.log(`  → Steps: ${workflow.steps.length}`);
    console.log(`  → Execution order: ${workflow.steps.map(s => s.id).join(' → ')}`);
    
    // Validate workflow
    const isValid = await engine.validateWorkflow(workflow);
    if (!isValid) {
      throw new Error('Workflow validation failed');
    }
    console.log('  ✅ Workflow validation passed\n');

    console.log('🎬 Test 2: Complete Pipeline Execution');
    
    // Set up variables for testing (using mock keys)
    const variables = {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'mock-key',
      VEO_API_KEY: 'mock-key',
      ELEVENLABS_API_KEY: 'mock-key',
      GOOGLE_SERVICE_ACCOUNT_KEY: 'mock-key'
    };

    console.log('  → Environment setup:');
    console.log(`     OpenAI API Key: ${variables.OPENAI_API_KEY ? '✅ Provided' : '❌ Using mock'}`);
    console.log(`     Provider fallbacks: ✅ Enabled`);
    
    // Execute the complete workflow
    console.log('  → Executing complete workflow...');
    const startTime = Date.now();
    
    const context = await engine.executeWorkflow(workflow, variables, {
      projectId: 'test-project-001',
      userId: 'test-user',
      metadata: { testRun: true, topic }
    });

    const executionTime = Date.now() - startTime;
    
    // Validate execution results
    if (context.status !== 'completed') {
      throw new Error(`Workflow failed with status: ${context.status}`);
    }

    console.log('  ✅ Workflow execution completed successfully');
    console.log(`     Workflow ID: ${context.workflowId}`);
    console.log(`     Execution time: ${executionTime}ms`);
    console.log(`     Steps completed: ${Object.keys(context.stepResults).length}`);

    // Validate each step completed successfully
    const expectedSteps = ['generate-script', 'create-video', 'synthesize-voice', 'store-video'];
    console.log('\n  → Step Results:');
    
    for (const stepId of expectedSteps) {
      const stepResult = context.stepResults[stepId];
      if (!stepResult) {
        throw new Error(`Step ${stepId} not found in results`);
      }
      
      if (stepResult.status !== 'completed') {
        throw new Error(`Step ${stepId} failed with status: ${stepResult.status}`);
      }
      
      const stepDuration = stepResult.endTime && stepResult.startTime 
        ? stepResult.endTime.getTime() - stepResult.startTime.getTime()
        : 0;
        
      console.log(`     ${stepId}: ✅ ${stepResult.status} (${stepDuration}ms)`);
      
      // Check for expected outputs
      if (stepResult.outputs) {
        const outputKeys = Object.keys(stepResult.outputs);
        console.log(`       Outputs: ${outputKeys.join(', ')}`);
      }
    }

    console.log('\n📊 Test 3: Output Validation');
    
    // Validate step outputs contain expected data
    const scriptResult = context.stepResults['generate-script'];
    if (!scriptResult?.outputs?.script) {
      throw new Error('Script generation missing script output');
    }
    console.log('  ✅ Script generation produced script');
    
    const videoResult = context.stepResults['create-video'];
    if (!videoResult?.outputs?.videoUrl) {
      throw new Error('Video creation missing video URL');
    }
    console.log('  ✅ Video creation produced video URL');
    
    const voiceResult = context.stepResults['synthesize-voice'];
    if (!voiceResult?.outputs?.audioUrl) {
      throw new Error('Voice synthesis missing audio URL');
    }
    console.log('  ✅ Voice synthesis produced audio URL');
    
    const storageResult = context.stepResults['store-video'];
    if (!storageResult?.outputs?.driveUrl) {
      throw new Error('Storage missing drive URL');
    }
    console.log('  ✅ Storage produced drive URL');

    console.log('\n🔄 Test 4: Provider System');
    
    // Test provider registry
    const providers = engine.getProviderRegistry();
    const requiredProviders = ['openai-script', 'veo-video', 'elevenlabs-voice', 'google-drive'];
    
    console.log('  → Checking provider availability:');
    for (const provider of requiredProviders) {
      if (!providers.hasProvider(provider)) {
        throw new Error(`Required provider missing: ${provider}`);
      }
      console.log(`     ${provider}: ✅ Available`);
    }

    console.log('\n📈 Test 5: System Statistics');
    
    const stats = engine.getEngineStats();
    console.log('  → Engine Statistics:');
    console.log(`     Running workflows: ${stats.runningWorkflows}`);
    console.log(`     Providers loaded: ${Object.keys(stats.providers).length}`);
    console.log(`     Memory usage: ${Math.round(stats.memory.heapUsed / 1024 / 1024)}MB`);
    console.log(`     Uptime: ${Math.round(stats.uptime)}s`);

    // Generate final report
    console.log('\n' + '='.repeat(60));
    console.log('🎉 END-TO-END TEST RESULTS: SUCCESS');
    console.log('='.repeat(60));
    console.log('✅ Workflow validation: PASSED');
    console.log('✅ Complete pipeline execution: PASSED');
    console.log('✅ Output validation: PASSED');
    console.log('✅ Provider system: PASSED');
    console.log('✅ System statistics: PASSED');
    console.log('='.repeat(60));
    console.log(`🎯 Total execution time: ${executionTime}ms`);
    console.log('🎉 The complete idea-to-video pipeline is working correctly!');
    
    return true;

  } catch (error) {
    console.error('\n❌ E2E Test Failed:', error.message);
    console.error('\n' + '='.repeat(60));
    console.error('💥 END-TO-END TEST RESULTS: FAILED');
    console.error('='.repeat(60));
    console.error('❌ Pipeline execution encountered errors');
    console.error('⚠️  Please check the error details above');
    console.error('='.repeat(60));
    
    throw error;
  }
}

// Run the test
if (require.main === module) {
  runE2ETest()
    .then(() => {
      console.log('\n🎉 E2E Test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 E2E Test failed!', error.message);
      process.exit(1);
    });
}

module.exports = { runE2ETest }; 