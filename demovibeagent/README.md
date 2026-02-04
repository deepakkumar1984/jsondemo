# Vibe Agent - Config Development Assistant

An interactive AI agent for developing configs in the `democonfig/config` directory using Vercel AI SDK with XAI (Grok).

## Features

- **File Operations**: Read, write, and edit files with sandbox security
- **Config Generation**: AI-powered generation of schemas, APIs, pages, and app configs
- **Search Tools**: Find files by glob patterns and list directories
- **Context Awareness**: View existing configs to avoid duplicates and maintain consistency
- **Streaming Interface**: Real-time display of agent responses and tool calls
- **Multi-Step Reasoning**: Agent can use multiple tools in sequence to complete tasks

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure API Key

Copy `.env.example` to `.env` and add your XAI API key:

```bash
cp .env.example .env
```

Edit `.env` and set your API key:

```env
XAI_API_KEY=your-actual-api-key-here
```

### 3. Test the Agent

Run the test script to verify everything works:

```bash
npx tsx test-agent.ts
```

## Usage

### Interactive Mode (REPL)

Start the interactive agent:

```bash
npm run dev
```

### Autonomous Request Processing

Process tasks from `democonfig/config/request.json` autonomously:

```bash
# Process all tasks
npm run process-request all

# Process next 5 tasks only
npm run process-request all 5

# Process just the next task
npm run process-request one

# Show current status
npm run process-request status
```

See [REQUEST_PROCESSOR.md](REQUEST_PROCESSOR.md) for detailed documentation.

### Commands

- `exit` - Quit the agent
- `reset` - Clear conversation history
- `help` - Show available operations

### Example Prompts

**File Operations:**
```
Read the expenses.routes.ts file
List all files in the api directory
Show me all schema files
```

**Config Generation:**
```
Generate a schema for task management
Create API routes for the tasks table
Generate a list page for tasks
```

**Multi-Step Workflows:**
```
Show me what schemas exist
Create a complete feature for project tracking (schema + api + page)
```

## Available Tools

### File Tools
- **read_file** - Read file contents from the config directory
- **write_file** - Create or overwrite files (auto-creates directories)
- **edit_file** - Search and replace text in files

### Search Tools
- **glob** - Find files by pattern (e.g., `**/*.ts`, `api/*.routes.ts`)
- **list_directory** - List files and directories with type indicators

### Context Tools
- **get_context** - View existing configs in DSL format

### Config Generation
- **generate_config** - Generate schema/api/page/app configs using AI
  - Automatic validation with retry loop
  - Context-aware to prevent hallucination
  - Auto path generation
  - Next steps suggestions

## Architecture

```
demovibeagent/
├── src/
│   ├── index.ts              # REPL entry point
│   ├── agent.ts              # Core agent with streaming
│   ├── tools/
│   │   ├── index.ts          # Tool registry
│   │   ├── file-tools.ts     # read, write, edit
│   │   ├── search-tools.ts   # glob, list_directory
│   │   ├── context-tools.ts  # get_context
│   │   └── config-tools.ts   # generate_config
│   ├── config/
│   │   └── prompts.ts        # System prompts
│   ├── generators/
│   │   ├── ai-client.ts      # AI SDK wrapper
│   │   ├── prompts.ts        # Generation prompts
│   │   └── validator.ts      # Schema validation
│   └── utils/
│       ├── sandbox.ts        # Path security
│       └── logger.ts         # Logging
├── package.json
├── tsconfig.json
└── .env                      # API keys (gitignored)
```

## Security

- **Sandbox**: All file operations restricted to `../democonfig/config`
- **Path Validation**: Prevents directory traversal attacks
- **No Silent Failures**: Errors are always reported honestly

## Configuration

### Environment Variables

```env
# AI Provider (easy to switch)
AI_PROVIDER=xai

# Models
AI_MODEL=grok-beta                    # For agent/tool calling
CONFIG_GEN_MODEL=grok-code-fast-1     # For code generation

# API Keys
XAI_API_KEY=your-key

# Debug (optional)
DEBUG=true
```

### Switching Providers

The agent supports easy provider switching. To use Anthropic or OpenAI:

1. Update `AI_PROVIDER` in `.env`
2. Set the corresponding API key
3. Uncomment the import in `src/generators/ai-client.ts`

## Development

### Build

```bash
npm run build
```

### Run (Production)

```bash
npm start
```

### Test

```bash
npx tsx test-agent.ts
```

## Workflow Example

Creating a new feature:

```
You: Generate a schema for tracking projects with name, description, status, and owner

Agent: [Generates schema/projects.json with validation]

You: Now create API routes for this schema

Agent: [Generates api/projects.routes.ts with CRUD operations]

You: Create a list page for projects

Agent: [Generates pages/ProjectsListPage.tsx with UI components]

You: Update apps.json to add the new route

Agent: [Edits apps.json to include project routes]
```

## Error Handling

Following the "No Silent Failures" principle from CLAUDE.md:

- All errors are reported honestly
- Tools return `success: false` when operations fail
- Validation errors show actual details
- File operations verify success before claiming completion

## License

MIT
