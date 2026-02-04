# Request Processor

The Request Processor autonomously processes tasks from `democonfig/config/request.json` using the Vibe Agent.

## Features

- **Autonomous Task Processing**: Reads request.json and works through tasks systematically
- **Status Tracking**: Automatically updates task status (pending → in_progress → completed)
- **Dependency Management**: Respects feature dependencies before starting work
- **Progress Reporting**: Shows progress and completion status
- **Flexible Modes**: Process all tasks, one task, or just check status

## Usage

### Process All Tasks

Process all pending tasks in order:

```bash
npm run process-request all
```

Process a limited number of tasks (useful for testing):

```bash
npm run process-request all 5
```

### Process Next Task Only

Process just the next pending task:

```bash
npm run process-request one
```

### Show Status

Display current progress without processing:

```bash
npm run process-request status
```

## How It Works

1. **Load Request**: Reads `democonfig/config/request.json` with all features/tasks
2. **Find Next Task**: Identifies the next pending task (respecting dependencies)
3. **Build Prompt**: Creates a detailed prompt for the Vibe Agent based on task type
4. **Execute**: Runs the agent with the prompt, streaming output to console
5. **Update Status**: Marks task as completed and updates tracking metadata
6. **Repeat**: Moves to next task until all are complete

## Task Types

The processor handles different task types with appropriate prompts:

- **research**: Investigates codebase and creates documentation
- **schema**: Creates database schema JSON files
- **api**: Creates API route TypeScript files
- **page**: Creates page configuration files
- **app**: Updates apps.json configuration

## Status Tracking

The processor maintains status in `request.json`:

```json
{
  "features": [
    {
      "title": "Feature Name",
      "status": "pending" | "in_progress" | "completed",
      "completedAt": "2026-02-04T00:00:00.000Z",
      "tasks": [...]
    }
  ],
  "tracking": {
    "startedAt": "2026-02-04T00:00:00.000Z",
    "lastUpdatedAt": "2026-02-04T00:00:00.000Z",
    "overallStatus": "in_progress",
    "completedFeatures": 2,
    "totalFeatures": 6,
    "completedTasks": 8,
    "totalTasks": 24
  }
}
```

## Example Session

```bash
$ npm run process-request all

🚀 Starting request processor...

Summary: Add Expense Management with analytics dashboards...

================================================================================
📋 Processing: Inventory existing schema/api/page patterns
   Scope: app | Type: research
================================================================================

🤖 Agent working...

[Agent output streams here...]

✅ Completed: Inventory existing schema/api/page patterns
   Progress: 1/24 tasks

================================================================================
📋 Processing: Define ExpenseCategory schema
   Scope: schema | Type: task
================================================================================

[... continues through all tasks ...]

🎉 All tasks completed!

Total features completed: 6/6
Total tasks completed: 24/24
```

## Benefits

- **Hands-Free**: Agent works autonomously through all requirements
- **Trackable**: Progress saved in request.json for resumability
- **Safe**: Can stop/resume at any time
- **Transparent**: All agent activity visible in console
- **Structured**: Follows the detailed requirements exactly

## Notes

- The processor uses the same Vibe Agent that runs in interactive mode
- All agent capabilities (file operations, config generation, context awareness) are available
- Tasks are processed sequentially to maintain consistency
- Failed tasks stop the processor to allow manual intervention
- The request.json file is your source of truth for progress
