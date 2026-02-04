/**
 * Config Generation Tools
 *
 * Provides AI-powered config generation using Vercel AI SDK.
 * This is the substantial implementation that ties everything together.
 *
 * CRITICAL: NO SILENT FAILURES
 * - All errors are reported honestly with details
 * - Validation failures return actual error messages
 * - File write failures are reported immediately
 */

import { tool } from 'ai';
import { z } from 'zod';
import { writeFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { buildContext } from '../../../democonfig/scripts/dsl-converters.js';
import { generateConfig, generateStructuredConfig } from '../generators/ai-client.js';
import { buildSystemPrompt, buildUserPrompt } from '../generators/prompts.js';
import { validateConfig, parseConfigResponse } from '../generators/validator.js';
import { resolveSandboxPath, getDisplayPath } from '../utils/sandbox.js';
import * as logger from '../utils/logger.js';

/**
 * Extract resource name from feature description
 *
 * Examples:
 * - "Task management system" -> "tasks"
 * - "Employee API" -> "employees"
 * - "Projects database schema" -> "projects"
 *
 * @param feature - Feature description
 * @returns Extracted resource name
 */
function extractResourceName(feature: string): string {
  // Remove common keywords
  const cleaned = feature.toLowerCase()
    .replace(/\s+(api|database|schema|page|form|detail|list|table|system|management)\s*/gi, ' ')
    .trim();

  // Split into words and get first meaningful word
  const words = cleaned.split(/\s+/).filter(w => w.length > 2);

  if (words.length === 0) {
    return 'unknown';
  }

  // Pluralize if not already plural (basic heuristic)
  let resourceName = words[0];
  if (!resourceName.endsWith('s') && !resourceName.endsWith('data')) {
    resourceName += 's';
  }

  return resourceName;
}

/**
 * Auto-generate output path based on config content and type
 *
 * @param config - Generated config (object or string)
 * @param type - Config type
 * @returns Relative path from config directory
 */
function autoGeneratePath(config: any, type: string): string {
  let configName: string;

  if (type === 'api') {
    // For API: extract from export pattern
    // Pattern: export const projectsRouter = new Hono...
    const exportMatch = config.match(/export\s+const\s+(\w+)Router/);
    configName = exportMatch ? exportMatch[1] : 'generated';
    return `api/${configName}.routes.ts`;
  }

  if (type === 'page') {
    // For page: extract from function name
    // Pattern: export default function ProjectsListPage() ...
    const funcMatch = config.match(/export\s+default\s+function\s+(\w+?)(?:Page)?\s*\(/);

    if (funcMatch) {
      const componentName = funcMatch[1];

      // Extract module and page type from patterns like:
      // - ProjectsListPage -> projects/list
      // - TaskDetailPage -> tasks/detail
      // - DashboardPage -> dashboard/index
      const pageTypes = ['List', 'Detail', 'Form', 'Create', 'Edit', 'View', 'Dashboard', 'Index'];
      let moduleName = componentName;
      let pageType = 'index';

      // Try to extract page type suffix
      for (const suffix of pageTypes) {
        if (componentName.endsWith(suffix)) {
          moduleName = componentName.slice(0, -suffix.length);
          pageType = suffix.toLowerCase();
          break;
        }
      }

      // Convert PascalCase to kebab-case
      const moduleKebab = moduleName
        .replace(/([A-Z])/g, '-$1')
        .toLowerCase()
        .replace(/^-/, '');

      return `pages/${moduleKebab}/${pageType}.tsx`;
    }

    return 'pages/generated/index.tsx';
  }

  // For JSON configs (schema, app)
  if (type === 'schema') {
    configName = config.table || 'generated';
  } else if (type === 'app') {
    // For app configs, use a default name
    return 'apps.json';
  } else {
    configName = config.name || config.resource || 'generated';
  }

  // Convert to kebab-case
  const fileName = configName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  if (type === 'schema') {
    return `schema/${fileName}.json`;
  }

  return `${fileName}.json`;
}

/**
 * Generate preview of config content
 *
 * @param config - Config content (object or string)
 * @param type - Config type
 * @returns Preview string (truncated if too long)
 */
function getPreview(config: any, type: string): string {
  if (typeof config === 'string') {
    // Code preview (first 500 chars)
    const lines = config.split('\n');
    const preview = lines.slice(0, 20).join('\n');
    return preview.length < config.length ? preview + '\n... (truncated)' : preview;
  } else {
    // JSON preview
    const json = JSON.stringify(config, null, 2);
    const lines = json.split('\n');
    const preview = lines.slice(0, 20).join('\n');
    return preview.length < json.length ? preview + '\n... (truncated)' : preview;
  }
}

/**
 * Generate Config Tool
 *
 * Generates schema/api/page/app configs using AI.
 * This is a substantial implementation that includes:
 * - Context building from existing configs
 * - AI generation with retry logic
 * - Validation with error feedback
 * - File writing with directory creation
 * - NO SILENT FAILURES
 */
export const generateConfigTool = tool({
  description: 'Generate schema/api/page/app configuration using AI. Auto-generates configs based on feature description with validation and retry logic.',
  parameters: z.object({
    type: z.enum(['schema', 'api', 'page', 'app'])
      .describe('Type of config to generate: schema (database), api (TypeScript routes), page (React components), app (navigation/routing)'),
    feature: z.string()
      .describe('Feature description (e.g., "Task management system", "Employee CRUD API")'),
    tasks: z.string().optional()
      .describe('Detailed requirements and tasks (optional but recommended for complex features)'),
    context: z.string().optional()
      .describe('Additional context or constraints (optional, auto-context is built from existing configs)'),
    output: z.string().optional()
      .describe('Output file path relative to config directory (optional, auto-generated if not provided)'),
  }),

  execute: async ({ type, feature, tasks, context: userContext, output }) => {
    try {
      logger.info(`Generating ${type} config for: ${feature}`);

      // 1. Build context from existing configs (prevents hallucination)
      const resourceName = extractResourceName(feature);
      logger.debug(`Extracted resource name: ${resourceName}`);

      const autoContext = buildContext(type, {
        resourceName,
        isRegenerate: false
      });

      // Combine auto context with user-provided context
      const fullContext = autoContext
        ? (userContext ? `${autoContext}\n\n${userContext}` : autoContext)
        : userContext;

      logger.debug(`Built context (${fullContext ? fullContext.length : 0} chars)`);

      // 2. Build prompts
      const systemPrompt = buildSystemPrompt(type);
      const userPrompt = buildUserPrompt(type, feature, tasks, fullContext);

      logger.debug(`System prompt: ${systemPrompt.length} chars`);
      logger.debug(`User prompt: ${userPrompt.length} chars`);

      // 3. Generate config with appropriate method
      let validConfig: any = null;

      // For schema/app types, use structured generation with Zod validation
      if (type === 'schema' || type === 'app') {
        logger.info('Using structured generation with Zod schema', { type });

        try {
          // Structured generation with automatic Zod validation
          validConfig = await generateStructuredConfig({
            type,
            systemPrompt,
            userPrompt,
            temperature: 0.1,
          });

          logger.info('Structured config generated successfully', { type });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error('Structured generation failed', { type, error: errorMessage });

          return {
            success: false,
            error: `Structured generation failed: ${errorMessage}`,
            type,
            feature
          };
        }
      } else {
        // For API/page types, use text generation (they're TypeScript code)
        logger.info('Using text generation for TypeScript code', { type });

        try {
          const content = await generateConfig({
            type,
            systemPrompt,
            userPrompt,
            temperature: 0.1,
          });

          logger.debug(`Received code: ${content.length} chars`);

          // Parse response (strips markdown code blocks)
          validConfig = parseConfigResponse(content, type);

          logger.info('Code generated successfully', { type });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error('Code generation failed', { type, error: errorMessage });

          return {
            success: false,
            error: `Code generation failed: ${errorMessage}`,
            type,
            feature
          };
        }
      }

      // 4. Determine output path
      const outputPath = output || autoGeneratePath(validConfig, type);
      logger.debug(`Output path: ${outputPath}`);

      // 5. Save to file (resolve within sandbox)
      const fullPath = resolveSandboxPath(outputPath);
      const displayPath = getDisplayPath(fullPath);

      logger.info(`Writing config to: ${displayPath}`);

      // Create directories if needed
      const dir = dirname(fullPath);
      await mkdir(dir, { recursive: true });

      // Write file (TypeScript/React code for api/page, JSON for schema/app)
      if (type === 'api' || type === 'page') {
        await writeFile(fullPath, validConfig, 'utf-8');
      } else {
        await writeFile(fullPath, JSON.stringify(validConfig, null, 2), 'utf-8');
      }

      logger.info(`Config saved successfully to: ${displayPath}`);

      // 6. Return success with preview
      const preview = getPreview(validConfig, type);

      const result = {
        success: true,
        path: displayPath,
        type,
        preview,
        message: `${type} config generated successfully at ${displayPath}`,
        nextSteps: getNextSteps(type, displayPath)
      };

      logger.logToolExecution('generate_config', { type, feature }, result);
      return result;

    } catch (error) {
      // NO SILENT FAILURES - return actual error
      const errorMessage = error instanceof Error ? error.message : String(error);

      const result = {
        success: false,
        error: errorMessage,
        type,
        feature
      };

      logger.error(`Failed to generate ${type} config:`, errorMessage);
      logger.logToolExecution('generate_config', { type, feature }, result);
      return result;
    }
  },
});

/**
 * Get next steps after config generation
 *
 * @param type - Config type
 * @param path - Generated file path
 * @returns Array of next steps
 */
function getNextSteps(type: string, path: string): string[] {
  const steps: string[] = [];

  if (type === 'schema') {
    steps.push(`Review the generated schema: ${path}`);
    steps.push('Run database migration: bun run db:migrate');
    steps.push('Generate API routes for this table');
  } else if (type === 'api') {
    steps.push(`Review the generated TypeScript route: ${path}`);
    steps.push('Rebuild routes index: bun run build:routes-index');
    steps.push('Restart dev server to register new routes');
    steps.push('Generate page config to display this data');
  } else if (type === 'page') {
    steps.push(`Review the generated React component: ${path}`);
    steps.push('Add route to config/apps.json navigation items');
    steps.push('Restart dev server (Vite will pick up new files)');
    steps.push('Navigate to the page in browser');
  } else if (type === 'app') {
    steps.push(`Review the generated app config: ${path}`);
    steps.push('Restart dev server to load new navigation');
  }

  return steps;
}

// Export config tools
export const configTools = {
  generate_config: generateConfigTool,
};
