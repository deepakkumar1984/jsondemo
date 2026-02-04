/**
 * Vibe Agent Core
 *
 * Uses Vercel AI SDK with streaming for tool calling and chat.
 * Properly handles fullStream chunks including text and tool calls.
 */

import { streamText, CoreMessage } from 'ai';
import { getAgentModel } from './generators/ai-client.js';
import { buildAgentSystemPrompt } from './config/prompts.js';
import { allTools } from './tools/index.js';
import * as logger from './utils/logger.js';

/**
 * Check if error is a non-fatal XAI reasoning error that should be ignored
 */
function isIgnorableReasoningError(errorMsg: string): boolean {
  const msg = errorMsg.toLowerCase();
  return msg.includes('reasoning part') && msg.includes('not found');
}

export interface StreamChunk {
  type: 'text' | 'tool-call' | 'tool-result' | 'error';
  content?: string;
  toolName?: string;
  toolArgs?: any;
  toolResult?: any;
  error?: string;
}

export class VibeAgent {
  private conversationHistory: CoreMessage[] = [];

  /**
   * Chat with streaming - yields chunks for UI display
   *
   * @param userMessage - User's message
   * @returns Async generator yielding stream chunks
   */
  async *chat(userMessage: string): AsyncGenerator<StreamChunk> {
    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: userMessage
    });

    try {
      const model = getAgentModel();

      logger.debug('Starting agent chat stream', {
        messageCount: this.conversationHistory.length,
        model: model.modelId
      });

      // Stream with tools (AI SDK automatically handles tool calling loop)
      // CRITICAL: The loop stops when model generates "finish reasoning" instead of tool calls
      // We FORCE tool calling at every step using toolChoice: 'required'
      const result = streamText({
        model,
        messages: [
          { role: 'system', content: buildAgentSystemPrompt() },
          ...this.conversationHistory
        ],
        tools: allTools,
        toolChoice: 'required', // FORCE model to call tools (prevents premature finish)
        stopWhen: ({ steps }) => {
          // Stop when complete_task is called or after 10 steps
          if (steps.length >= 10) return true;

          const lastStep = steps[steps.length - 1];
          if (lastStep?.toolCalls) {
            return lastStep.toolCalls.some((tc: any) => tc.toolName === 'complete_task');
          }
          return false;
        },
        temperature: 0.1,
        onError: ({ error }: { error: unknown }) => {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error('Stream error', { error: errorMessage });
        }
      });

      let fullAssistantText = '';

      // Stream all chunks (text + tool calls + tool results)
      for await (const chunk of result.fullStream) {
        switch (chunk.type) {
          case 'text-delta':
            // Text chunk from model
            fullAssistantText += chunk.textDelta;
            yield {
              type: 'text',
              content: chunk.textDelta
            };
            break;

          case 'tool-call':
            // Model is calling a tool
            logger.debug('Tool call', {
              toolName: chunk.toolName,
              args: chunk.args
            });

            yield {
              type: 'tool-call',
              toolName: chunk.toolName,
              toolArgs: chunk.args
            };
            break;

          case 'tool-result':
            // Tool execution completed
            logger.debug('Tool result', {
              toolName: chunk.toolName,
              result: (chunk as any).result
            });

            yield {
              type: 'tool-result',
              toolName: chunk.toolName,
              toolResult: (chunk as any).result
            };
            break;

          case 'error':
            // Error occurred
            const errorMsg = String(chunk.error);

            // Ignore non-fatal XAI reasoning errors
            if (isIgnorableReasoningError(errorMsg)) {
              logger.warn('Ignoring non-fatal XAI reasoning error', { error: errorMsg });
              break;
            }

            logger.error('Stream chunk error', { error: errorMsg });

            yield {
              type: 'error',
              error: errorMsg
            };
            break;
        }
      }

      // Save assistant response to history (text only)
      // Note: AI SDK handles multi-step tool calling automatically within a single streamText call
      // Tool calls and results don't need to be manually preserved - they're managed by the SDK
      let toolCalls: any[] = [];
      let toolResults: any[] = [];

      try {
        toolCalls = await result.toolCalls;
        toolResults = await result.toolResults;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);

        // Ignore non-fatal XAI reasoning errors when fetching results
        if (isIgnorableReasoningError(errorMsg)) {
          logger.warn('Ignoring reasoning error when fetching tool results', { error: errorMsg });
        } else {
          // Re-throw if it's not an ignorable error
          throw error;
        }
      }

      // Just save text response for conversation continuity across tasks
      if (fullAssistantText || toolCalls.length > 0) {
        let summaryText = fullAssistantText;

        // If there were tool calls but no text, summarize what happened
        if (toolCalls.length > 0 && !fullAssistantText) {
          const toolNames = toolCalls.map((tc: any) => tc.toolName).join(', ');
          summaryText = `[Used tools: ${toolNames}]`;
        }

        this.conversationHistory.push({
          role: 'assistant',
          content: summaryText
        });

        if (toolCalls.length > 0) {
          logger.debug('Tool interactions completed', {
            toolCallsCount: toolCalls.length,
            toolResultsCount: toolResults.length
          });
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Ignore non-fatal XAI reasoning errors
      if (isIgnorableReasoningError(errorMessage)) {
        logger.warn('Ignoring reasoning error in main catch', { error: errorMessage });
        return; // Exit gracefully without yielding error
      }

      logger.error('Agent chat error', { error: errorMessage });

      yield {
        type: 'error',
        error: errorMessage
      };
    }
  }

  /**
   * Reset conversation history
   */
  resetConversation(): void {
    this.conversationHistory = [];
    logger.info('Conversation reset');
  }

  /**
   * Get conversation history
   */
  getHistory(): CoreMessage[] {
    return this.conversationHistory;
  }
}
