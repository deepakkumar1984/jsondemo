#!/usr/bin/env tsx
/**
 * Simple test script to verify the agent works
 */

import 'dotenv/config';
import { VibeAgent } from './src/agent.js';
import * as logger from './src/utils/logger.js';

async function testAgent() {
  console.log('🧪 Testing Vibe Agent...\n');

  try {
    // Test 1: Agent initialization
    const agent = new VibeAgent();
    console.log('✅ Agent initialized successfully');

    // Test 2: All tools loaded
    const allTools = await import('./src/tools/index.js').then(m => m.allTools);
    const toolNames = Object.keys(allTools);
    console.log('✅ All tools loaded:', toolNames.join(', '));
    console.log(`   Total tools: ${toolNames.length}`);

    // Test 3: Verify expected tools exist
    const expectedTools = ['read_file', 'write_file', 'edit_file', 'glob', 'list_directory', 'get_context', 'generate_config'];
    const missingTools = expectedTools.filter(t => !toolNames.includes(t));
    if (missingTools.length > 0) {
      console.error('❌ Missing tools:', missingTools.join(', '));
      process.exit(1);
    }
    console.log('✅ All expected tools present');

    // Test 4: Check API key
    if (!process.env.XAI_API_KEY || process.env.XAI_API_KEY === 'your-xai-api-key-here') {
      console.log('\n⚠️  XAI_API_KEY not set in .env file');
      console.log('   Set a valid API key to use the agent with AI capabilities');
    } else {
      console.log('\n✅ XAI_API_KEY configured');
    }

    console.log('\n✅ All tests passed! Agent is ready to use.');
    console.log('\n📝 To run the interactive agent:');
    console.log('   npm run dev\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Agent test failed:', error instanceof Error ? error.message : error);
    console.error(error);
    process.exit(1);
  }
}

testAgent();
