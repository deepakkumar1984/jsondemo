/**
 * AI SDK Client for Config Generation
 *
 * Uses Vercel AI SDK with configurable providers for easy switching.
 * Supports streaming and structured output generation.
 */

import { streamText, streamObject } from 'ai';
import { xai } from '@ai-sdk/xai';
// Easy to add other providers:
// import { anthropic } from '@ai-sdk/anthropic';
// import { openai } from '@ai-sdk/openai';
import * as logger from '../utils/logger.js';
import { appConfigSchema, databaseConfigSchema } from '../config/zod-formats.js';

interface GenerateConfigOptions {
  type: 'schema' | 'api' | 'page' | 'app';
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
}

interface GenerateStructuredOptions {
  type: 'schema' | 'app';
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
}

/**
 * Get the configured model for config generation
 * Makes it easy to switch providers
 */
function getConfigModel() {
  const provider = process.env.AI_PROVIDER || 'xai';
  const modelName = process.env.CONFIG_GEN_MODEL || 'grok-code-fast-1';

  switch (provider) {
    case 'xai':
      return xai(modelName);
    // Easy to add:
    // case 'anthropic': return anthropic(modelName);
    // case 'openai': return openai(modelName);
    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}

/**
 * Get the model for agent interactions (supports tool calling)
 */
export function getAgentModel() {
  const provider = process.env.AI_PROVIDER || 'xai';
  const modelName = process.env.AI_MODEL || 'grok-beta';

  switch (provider) {
    case 'xai':
      return xai(modelName);
    // Easy to add:
    // case 'anthropic': return anthropic(modelName);
    // case 'openai': return openai(modelName);
    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}

/**
 * Generate structured config using streamObject for schema/app types
 *
 * This uses Zod schemas for type-safe structured output with automatic validation
 */
export async function generateStructuredConfig(options: GenerateStructuredOptions): Promise<any> {
  const model = getConfigModel();

  logger.debug('Generating structured config with AI SDK', {
    type: options.type,
    model: model.modelId,
    promptLength: options.systemPrompt.length + options.userPrompt.length
  });

  const startTime = Date.now();

  try {
    // Use streamObject for structured generation
    // Handle each type separately for proper type inference
    const result = options.type === 'schema'
      ? streamObject({
          model,
          system: options.systemPrompt,
          prompt: options.userPrompt,
          schema: databaseConfigSchema,
          temperature: options.temperature ?? 0.1,
        })
      : streamObject({
          model,
          system: options.systemPrompt,
          prompt: options.userPrompt,
          schema: appConfigSchema,
          temperature: options.temperature ?? 0.1,
        });

    // Wait for the complete object
    const finalObject = await result.object;

    // Get usage info
    const usage = await result.usage;
    const duration = Date.now() - startTime;

    logger.logAPICall(
      'AI SDK streamObject',
      model.modelId,
      usage?.promptTokens || 0,
      usage?.completionTokens || 0,
      duration
    );

    return finalObject;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Structured config generation failed', { error: errorMessage, type: options.type });
    throw new Error(`Failed to generate ${options.type} config: ${errorMessage}`);
  }
}

/**
 * Generate config as text (for api/page types which are TypeScript code)
 *
 * Uses streamText for better performance, caching, and lower cost
 *
 * @param options - Generation options
 * @returns Generated content as string
 * @throws Error if generation fails
 */
export async function generateConfig(options: GenerateConfigOptions): Promise<string> {
  const model = getConfigModel();

  logger.debug('Generating config with AI SDK (streaming)', {
    type: options.type,
    model: model.modelId,
    promptLength: options.systemPrompt.length + options.userPrompt.length
  });

  const startTime = Date.now();

  try {
    // Stream as text for code generation
    const { text: textPromise, usage: usagePromise } = streamText({
      model,
      messages: [
        { role: 'system', content: options.systemPrompt },
        { role: 'user', content: options.userPrompt }
      ],
      temperature: options.temperature ?? 0.1,
      maxTokens: 128000
    });

    // Await full text from stream (better for caching & performance)
    const fullText = await textPromise;

    // Get usage info
    const usage = await usagePromise;
    const duration = Date.now() - startTime;

    logger.logAPICall(
      'AI SDK streamText',
      model.modelId,
      usage?.promptTokens || 0,
      usage?.completionTokens || 0,
      duration
    );

    return fullText;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Config generation failed', { error: errorMessage, type: options.type });
    throw new Error(`Failed to generate ${options.type} config: ${errorMessage}`);
  }
}

/**
 * Stream text generation (for interactive use)
 *
 * @param systemPrompt - System prompt
 * @param userPrompt - User prompt
 * @returns Async generator yielding text chunks
 */
export async function* streamGenerate(
  systemPrompt: string,
  userPrompt: string
): AsyncGenerator<string> {
  const model = getConfigModel();

  logger.debug('Streaming generation', {
    model: model.modelId,
    promptLength: systemPrompt.length + userPrompt.length
  });

  const result = streamText({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.1,
    maxTokens: 128000
  });

  // Stream text chunks
  for await (const textPart of result.textStream) {
    yield textPart;
  }
}

