/**
 * Context Retrieval Tools
 *
 * Tools for retrieving existing configs in DSL format.
 * Helps the agent understand what already exists before generating new configs.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { buildContext } from '../../../democonfig/scripts/dsl-converters.js';
import * as logger from '../utils/logger.js';

/**
 * Get existing configs in DSL format
 *
 * This tool shows existing schemas, APIs, pages, or app configs in a compact
 * DSL format that's optimized for AI context. Use this before generating new
 * configs to understand what already exists and maintain consistency.
 */
export const getContextTool = tool({
  description: 'Get existing configs in DSL format to understand what exists',
  parameters: z.object({
    type: z.enum(['schema', 'api', 'page', 'app'])
      .describe('Type of config to show context for'),
    resourceName: z.string().optional()
      .describe('Optional: specific resource name to focus on'),
  }),
  execute: async ({ type, resourceName }) => {
    try {
      logger.info(`Getting ${type} context${resourceName ? ` for ${resourceName}` : ''}`);

      const context = buildContext(type, {
        resourceName: resourceName || 'unknown',
        isRegenerate: false
      });

      logger.info(`Retrieved ${type} context (${context.length} chars)`);

      return {
        success: true,
        type,
        context,
        preview: context.substring(0, 500) + (context.length > 500 ? '...' : '')
      };
    } catch (error: any) {
      logger.error(`Failed to get ${type} context:`, error.message);

      return {
        success: false,
        error: error.message,
        type
      };
    }
  },
});
