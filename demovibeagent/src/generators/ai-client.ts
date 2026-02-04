/**
 * AI SDK Client for Config Generation
 *
 * Uses Vercel AI SDK with configurable providers for easy switching.
 * Supports streaming and structured output generation.
 */

import { streamText, Output } from 'ai';
import { xai } from '@ai-sdk/xai';
import { anthropic } from '@ai-sdk/anthropic';
// Easy to add other providers:
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
 * Check if error is a non-fatal XAI reasoning error that should be ignored
 */
function isIgnorableReasoningError(error: Error): boolean {
  const errorMsg = error.message.toLowerCase();
  return errorMsg.includes('reasoning part') && errorMsg.includes('not found');
}

/**
 * Retry wrapper for handling transient API errors
 *
 * Retries up to maxAttempts times with exponential backoff.
 * Useful for handling intermittent XAI API errors.
 * Ignores non-fatal "reasoning part not found" errors.
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  operationName: string = 'operation'
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Ignore non-fatal reasoning errors (XAI sometimes doesn't provide reasoning content)
      if (isIgnorableReasoningError(lastError)) {
        logger.warn(`Ignoring non-fatal XAI reasoning error: ${lastError.message}`);
        // Don't retry, just skip this iteration and let it fail naturally
        // The actual generation might still succeed
        if (attempt < maxAttempts) {
          const delay = 500; // Short delay for ignorable errors
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }

      if (attempt < maxAttempts) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Max 5s delay
        logger.warn(`${operationName} failed (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms...`, {
          error: lastError.message
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // If last error was ignorable reasoning error, throw a more specific message
  if (lastError && isIgnorableReasoningError(lastError)) {
    throw new Error(`${operationName} failed: XAI reasoning not available. Try setting AI_PROVIDER=anthropic or using a different model.`);
  }

  throw new Error(`${operationName} failed after ${maxAttempts} attempts: ${lastError?.message}`);
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
    case 'anthropic':
      return anthropic(modelName);
    // Easy to add:
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
    case 'anthropic':
      return anthropic(modelName);
    // Easy to add:
    // case 'openai': return openai(modelName);
    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}

/**
 * Generate structured config using streamText with Output.object() for XAI compatibility
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
    // Wrap the generation in retry logic to handle transient API errors
    const result = await retryWithBackoff(async () => {
      // Use streamText with Output.object() for structured generation
      // Handle schema and app types separately for proper TypeScript typing
      if (options.type === 'schema') {
        const { partialOutputStream } = streamText({
          model,
          messages: [
            { role: 'system', content: options.systemPrompt },
            { role: 'user', content: options.userPrompt }
          ],
          output: Output.object({
            schema: databaseConfigSchema,
          }),
          temperature: options.temperature ?? 0.1,
        });

        // Iterate through the stream to get the final object
        // Handle reasoning errors gracefully (XAI doesn't always provide reasoning)
        let finalObject: any = null;
        try {
          for await (const partialObject of partialOutputStream) {
            finalObject = partialObject;
          }
        } catch (streamError) {
          const error = streamError instanceof Error ? streamError : new Error(String(streamError));

          // If it's a reasoning error and we have a partial result, use it
          if (isIgnorableReasoningError(error) && finalObject) {
            logger.warn('Ignoring reasoning error, using partial result', { error: error.message });
          } else {
            throw streamError;
          }
        }

        if (!finalObject) {
          throw new Error('No object generated from stream');
        }

        return finalObject;
      } else {
        // app type
        const { partialOutputStream } = streamText({
          model,
          messages: [
            { role: 'system', content: options.systemPrompt },
            { role: 'user', content: options.userPrompt }
          ],
          output: Output.object({
            schema: appConfigSchema,
          }),
          temperature: options.temperature ?? 0.1,
        });

        // Iterate through the stream to get the final object
        // Handle reasoning errors gracefully (XAI doesn't always provide reasoning)
        let finalObject: any = null;
        try {
          for await (const partialObject of partialOutputStream) {
            finalObject = partialObject;
          }
        } catch (streamError) {
          const error = streamError instanceof Error ? streamError : new Error(String(streamError));

          // If it's a reasoning error and we have a partial result, use it
          if (isIgnorableReasoningError(error) && finalObject) {
            logger.warn('Ignoring reasoning error, using partial result', { error: error.message });
          } else {
            throw streamError;
          }
        }

        if (!finalObject) {
          throw new Error('No object generated from stream');
        }

        return finalObject;
      }
    }, 3, `Structured ${options.type} generation`);

    logger.debug('Received structured output', {
      type: options.type,
      hasSchema: !!result?.schema
    });

    const duration = Date.now() - startTime;

    logger.info('Structured generation completed', {
      type: options.type,
      duration: `${duration}ms`
    });

    // Unwrap the schema from the wrapper object
    return result.schema || result;

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
    // Wrap the generation in retry logic to handle transient API errors
    const { fullText, usage } = await retryWithBackoff(async () => {
      try {
        // Stream as text for code generation
        const { text: textPromise, usage: usagePromise } = streamText({
          model,
          messages: [
            { role: 'system', content: options.systemPrompt },
            { role: 'user', content: options.userPrompt }
          ],
          temperature: options.temperature ?? 0.1,
        });

        // Await full text from stream (better for caching & performance)
        const fullText = await textPromise;

        // Get usage info
        const usage = await usagePromise;

        return { fullText, usage };
      } catch (streamError) {
        const error = streamError instanceof Error ? streamError : new Error(String(streamError));

        // If it's a reasoning error, log and rethrow to trigger retry
        if (isIgnorableReasoningError(error)) {
          logger.warn('XAI reasoning error during text generation', { error: error.message });
        }

        throw streamError;
      }
    }, 3, `${options.type} code generation`);

    const duration = Date.now() - startTime;

    logger.logAPICall(
      'AI SDK streamText',
      model.modelId,
      (usage as any)?.promptTokens || 0,
      (usage as any)?.completionTokens || 0,
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
  });

  // Stream text chunks
  for await (const textPart of result.textStream) {
    yield textPart;
  }
}

