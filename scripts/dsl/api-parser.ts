/**
 * API DSL Parser
 *
 * Converts API DSL → JSON format matching api-format.json
 *
 * DSL Format:
 *   api <name> "<basePath>" [auth]
 *   desc "<description>"
 *
 *   op <id> <METHOD> "<path>" [auth]
 *   desc "<description>"
 *     <action>
 *     <action>
 */

interface ApiConfig {
  name?: string;
  resource?: string;
  basePath: string;
  description?: string;
  requiresAuth?: boolean;
  operations: Operation[];
}

interface Operation {
  id: string;
  name?: string;
  method: string;
  path: string;
  description?: string;
  requiresAuth?: boolean;
  requestSchema?: any;
  responseSchema?: any;
  actions: Action[];
}

type Action = any; // Will be specific action types

export function parseApi(dsl: string): ApiConfig {
  const lines = dsl.split('\n').map(l => l.trimEnd()).filter(l => l && !l.trim().startsWith('#'));

  const config: ApiConfig = {
    basePath: '',
    operations: []
  };

  let i = 0;

  // Parse api declaration
  if (lines[i].trim().startsWith('api ')) {
    const apiLine = lines[i].trim().substring(4); // Remove 'api '
    const match = apiLine.match(/^(\w+)\s+"([^"]+)"(\s+auth)?/);

    if (!match) {
      throw new Error(`Invalid api declaration: ${lines[i]}`);
    }

    config.name = match[1];
    config.basePath = match[2];
    if (match[3]) {
      config.requiresAuth = true;
    }
    i++;

    // Check for desc
    if (i < lines.length && lines[i].trim().startsWith('desc ')) {
      const descMatch = lines[i].trim().match(/^desc\s+"([^"]*)"/);
      if (descMatch) {
        config.description = descMatch[1];
      }
      i++;
    }
  }

  // Parse operations
  while (i < lines.length) {
    if (lines[i].trim().startsWith('op ')) {
      const operation = parseOperation(lines, i);
      config.operations.push(operation.op);
      i = operation.nextLine;
    } else {
      i++;
    }
  }

  return config;
}

function parseOperation(lines: string[], startIdx: number): { op: Operation; nextLine: number } {
  let i = startIdx;
  const opLine = lines[i].trim().substring(3); // Remove 'op '
  const match = opLine.match(/^(\w+)\s+(\w+)\s+"([^"]+)"(\s+auth)?/);

  if (!match) {
    throw new Error(`Invalid operation declaration: ${lines[i]}`);
  }

  const operation: Operation = {
    id: match[1],
    method: match[2],
    path: match[3],
    actions: []
  };

  if (match[4]) {
    operation.requiresAuth = true;
  }

  i++;

  // Parse optional desc, req, res
  while (i < lines.length && !lines[i].trim().startsWith('op ')) {
    const line = lines[i].trim();

    if (line.startsWith('desc ')) {
      const descMatch = line.match(/^desc\s+"([^"]*)"/);
      if (descMatch) {
        operation.description = descMatch[1];
      }
      i++;
    } else if (line.startsWith('req ') || line.startsWith('res ')) {
      // Skip for now (not critical for MVP)
      i++;
    } else if (line) {
      // Parse action
      const result = parseAction(lines, i);
      operation.actions.push(result.action);
      i = result.nextLine;
    } else {
      i++;
    }
  }

  return { op: operation, nextLine: i };
}

function parseAction(lines: string[], startIdx: number): { action: Action; nextLine: number } {
  const line = lines[startIdx].trim();
  let i = startIdx;

  // validate
  if (line.startsWith('validate ')) {
    return { action: parseValidate(line), nextLine: i + 1 };
  }

  // set
  if (line.startsWith('set ')) {
    return { action: parseSet(line), nextLine: i + 1 };
  }

  // calc
  if (line.startsWith('calc ')) {
    return { action: parseCalc(line), nextLine: i + 1 };
  }

  // query
  if (line.startsWith('query ')) {
    return { action: parseQuery(line), nextLine: i + 1 };
  }

  // insert
  if (line.startsWith('insert ')) {
    return { action: parseInsert(line), nextLine: i + 1 };
  }

  // update
  if (line.startsWith('update ')) {
    return { action: parseUpdate(line), nextLine: i + 1 };
  }

  // delete
  if (line.startsWith('delete ')) {
    return { action: parseDelete(line), nextLine: i + 1 };
  }

  // bulkinsert
  if (line.startsWith('bulkinsert ')) {
    return { action: parseBulkInsert(line), nextLine: i + 1 };
  }

  // respond
  if (line.startsWith('respond ')) {
    return { action: parseRespond(line), nextLine: i + 1 };
  }

  // http
  if (line.startsWith('http ')) {
    return { action: parseHttp(line), nextLine: i + 1 };
  }

  // if/else/endif
  if (line === 'if' || line.startsWith('if ')) {
    return parseIf(lines, i);
  }

  // loop/endloop
  if (line.startsWith('loop ')) {
    return parseLoop(lines, i);
  }

  // map (transform array)
  if (line.startsWith('map ')) {
    return { action: parseMap(line), nextLine: i + 1 };
  }

  // tx begin/end
  if (line === 'tx begin') {
    return parseTransaction(lines, i);
  }

  // parallel begin/end
  if (line === 'parallel begin') {
    return parseParallel(lines, i);
  }

  // try begin/catch/try end
  if (line === 'try begin') {
    return parseTry(lines, i);
  }

  throw new Error(`Unknown action: ${line}`);
}

function parseValidate(line: string): Action {
  // validate <field> <rule1> [rule2...] [key=value...]
  // Examples:
  //   validate body.title required
  //   validate body.hours required min=0.1 max=24
  //   validate body.email required message="Email is required"

  // Extract custom message first to avoid splitting issues
  let customMessage: string | undefined;
  let remaining = line.substring(9).trim(); // Remove 'validate '

  if (remaining.includes('message=')) {
    customMessage = extractQuotedValue(remaining, 'message=');
    // Remove message from the line
    const messageStart = remaining.indexOf('message=');
    const quoteStart = remaining.indexOf('"', messageStart);
    const quoteEnd = remaining.indexOf('"', quoteStart + 1);
    if (quoteStart !== -1 && quoteEnd !== -1) {
      remaining = remaining.substring(0, messageStart).trim() + ' ' + remaining.substring(quoteEnd + 1).trim();
    }
  }

  const parts = remaining.split(/\s+/).filter(p => p);
  const field = parts[0];

  const action: any = {
    type: 'validate',
    rules: []
  };

  // Parse all parts after the field
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];

    if (part.startsWith('min=')) {
      action.rules.push({
        field,
        rule: 'min',
        value: parseFloat(part.substring(4))
      });
    } else if (part.startsWith('max=')) {
      action.rules.push({
        field,
        rule: 'max',
        value: parseFloat(part.substring(4))
      });
    } else if (part.startsWith('value=')) {
      // Generic value for other rules
      const lastRule = action.rules[action.rules.length - 1];
      if (lastRule) {
        lastRule.value = parseFloat(part.substring(6));
      }
    } else if (!part.startsWith('message=')) {
      // It's a rule name (required, email, pattern, etc.)
      // Skip message= parts that might remain
      action.rules.push({
        field,
        rule: part
      });
    }
  }

  // Apply custom message to all rules if provided
  if (customMessage) {
    action.rules.forEach((r: any) => {
      if (!r.message) {
        r.message = customMessage;
      }
    });
  }

  return action;
}

function parseSet(line: string): Action {
  // set <path>=<expr> [<path>=<expr>...]
  const setPart = line.substring(4).trim();
  const assignments = setPart.split(/\s+/);

  const set: any = {};

  for (const assign of assignments) {
    const [path, expr] = assign.split('=');
    set[path] = expr;
  }

  return {
    type: 'transform',
    set
  };
}

function parseCalc(line: string): Action {
  // calc <varName>=<expression>
  const calcPart = line.substring(5).trim();
  const [varName, expression] = calcPart.split('=');

  return {
    type: 'calc',
    expression: expression.trim(),
    into: varName.trim()
  };
}

function parseQuery(line: string): Action {
  // query <table> [where <filter>] [order <field> <dir>] [limit <n>] [offset <n>] -> <varName>
  const queryPart = line.substring(6).trim();
  const parts = queryPart.split(/\s+/);

  const action: any = {
    type: 'db.query',
    table: parts[0]
  };

  let i = 1;
  while (i < parts.length) {
    if (parts[i] === 'where') {
      i++;
      // Collect where clause until next keyword
      const whereClause = [];
      while (i < parts.length && !['order', 'limit', 'offset', '->'].includes(parts[i])) {
        whereClause.push(parts[i]);
        i++;
      }
      action.where = parseWhereClause(whereClause.join(' '));
    } else if (parts[i] === 'order') {
      i++;
      const field = parts[i];
      i++;
      const direction = parts[i] || 'asc';
      action.orderBy = [{ field, direction: direction.toUpperCase() }];
      i++;
    } else if (parts[i] === 'limit') {
      i++;
      action.limit = parseInt(parts[i]);
      i++;
    } else if (parts[i] === 'offset') {
      i++;
      action.offset = parseInt(parts[i]);
      i++;
    } else if (parts[i] === '->') {
      i++;
      action.into = parts[i];
      break;
    } else {
      i++;
    }
  }

  return action;
}

function parseInsert(line: string): Action {
  // insert <table> map(<field>=<expr>,...) [-> <varName>]
  const match = line.match(/^insert\s+(\w+)\s+map\(([^)]+)\)(?:\s+->\s+(\w+))?/);

  if (!match) {
    throw new Error(`Invalid insert syntax: ${line}`);
  }

  const table = match[1];
  const mapContent = match[2];
  const returning = match[3];

  const map: any = {};
  const assignments = mapContent.split(',').map(s => s.trim());

  for (const assign of assignments) {
    const [field, expr] = assign.split('=').map(s => s.trim());
    map[field] = expr;
  }

  const action: any = {
    type: 'db.insert',
    table,
    map
  };

  if (returning) {
    action.returning = returning;
  }

  return action;
}

function parseUpdate(line: string): Action {
  // update <table> where <filter> set <field>=<expr> [<field>=<expr>...]
  const match = line.match(/^update\s+(\w+)\s+where\s+(.+?)\s+set\s+(.+)$/);

  if (!match) {
    throw new Error(`Invalid update syntax: ${line}`);
  }

  const table = match[1];
  const wherePart = match[2];
  const setPart = match[3];

  const action: any = {
    type: 'db.update',
    table,
    where: parseWhereClause(wherePart),
    map: {}  // Schema uses "map" not "set"
  };

  const assignments = setPart.split(/\s+/);
  for (const assign of assignments) {
    const [field, expr] = assign.split('=').map(s => s.trim());
    action.map[field] = expr;  // Schema uses "map" not "set"
  }

  return action;
}

function parseDelete(line: string): Action {
  // delete <table> where <filter>
  const match = line.match(/^delete\s+(\w+)\s+where\s+(.+)$/);

  if (!match) {
    throw new Error(`Invalid delete syntax: ${line}`);
  }

  return {
    type: 'db.delete',
    table: match[1],
    where: parseWhereClause(match[2])
  };
}

function parseBulkInsert(line: string): Action {
  // bulkinsert <table> <arrayVar>
  const parts = line.substring(11).trim().split(/\s+/);

  return {
    type: 'db.bulkInsert',
    table: parts[0],
    data: `{{${parts[1]}}}`
  };
}

function parseRespond(line: string): Action {
  // respond [<statusCode>] <field>=<expr> [<field>=<expr>...]
  // Examples:
  //   respond items={{tasks}}
  //   respond 201 id={{taskId}}
  //   respond 404 error="Task not found"
  const respondPart = line.substring(8).trim();

  const action: any = {
    type: 'response.map',
    fields: {}
  };

  // Parse status code if present (first token that's a number)
  const statusMatch = respondPart.match(/^(\d+)\s+/);
  let remaining = respondPart;
  if (statusMatch) {
    action.statusCode = parseInt(statusMatch[1]);
    remaining = respondPart.substring(statusMatch[0].length);
  }

  // Parse field=value pairs, respecting quoted strings
  const pairs = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < remaining.length; i++) {
    const char = remaining[i];

    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if (char === ' ' && !inQuotes) {
      if (current.trim()) {
        pairs.push(current.trim());
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    pairs.push(current.trim());
  }

  // Parse each field=value pair
  for (const pair of pairs) {
    const eqIndex = pair.indexOf('=');
    if (eqIndex > 0) {
      const field = pair.substring(0, eqIndex).trim();
      const expr = pair.substring(eqIndex + 1).trim();
      action.fields[field] = expr;
    }
  }

  return action;
}

function parseHttp(line: string): Action {
  // http <METHOD> "<url>" [header <key>=<value>...] [body <json>] -> <varName>
  const match = line.match(/^http\s+(\w+)\s+"([^"]+)"(.*)$/);

  if (!match) {
    throw new Error(`Invalid http syntax: ${line}`);
  }

  const action: any = {
    type: 'http.call',
    method: match[1],
    url: match[2]
  };

  const rest = match[3].trim();
  const parts = rest.split(/\s+/);

  let i = 0;
  while (i < parts.length) {
    if (parts[i] === 'header') {
      i++;
      action.headers = action.headers || {};
      while (i < parts.length && parts[i].includes('=') && parts[i] !== '->') {
        const [key, val] = parts[i].split('=');
        action.headers[key] = val;
        i++;
      }
    } else if (parts[i] === 'body') {
      i++;
      // Collect body parts
      const bodyParts = [];
      while (i < parts.length && parts[i] !== '->') {
        bodyParts.push(parts[i]);
        i++;
      }
      action.body = parseObject(bodyParts.join(' '));
    } else if (parts[i] === '->') {
      i++;
      action.into = parts[i];
      break;
    } else {
      i++;
    }
  }

  return action;
}

function parseIf(lines: string[], startIdx: number): { action: Action; nextLine: number } {
  // if <condition>
  //   actions...
  // [else
  //   actions...]
  // endif
  const condition = lines[startIdx].trim().substring(3).trim(); // Remove 'if '

  const action: any = {
    type: 'condition',
    if: condition,  // Schema uses "if" not "condition"
    then: [],
    else: []
  };

  let i = startIdx + 1;
  let inElse = false;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (line === 'endif') {
      i++;
      break;
    } else if (line === 'else') {
      inElse = true;
      i++;
    } else if (line) {
      const result = parseAction(lines, i);
      if (inElse) {
        action.else.push(result.action);
      } else {
        action.then.push(result.action);
      }
      i = result.nextLine;
    } else {
      i++;
    }
  }

  return { action, nextLine: i };
}

function parseLoop(lines: string[], startIdx: number): { action: Action; nextLine: number } {
  // loop <array> as <item>
  //   actions...
  // endloop
  const match = lines[startIdx].trim().match(/^loop\s+(\S+)\s+as\s+(\w+)/);

  if (!match) {
    throw new Error(`Invalid loop syntax: ${lines[startIdx]}`);
  }

  const action: any = {
    type: 'loop',
    over: `{{${match[1]}}}`,  // Schema uses "over" not "array"
    as: match[2],              // Schema uses "as" not "item"
    actions: []
  };

  let i = startIdx + 1;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (line === 'endloop') {
      i++;
      break;
    } else if (line) {
      const result = parseAction(lines, i);
      action.actions.push(result.action);
      i = result.nextLine;
    } else {
      i++;
    }
  }

  return { action, nextLine: i };
}

function parseMap(line: string): Action {
  // map <array> as <item> -> <varName>(<field>=<expr>,...)
  const match = line.match(/^map\s+(\S+)\s+as\s+(\w+)\s+->\s+(\w+)\(([^)]+)\)/);

  if (!match) {
    throw new Error(`Invalid map syntax: ${line}`);
  }

  const sourceArray = match[1];
  const itemName = match[2];
  const targetVar = match[3];
  const mapContent = match[4];

  const map: any = {};
  const assignments = mapContent.split(',').map(s => s.trim());

  for (const assign of assignments) {
    const [field, expr] = assign.split('=').map(s => s.trim());
    map[field] = expr;
  }

  return {
    type: 'transform.array',
    source: `{{${sourceArray}}}`,
    itemName,
    map,
    into: targetVar
  };
}

function parseTransaction(lines: string[], startIdx: number): { action: Action; nextLine: number } {
  // tx begin
  //   actions...
  // tx end
  const action: any = {
    type: 'transaction',
    actions: []
  };

  let i = startIdx + 1;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (line === 'tx end') {
      i++;
      break;
    } else if (line) {
      const result = parseAction(lines, i);
      action.actions.push(result.action);
      i = result.nextLine;
    } else {
      i++;
    }
  }

  return { action, nextLine: i };
}

function parseParallel(lines: string[], startIdx: number): { action: Action; nextLine: number } {
  // parallel begin
  //   actions...
  // parallel end
  const action: any = {
    type: 'parallel',
    actions: []
  };

  let i = startIdx + 1;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (line === 'parallel end') {
      i++;
      break;
    } else if (line) {
      const result = parseAction(lines, i);
      action.actions.push(result.action);
      i = result.nextLine;
    } else {
      i++;
    }
  }

  return { action, nextLine: i };
}

function parseTry(lines: string[], startIdx: number): { action: Action; nextLine: number } {
  // try begin
  //   actions...
  // catch
  //   actions...
  // [finally
  //   actions...]
  // try end
  const action: any = {
    type: 'try',
    try: [],
    catch: [],
    finally: []
  };

  let i = startIdx + 1;
  let section: 'try' | 'catch' | 'finally' = 'try';

  while (i < lines.length) {
    const line = lines[i].trim();

    if (line === 'try end') {
      i++;
      break;
    } else if (line === 'catch') {
      section = 'catch';
      i++;
    } else if (line === 'finally') {
      section = 'finally';
      i++;
    } else if (line) {
      const result = parseAction(lines, i);
      action[section].push(result.action);
      i = result.nextLine;
    } else {
      i++;
    }
  }

  return { action, nextLine: i };
}

// Helper functions
function parseWhereClause(clause: string): any {
  // Simple parsing: field=value or field>=value or field in values
  const where: any = {};
  const parts = clause.split(/\s+/);

  for (const part of parts) {
    if (part.includes('=')) {
      const [field, value] = part.split('=');
      where[field] = value;
    }
  }

  return where;
}

function parseObject(str: string): any {
  // Parse key=value pairs into object
  const obj: any = {};
  const parts = str.split(/\s+/);

  for (const part of parts) {
    if (part.includes('=')) {
      const [key, val] = part.split('=');
      obj[key] = val;
    }
  }

  return obj;
}

function extractQuotedValue(line: string, prefix: string): string {
  const start = line.indexOf(prefix);
  if (start === -1) return '';

  const quoteStart = line.indexOf('"', start);
  if (quoteStart === -1) return '';

  const quoteEnd = line.indexOf('"', quoteStart + 1);
  if (quoteEnd === -1) return '';

  return line.substring(quoteStart + 1, quoteEnd);
}
