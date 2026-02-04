/**
 * Logger Utilities
 *
 * Provides structured logging with timestamps and severity levels.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
}

const DEBUG_ENABLED = process.env.DEBUG === 'true';

/**
 * Format timestamp for log entries
 */
function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Format log entry for output
 */
function formatLogEntry(entry: LogEntry): string {
  const timestamp = entry.timestamp;
  const level = entry.level.toUpperCase().padEnd(5);
  const message = entry.message;

  let output = `[${timestamp}] ${level} ${message}`;

  if (entry.data) {
    output += `\n${JSON.stringify(entry.data, null, 2)}`;
  }

  return output;
}

/**
 * Log a debug message (only shown if DEBUG=true)
 */
export function debug(message: string, data?: any): void {
  if (!DEBUG_ENABLED) return;

  const entry: LogEntry = {
    timestamp: getTimestamp(),
    level: 'debug',
    message,
    data
  };

  console.debug(formatLogEntry(entry));
}

/**
 * Log an info message
 */
export function info(message: string, data?: any): void {
  const entry: LogEntry = {
    timestamp: getTimestamp(),
    level: 'info',
    message,
    data
  };

  console.log(formatLogEntry(entry));
}

/**
 * Log a warning message
 */
export function warn(message: string, data?: any): void {
  const entry: LogEntry = {
    timestamp: getTimestamp(),
    level: 'warn',
    message,
    data
  };

  console.warn(formatLogEntry(entry));
}

/**
 * Log an error message
 */
export function error(message: string, data?: any): void {
  const entry: LogEntry = {
    timestamp: getTimestamp(),
    level: 'error',
    message,
    data
  };

  console.error(formatLogEntry(entry));
}

/**
 * Log a tool execution
 */
export function logToolExecution(
  toolName: string,
  params: any,
  result: { success: boolean; error?: string }
): void {
  const level: LogLevel = result.success ? 'info' : 'error';
  const message = `Tool: ${toolName}`;

  const entry: LogEntry = {
    timestamp: getTimestamp(),
    level,
    message,
    data: {
      tool: toolName,
      params,
      result
    }
  };

  if (level === 'error') {
    console.error(formatLogEntry(entry));
  } else if (DEBUG_ENABLED) {
    console.log(formatLogEntry(entry));
  }
}

/**
 * Log API call details
 */
export function logAPICall(
  endpoint: string,
  model: string,
  promptLength: number,
  responseLength: number,
  duration: number
): void {
  if (!DEBUG_ENABLED) return;

  const entry: LogEntry = {
    timestamp: getTimestamp(),
    level: 'debug',
    message: `API Call: ${endpoint}`,
    data: {
      model,
      promptLength,
      responseLength,
      durationMs: duration
    }
  };

  console.debug(formatLogEntry(entry));
}

export default {
  debug,
  info,
  warn,
  error,
  logToolExecution,
  logAPICall
};
