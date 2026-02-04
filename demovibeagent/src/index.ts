#!/usr/bin/env node
/**
 * Vibe Agent REPL
 *
 * Interactive command-line interface with streaming support.
 * Displays text chunks and tool calls in real-time.
 */

import 'dotenv/config';
import * as readline from 'readline/promises';
import { VibeAgent, StreamChunk } from './agent.js';
import * as logger from './utils/logger.js';
import { getConfigRoot } from './utils/sandbox.js';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

/**
 * Format tool call for display
 */
function formatToolCall(toolName: string, args: any): string {
  const argsStr = JSON.stringify(args, null, 2)
    .split('\n')
    .map((line, i) => i === 0 ? line : '  ' + line)
    .join('\n');

  return `${colors.yellow}🔧 Tool: ${colors.bright}${toolName}${colors.reset}\n${colors.dim}${argsStr}${colors.reset}`;
}

/**
 * Format tool result for display
 */
function formatToolResult(toolName: string, result: any): string {
  let resultStr = '';

  if (typeof result === 'object' && result !== null) {
    // Check if it's an error result
    if (result.success === false) {
      resultStr = `${colors.red}✗ Error: ${result.error || 'Unknown error'}${colors.reset}`;
    } else if (result.success === true) {
      resultStr = `${colors.green}✓ Success${colors.reset}`;
      if (result.message) {
        resultStr += `: ${result.message}`;
      }
      if (result.preview) {
        resultStr += `\n${colors.dim}${result.preview}${colors.reset}`;
      }
    } else {
      // Generic object result
      resultStr = JSON.stringify(result, null, 2);
    }
  } else {
    resultStr = String(result);
  }

  return `${colors.green}✓ ${toolName} completed${colors.reset}\n${colors.dim}${resultStr}${colors.reset}`;
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
${colors.bright}${colors.cyan}Vibe Agent - Config Development Assistant${colors.reset}

${colors.bright}Commands:${colors.reset}
  ${colors.green}exit${colors.reset}     - Quit the agent
  ${colors.green}reset${colors.reset}    - Clear conversation history
  ${colors.green}help${colors.reset}     - Show this help message

${colors.bright}Available Operations:${colors.reset}
  • Read, write, and edit files in the config directory
  • Generate schemas, APIs, pages, and app configs using AI
  • Search files with glob patterns
  • List directory contents
  • View existing configs in DSL format

${colors.bright}Example Prompts:${colors.reset}
  ${colors.dim}"Show me all the API route files"
  "Generate a schema for task management"
  "Read the expenses.routes.ts file"
  "Create a new page for viewing expense analytics"
  "Edit the budgets schema to add a status field"${colors.reset}

${colors.bright}Workspace:${colors.reset}
  ${colors.dim}${getConfigRoot()}${colors.reset}
`);
}

/**
 * Print welcome banner
 */
function printWelcome(): void {
  console.log(`
${colors.bright}${colors.cyan}╔═══════════════════════════════════════════╗
║   Vibe Agent - Config Development Tool   ║
╚═══════════════════════════════════════════╝${colors.reset}

${colors.dim}Working directory: ${getConfigRoot()}
Type "help" for available commands${colors.reset}
`);
}

/**
 * Main REPL loop
 */
async function main(): Promise<void> {
  // Load environment variables
  if (!process.env.XAI_API_KEY) {
    console.error(`${colors.red}Error: XAI_API_KEY environment variable not set${colors.reset}`);
    console.error(`${colors.dim}Create a .env file with your XAI API key${colors.reset}`);
    process.exit(1);
  }

  printWelcome();

  const agent = new VibeAgent();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  while (true) {
    try {
      const input = await rl.question(`\n${colors.bright}${colors.blue}You:${colors.reset} `);
      const trimmedInput = input.trim();

      // Handle commands
      if (trimmedInput === 'exit') {
        console.log(`\n${colors.dim}Goodbye!${colors.reset}\n`);
        rl.close();
        break; // Exit the loop instead of process.exit
      }

      if (trimmedInput === 'reset') {
        agent.resetConversation();
        console.log(`\n${colors.green}✓ Conversation reset${colors.reset}`);
        continue;
      }

      if (trimmedInput === 'help') {
        printHelp();
        continue;
      }

      if (!trimmedInput) {
        continue;
      }

      // Stream agent response
      process.stdout.write(`\n${colors.bright}${colors.magenta}Agent:${colors.reset} `);

      let hasOutput = false;

      for await (const chunk of agent.chat(trimmedInput)) {
        hasOutput = true;

        switch (chunk.type) {
          case 'text':
            // Stream text directly
            if (chunk.content) {
              process.stdout.write(chunk.content);
            }
            break;

          case 'tool-call':
            // Show tool being called
            if (chunk.toolName && chunk.toolArgs) {
              process.stdout.write(`\n\n${formatToolCall(chunk.toolName, chunk.toolArgs)}\n`);
            }
            break;

          case 'tool-result':
            // Show tool result
            if (chunk.toolName && chunk.toolResult) {
              process.stdout.write(`\n${formatToolResult(chunk.toolName, chunk.toolResult)}\n\n`);
            }
            break;

          case 'error':
            // Show error
            process.stdout.write(`\n\n${colors.red}Error: ${chunk.error}${colors.reset}\n`);
            break;
        }
      }

      if (!hasOutput) {
        process.stdout.write(`${colors.dim}(no response)${colors.reset}`);
      }

      process.stdout.write('\n');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // If readline was closed (user exiting), break the loop
      if (errorMessage.includes('readline was closed')) {
        break;
      }

      logger.error('REPL error', { error: errorMessage });
      console.error(`\n${colors.red}Error: ${errorMessage}${colors.reset}`);
    }
  }

  // Clean exit
  process.exit(0);
}

// Run the REPL
main().catch((error) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
