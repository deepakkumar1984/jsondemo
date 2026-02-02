#!/usr/bin/env tsx
/**
 * AI Config Generator
 *
 * Uses Cloudflare AI Gateway to generate configuration files for:
 * - Database schemas (config/schema/*.json)
 * - API operations (config/api/*.json)
 * - UI pages (config/pages/*.json)
 * - App configuration (config/apps.json)
 *
 * Supports multiple AI providers via Cloudflare Gateway:
 * - Anthropic Claude
 * - OpenAI GPT
 * - Google Gemini
 *
 * The AI uses JSON schema response_format to ensure valid output.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { buildContext } from './dsl-converters';
import Ajv from 'ajv';
import {
  COMPREHENSIVE_SCHEMA_EXAMPLES,
  COMPREHENSIVE_API_EXAMPLES,
  COMPREHENSIVE_PAGE_EXAMPLES,
  COMPREHENSIVE_APPS_EXAMPLES,
  VALID_ACTION_TYPES,
  VALID_COMPONENT_TYPES,
  SPECIAL_FUNCTIONS,
  TEMPLATE_PATTERNS
} from './comprehensive-examples';

/**
 * Load environment variables from .env file
 */
function loadEnvFile() {
  const envPath = join(process.cwd(), '.env');

  if (!existsSync(envPath)) {
    return;
  }

  try {
    const envContent = readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');

    for (const line of lines) {
      // Skip empty lines and comments
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      // Parse KEY=VALUE format
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();

        // Remove surrounding quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        // ALWAYS override with .env file value (fix for stale env vars)
        process.env[key] = value;
      }
    }
  } catch (error) {
    console.warn('Warning: Failed to load .env file:', error);
  }
}

// Load .env file at startup
loadEnvFile();

interface GenerateOptions {
  type: 'schema' | 'api' | 'page' | 'app';
  feature: string;
  tasks?: string;
  output?: string;
  apiKey?: string;
  model?: string;
  context?: string;
  debug?: boolean;
  skipValidation?: boolean;
}

interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIRequest {
  model: string;
  messages: AIMessage[];
  response_format?: {
    type: 'json_schema' | 'json_object';
    json_schema?: {
      name: string;
      strict: boolean;
      schema: any;
    };
  };
  temperature?: number;
  max_tokens?: number;
}

interface AIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    reasoning_tokens?: number; // Azure reasoning tokens
    audio_prompt_tokens?: number; // Azure audio tokens
    prompt_tokens_details?: any; // Azure token details
    completion_tokens_details?: any; // Azure token details
  };
}

/**
 * Load JSON schema format for the specified config type
 */
function loadFormatSchema(type: string): any {
  const schemaPath = join(process.cwd(), 'config', `${type}-format.json`);

  if (!existsSync(schemaPath)) {
    throw new Error(`Format schema not found: ${schemaPath}`);
  }

  const content = readFileSync(schemaPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Build system prompt based on config type with comprehensive examples
 */
function buildSystemPrompt(type: string): string {
  const basePrompt = `You are an expert software engineer specializing in config-driven application development.
Your task is to generate high-quality, production-ready configuration files based on user requirements.

CRITICAL RULES:
1. You MUST ONLY use properties, action types, component types, and functions shown in the examples below
2. Do NOT invent new action types, component types, or properties that are not in the examples
3. Follow the EXACT structure and patterns shown in the examples
4. Use snake_case for database table/column names
5. Use camelCase for JavaScript identifiers (API operation IDs, variable names)
6. Use kebab-case for file names and paths
7. Include proper descriptions for documentation
8. Think about data relationships and foreign keys
9. Include appropriate indexes for performance
10. Follow REST API best practices

OUTPUT REQUIREMENTS:
- Return ONLY valid JSON that matches the examples
- Do NOT add markdown code fences
- Do NOT add explanatory text before or after the JSON
- Do NOT use properties not shown in the examples`;

  // Get examples based on type
  const examples = getExamplesForType(type);

  let examplesSection = '\n\n=== COMPREHENSIVE EXAMPLES ===\n\n';
  examplesSection += 'Study these examples carefully. They show ALL valid properties and patterns.\n';
  examplesSection += 'You MUST follow these patterns exactly.\n\n';

  for (let i = 0; i < examples.length; i++) {
    const example = examples[i];
    examplesSection += `--- Example ${i + 1}: ${example.description} ---\n\n`;
    examplesSection += JSON.stringify(example.config, null, 2);
    examplesSection += '\n\n';
  }

  // Add valid types reference
  if (type === 'api') {
    examplesSection += '\n=== VALID ACTION TYPES ===\n';
    examplesSection += 'You MUST ONLY use these action types:\n';
    examplesSection += JSON.stringify(Array.from(VALID_ACTION_TYPES), null, 2);
    examplesSection += '\n\n=== SPECIAL FUNCTIONS ===\n';
    examplesSection += JSON.stringify(SPECIAL_FUNCTIONS, null, 2);
    examplesSection += '\n\n=== TEMPLATE PATTERNS ===\n';
    examplesSection += JSON.stringify(TEMPLATE_PATTERNS, null, 2);
    examplesSection += '\n';
  }

  if (type === 'page') {
    examplesSection += '\n=== VALID COMPONENT TYPES ===\n';
    examplesSection += 'You MUST ONLY use these component types:\n';
    examplesSection += JSON.stringify(Array.from(VALID_COMPONENT_TYPES), null, 2);
    examplesSection += '\n';
  }

  return basePrompt + examplesSection;
}

/**
 * Get comprehensive examples for a given config type
 */
function getExamplesForType(type: string): Array<{ description: string; config: any }> {
  switch (type) {
    case 'schema':
      return COMPREHENSIVE_SCHEMA_EXAMPLES;
    case 'api':
      return COMPREHENSIVE_API_EXAMPLES;
    case 'page':
      return COMPREHENSIVE_PAGE_EXAMPLES;
    case 'app':
      return COMPREHENSIVE_APPS_EXAMPLES;
    default:
      return [];
  }
}

/**
 * Build user prompt based on feature and task details
 */
function buildUserPrompt(type: string, feature: string, tasks?: string, context?: string): string {
  let prompt = `Generate a ${type} configuration for the following feature:\n\n`;
  prompt += `Feature: ${feature}\n`;

  if (tasks) {
    prompt += `\nTasks/Requirements:\n${tasks}\n`;
  }

  if (context) {
    prompt += `\n${context}\n`;
    prompt += `\nIMPORTANT: Use the existing schemas/APIs/pages shown above. Do NOT create fictional table names, API endpoints, or page references. Only reference what exists in the context provided.\n`;
  }

  // Add type-specific guidance
  if (type === 'schema') {
    prompt += `\nGenerate a complete database table schema with:
- Appropriate columns and data types
- Primary key and foreign keys if needed
- Timestamps (created_at, updated_at)
- Indexes for performance
- Proper constraints (NOT NULL, UNIQUE, etc.)`;
  } else if (type === 'api') {
    prompt += `\nGenerate a complete API configuration with:
- RESTful operations (GET, POST, PUT, DELETE as needed)
- Proper action workflows for each operation
- Request/response validation
- Database operations using action engine
- Proper error handling`;
  } else if (type === 'page') {
    prompt += `\nGenerate a complete page configuration with:
- Data sources connecting to relevant APIs
- Appropriate layout and components
- Forms for data entry if needed
- Tables for data display if needed
- Interactive actions (navigation, submission, etc.)`;
  }

  return prompt;
}

/**
 * Extract resource name from feature or output path
 * Used to identify which existing config we're working with
 */
function extractResourceName(feature: string, output?: string): string {
  if (output) {
    // Extract from output path: config/api/tasks.json -> tasks
    const match = output.match(/\/([^/]+)\.json$/);
    if (match) return match[1];
  }

  // Extract from feature: "Tasks API" -> tasks
  const words = feature.toLowerCase()
    .replace(/\s+(api|database|schema|page|form|detail|list|table)\s*/gi, ' ')
    .trim()
    .split(/\s+/);

  return words[0] || 'unknown';
}

/**
 * Call Cloudflare AI Gateway to generate config
 */
async function generateConfig(options: GenerateOptions): Promise<any> {
  // Get Cloudflare AI Gateway configuration
  const gatewayUrl = process.env.CLOUDFLARE_AI_GATEWAY_URL;
  const model = options.model || process.env.CLOUDFLARE_MODEL || 'anthropic/claude-3-5-sonnet';

  // API Key priority: ANTHROPIC_API_KEY > OPENAI_API_KEY > CLOUDFLARE_API_TOKEN
  const apiKey = options.apiKey ||
                 process.env.ANTHROPIC_API_KEY ||
                 process.env.OPENAI_API_KEY ||
                 process.env.CLOUDFLARE_API_TOKEN || '';

  if (!gatewayUrl) {
    throw new Error(
      'CLOUDFLARE_AI_GATEWAY_URL required in .env\n' +
      'Format: https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id}'
    );
  }

  if (!apiKey) {
    throw new Error(
      'API key required. Set one of:\n' +
      '  - ANTHROPIC_API_KEY (for Anthropic Claude)\n' +
      '  - OPENAI_API_KEY (for OpenAI GPT)\n' +
      '  - CLOUDFLARE_API_TOKEN (if keys configured in gateway dashboard)'
    );
  }

  // Build endpoint: {gateway_url}/compat/chat/completions
  const endpoint = `${gatewayUrl.replace(/\/$/, '')}/compat/chat/completions`;

  // Headers for Cloudflare AI Gateway
  const headers = {
    'Content-Type': 'application/json',
    'cf-aig-authorization': `Bearer ${apiKey}`,
  };

  // Load format schema
  const formatSchema = loadFormatSchema(options.type);

  // Auto-build context from existing configs (prevents AI hallucination)
  const autoContext = buildContext(options.type, {
    resourceName: extractResourceName(options.feature, options.output),
    isRegenerate: options.output ? existsSync(options.output) : false
  });

  // Combine auto context with user-provided context
  const fullContext = autoContext
    ? (options.context ? `${autoContext}\n\n${options.context}` : autoContext)
    : options.context;

  // Build prompts
  const systemPrompt = buildSystemPrompt(options.type);
  const userPrompt = buildUserPrompt(options.type, options.feature, options.tasks, fullContext);

  // EXAMPLE-DRIVEN GENERATION (no structured output mode)
  // We generate WITHOUT response_format, then validate afterwards
  // Default to skip validation unless explicitly enabled
  const skipValidation = options.skipValidation !== false; // Default true
  const maxValidationRetries = skipValidation ? 1 : 3;
  let validConfig: any = null;
  let currentUserPrompt = userPrompt;

  for (let validationAttempt = 1; validationAttempt <= maxValidationRetries; validationAttempt++) {
    console.log(`\n🔄 Generation attempt ${validationAttempt}/${maxValidationRetries}`);

    // Prepare request WITHOUT response_format (example-driven approach)
    const request: AIRequest = {
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: currentUserPrompt }
      ],
      // NO response_format - let AI learn from examples!
      temperature: 0.2, // Lower temperature for more consistency
      max_tokens: 16000
    };

    console.log(`🤖 Calling Cloudflare AI Gateway (${model})...`);
    console.log(`📝 Generating ${options.type} configuration for: ${options.feature}`);
    console.log(`📤 Request parameters:`);
    console.log(`   - Prompt chars: ${request.messages[0].content.length + request.messages[1].content.length}`);
    console.log(`   - Max tokens: ${request.max_tokens}`);
    console.log(`   - Temperature: ${request.temperature}`);
    console.log(`   - Approach: Example-driven (no structured output)`);

    // Log full request payload if debug mode
    if (options.debug) {
      console.log('\n🐛 Full request payload:');
      console.log(JSON.stringify(request, null, 2));
    }
    console.log();

    // Call API with network retry logic
    const maxNetworkRetries = 3;
    let lastError: Error | null = null;
    let response: Response | null = null;

    for (let networkAttempt = 1; networkAttempt <= maxNetworkRetries; networkAttempt++) {
      try {
        if (networkAttempt > 1) {
          const waitTime = Math.pow(2, networkAttempt - 1) * 1000; // Exponential backoff: 2s, 4s, 8s
          console.log(`⏳ Network retry ${networkAttempt}/${maxNetworkRetries} after ${waitTime / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        response = await fetch(endpoint, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(request)
        });

        // If fetch succeeded, break out of retry loop
        break;
      } catch (fetchError) {
        lastError = fetchError instanceof Error ? fetchError : new Error(String(fetchError));
        console.error(`\n❌ Network error on attempt ${networkAttempt}/${maxNetworkRetries}:`);
        console.error(`   Endpoint: ${endpoint}`);
        console.error(`   Error: ${lastError.message}`);

        if (networkAttempt === maxNetworkRetries) {
          console.error(`\n💥 All ${maxNetworkRetries} network retry attempts failed`);
          throw new Error(`Network fetch failed after ${maxNetworkRetries} attempts: ${lastError.message}`);
        }
      }
    }

    if (!response) {
      throw new Error(`No response received after ${maxNetworkRetries} attempts`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`\n❌ API returned error status ${response.status}:`);
      console.error(`   Response: ${errorText.substring(0, 500)}`);
      throw new Error(`API request failed (${response.status}): ${errorText}`);
    }

    const result: AIResponse = await response.json();

    // Extract generated config
    const content = result.choices[0]?.message?.content;
    if (!content) {
      console.error('❌ No content in response. Full response:', JSON.stringify(result, null, 2));
      throw new Error('No content in API response');
    }

    console.log(`📄 Raw response length: ${content.length} characters`);

    // Debug: save raw response if debug mode enabled
    if (options.debug) {
      const debugPath = '/tmp/ai-config-debug-response.txt';
      writeFileSync(debugPath, content, 'utf-8');
      console.log(`🐛 Debug: Raw response saved to ${debugPath}`);
    }

    // Strip markdown code blocks if present
    let jsonContent = content.trim();

    // Remove ```json ... ``` or ``` ... ```
    if (jsonContent.startsWith('```')) {
      const lines = jsonContent.split('\n');
      // Remove first line (```json or ```)
      lines.shift();
      // Remove last line (```)
      if (lines[lines.length - 1].trim() === '```') {
        lines.pop();
      }
      jsonContent = lines.join('\n').trim();
      console.log(`🔧 Stripped markdown code blocks`);
    }

    // Parse JSON
    let config;
    try {
      config = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error(`\n❌ JSON Parse Error:`);
      console.error(`First 500 chars of content:\n${jsonContent.substring(0, 500)}`);
      console.error(`Last 500 chars of content:\n${jsonContent.substring(Math.max(0, jsonContent.length - 500))}`);

      if (validationAttempt < maxValidationRetries) {
        console.log(`\n⚠️  Will retry with error feedback...`);
        currentUserPrompt = userPrompt + `\n\nPREVIOUS ATTEMPT FAILED WITH JSON PARSE ERROR:\n${parseError instanceof Error ? parseError.message : parseError}\n\nPlease fix the JSON syntax and generate valid JSON only.`;
        continue;
      }

      throw new Error(`Failed to parse JSON: ${parseError instanceof Error ? parseError.message : parseError}`);
    }

    // Log usage with detailed breakdown
    const usage = result.usage;
    console.log(`📊 Token usage:`);
    console.log(`   📤 Prompt tokens: ${usage.prompt_tokens}`);
    console.log(`   📥 Completion tokens: ${usage.completion_tokens}`);
    console.log(`   📊 Total tokens: ${usage.total_tokens}`);
    if (usage.reasoning_tokens) {
      console.log(`   🧠 Reasoning tokens: ${usage.reasoning_tokens}`);
    }

    // VALIDATE with full JSON Schema (no limitations!)
    if (skipValidation) {
      console.log(`\n⚠️  Skipping validation (default behavior)`);
      validConfig = config;
      break;
    }

    console.log(`\n🔍 Validating against JSON schema...`);
    const ajv = new Ajv({
      strict: false,
      allowUnionTypes: true,
      allErrors: true,
      verbose: true
    });

    const validate = ajv.compile(formatSchema);
    const isValid = validate(config);

    if (isValid) {
      console.log(`✅ Config generated and validated successfully!`);
      validConfig = config;
      break;
    }

    // Validation failed
    console.error(`\n❌ Validation failed (attempt ${validationAttempt}/${maxValidationRetries}):`);
    console.error(`   Errors:`, JSON.stringify(validate.errors, null, 2));

    if (validationAttempt < maxValidationRetries) {
      // Add validation errors to next prompt for AI to fix
      const errorSummary = validate.errors?.map((err: any) =>
        `- ${err.instancePath || 'root'}: ${err.message} (${err.keyword})`
      ).join('\n');

      console.log(`\n⚠️  Retrying with validation error feedback...`);
      currentUserPrompt = userPrompt + `\n\nPREVIOUS ATTEMPT HAD VALIDATION ERRORS:\n${errorSummary}\n\nDetailed errors:\n${JSON.stringify(validate.errors, null, 2)}\n\nPlease fix these validation errors and generate again following the examples exactly.`;
    } else {
      console.error(`\n💥 Failed to generate valid config after ${maxValidationRetries} attempts`);
      console.error(`\nLast generated config (invalid):`);
      console.error(JSON.stringify(config, null, 2));
      throw new Error(`Validation failed after ${maxValidationRetries} attempts. See errors above.`);
    }
  }

  if (!validConfig) {
    throw new Error('Failed to generate valid config - this should never happen');
  }

  console.log();
  return validConfig;
}

/**
 * Save generated config to file
 */
function saveConfig(config: any, type: string, output?: string): string {
  let outputPath: string;

  if (output) {
    outputPath = output;
  } else {
    // Auto-generate output path based on type
    const configName = config.table || config.name || config.resource || 'generated';
    const fileName = configName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    if (type === 'schema') {
      outputPath = join(process.cwd(), 'config', 'schema', `${fileName}.json`);
    } else if (type === 'api') {
      outputPath = join(process.cwd(), 'config', 'api', `${fileName}.json`);
    } else if (type === 'page') {
      outputPath = join(process.cwd(), 'config', 'pages', `${fileName}.json`);
    } else {
      outputPath = join(process.cwd(), 'config', `${fileName}.json`);
    }
  }

  // Ensure directory exists
  const dir = dirname(outputPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Write file with pretty formatting
  writeFileSync(outputPath, JSON.stringify(config, null, 2), 'utf-8');

  return outputPath;
}

/**
 * Main CLI function
 */
async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const options: Partial<GenerateOptions> = {};
  let i = 0;

  while (i < args.length) {
    const arg = args[i];

    if (arg === '--type' || arg === '-t') {
      options.type = args[++i] as any;
    } else if (arg === '--feature' || arg === '-f') {
      options.feature = args[++i];
    } else if (arg === '--tasks') {
      options.tasks = args[++i];
    } else if (arg === '--context' || arg === '-c') {
      options.context = args[++i];
    } else if (arg === '--output' || arg === '-o') {
      options.output = args[++i];
    } else if (arg === '--api-key' || arg === '-k') {
      options.apiKey = args[++i];
    } else if (arg === '--model' || arg === '-m') {
      options.model = args[++i];
    } else if (arg === '--debug') {
      options.debug = true;
    } else if (arg === '--skip-validation') {
      options.skipValidation = true;
    } else if (arg === '--validate') {
      options.skipValidation = false;
    } else if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${arg}`);
      printUsage();
      process.exit(1);
    }

    i++;
  }

  // Validate required options
  if (!options.type || !options.feature) {
    console.error('Error: --type and --feature are required\n');
    printUsage();
    process.exit(1);
  }

  if (!['schema', 'api', 'page', 'app'].includes(options.type)) {
    console.error(`Error: Invalid type "${options.type}". Must be: schema, api, page, or app\n`);
    process.exit(1);
  }

  try {
    // Generate config
    const config = await generateConfig(options as GenerateOptions);

    // Save to file
    const outputPath = saveConfig(config, options.type, options.output);

    console.log(`✅ Configuration saved to: ${outputPath}`);
    console.log(`\n📄 Generated config preview:`);
    console.log(JSON.stringify(config, null, 2).split('\n').slice(0, 20).join('\n'));
    if (JSON.stringify(config, null, 2).split('\n').length > 20) {
      console.log('... (truncated)');
    }

    // Next steps
    console.log(`\n📋 Next steps:`);
    if (options.type === 'schema') {
      console.log(`   1. Review the generated schema: ${outputPath}`);
      console.log(`   2. Run migration: bun run db:migrate`);
      console.log(`   3. Generate API config for this table`);
    } else if (options.type === 'api') {
      console.log(`   1. Review the generated API: ${outputPath}`);
      console.log(`   2. Rebuild API index: bun run build:api-index`);
      console.log(`   3. Restart dev server`);
      console.log(`   4. Generate page config to display this data`);
    } else if (options.type === 'page') {
      console.log(`   1. Review the generated page: ${outputPath}`);
      console.log(`   2. Add route to config/apps.json`);
      console.log(`   3. Refresh browser to see changes`);
    }

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

/**
 * Print usage information
 */
function printUsage() {
  console.log(`
AI Config Generator - Generate configs using z.ai GLM API

Usage:
  tsx scripts/ai-config-generator.ts --type <type> --feature <description> [options]

Required Arguments:
  --type, -t <type>           Config type: schema, api, page, or app
  --feature, -f <description> Feature description

Optional Arguments:
  --tasks <details>           Detailed task requirements
  --context, -c <info>        Additional context or constraints
  --output, -o <path>         Output file path (auto-generated if not specified)
  --api-key, -k <key>         z.ai API key (or set ZAI_API_KEY env var)
  --model, -m <model>         Model to use (default: from ZAI_DEFAULT_MODEL or glm-4-flash)
                              Check z.ai docs for available models
                              Examples: glm-4-plus, glm-4-0520, glm-4-air, glm-4-airx
  --debug                     Enable debug logging (shows raw API response)
  --validate                  Enable JSON schema validation with retries (disabled by default)
  --skip-validation           Skip validation (default behavior, kept for compatibility)
  --help, -h                  Show this help message

Environment Variables:
  ZAI_API_KEY                 z.ai API key

Examples:

  # Generate database schema
  tsx scripts/ai-config-generator.ts \\
    --type schema \\
    --feature "Employee management system" \\
    --tasks "Track employee info, departments, roles, and salaries"

  # Generate API configuration
  tsx scripts/ai-config-generator.ts \\
    --type api \\
    --feature "Employee CRUD operations" \\
    --context "Use employees table from schema"

  # Generate page configuration
  tsx scripts/ai-config-generator.ts \\
    --type page \\
    --feature "Employee directory with search and filters"

  # Generate with custom output path
  tsx scripts/ai-config-generator.ts \\
    --type schema \\
    --feature "Task management" \\
    --output config/schema/tasks.json

  # Use specific model
  tsx scripts/ai-config-generator.ts \\
    --type api \\
    --feature "Advanced analytics API" \\
    --model glm-4-plus

Available Models:
  Check z.ai documentation for the latest available models.
  Set your preferred default model in .env:
    ZAI_DEFAULT_MODEL=glm-4-plus

  Or specify per command:
    --model glm-4-plus
`);
}

// Run CLI
main();
