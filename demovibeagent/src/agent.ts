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

      // Stream with tools
      const result = streamText({
        model,
        messages: [
          { role: 'system', content: buildAgentSystemPrompt() },
          ...this.conversationHistory
        ],
        tools: allTools,
        maxSteps: 10, // Allow multi-step tool calling
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
              result: chunk.result
            });

            yield {
              type: 'tool-result',
              toolName: chunk.toolName,
              toolResult: chunk.result
            };
            break;

          case 'error':
            // Error occurred
            logger.error('Stream chunk error', { error: chunk.error });

            yield {
              type: 'error',
              error: String(chunk.error)
            };
            break;
        }
      }

      // Add assistant response to history
      if (fullAssistantText) {
        this.conversationHistory.push({
          role: 'assistant',
          content: fullAssistantText
        });
      }

      // Also save tool calls/results to history if needed
      const toolCalls = await result.toolCalls;
      const toolResults = await result.toolResults;

      if (toolCalls.length > 0) {
        logger.debug('Stream completed', {
          toolCallsCount: toolCalls.length,
          toolResultsCount: toolResults.length
        });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
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
