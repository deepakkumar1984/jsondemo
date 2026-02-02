/**
 * Schema DSL Parser
 *
 * Converts Schema DSL → JSON format matching schema-format.json
 *
 * DSL Format:
 *   table <name> "<description>"
 *     <name> <type> [!] [pk] [unique] [default=<val>] [uuid] [desc="..."] [-> <table>.<col> <action>]
 *
 *   index <name> [unique] <col1>[,<col2>,...]
 */

interface Column {
  name: string;
  type: string;
  primaryKey?: boolean;
  notNull?: boolean;
  unique?: boolean;
  default?: string | number | boolean;
  defaultFn?: string;
  description?: string;
  references?: {
    table: string;
    column: string;
    onDelete?: string;
  };
}

interface Index {
  name: string;
  columns: string[];
  unique?: boolean;
}

interface SchemaConfig {
  table: string;
  description?: string;
  columns: Column[];
  indexes?: Index[];
}

export function parseSchema(dsl: string): SchemaConfig {
  const lines = dsl.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));

  const config: SchemaConfig = {
    table: '',
    columns: [],
    indexes: []
  };

  let i = 0;

  // Parse table declaration
  if (lines[i].startsWith('table ')) {
    const tableLine = lines[i].substring(6); // Remove 'table '
    const match = tableLine.match(/^(\w+)(?:\s+"([^"]*)")?/);

    if (!match) {
      throw new Error(`Invalid table declaration: ${lines[i]}`);
    }

    config.table = match[1];
    if (match[2]) {
      config.description = match[2];
    }
    i++;
  } else {
    throw new Error(`Expected table declaration, got: ${lines[i]}`);
  }

  // Parse columns and indexes
  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('index ')) {
      // Parse index
      const index = parseIndex(line);
      config.indexes!.push(index);
    } else {
      // Parse column
      const column = parseColumn(line);
      config.columns.push(column);
    }

    i++;
  }

  return config;
}

function parseColumn(line: string): Column {
  const parts = line.split(/\s+/);

  if (parts.length < 2) {
    throw new Error(`Invalid column definition: ${line}`);
  }

  // Handle type with attached ! modifier (e.g., "text!" → type="text", notNull=true)
  let type = parts[1];
  let notNull = false;
  if (type.endsWith('!')) {
    type = type.slice(0, -1);
    notNull = true;
  }

  const column: Column = {
    name: parts[0],
    type: type
  };

  if (notNull) {
    column.notNull = true;
  }

  let i = 2;
  while (i < parts.length) {
    const part = parts[i];

    if (part === '!') {
      column.notNull = true;
    } else if (part === 'pk') {
      column.primaryKey = true;
    } else if (part === 'unique') {
      column.unique = true;
    } else if (part === 'uuid') {
      column.defaultFn = 'uuid';
    } else if (part.startsWith('default=')) {
      const value = part.substring(8);
      column.default = parseValue(value);
    } else if (part.startsWith('desc=')) {
      // Extract quoted description
      const descStart = line.indexOf('desc="');
      if (descStart !== -1) {
        const descEnd = line.indexOf('"', descStart + 6);
        if (descEnd !== -1) {
          column.description = line.substring(descStart + 6, descEnd);
        }
      }
      break; // Description is last, skip to reference parsing
    } else if (part === '->') {
      // Parse foreign key reference
      i++;
      if (i >= parts.length) {
        throw new Error(`Missing reference target after ->: ${line}`);
      }

      const refParts = parts[i].split('.');
      if (refParts.length !== 2) {
        throw new Error(`Invalid reference format: ${parts[i]}`);
      }

      column.references = {
        table: refParts[0],
        column: refParts[1]
      };

      // Check for onDelete action
      i++;
      if (i < parts.length && !parts[i].startsWith('desc=')) {
        const action = parts[i];
        if (action === 'cascade' || action === 'set_null' || action === 'restrict' || action === 'no_action') {
          column.references.onDelete = action === 'set_null' ? 'set null' :
                                       action === 'no_action' ? 'no action' : action;
        }
      }
      break; // Reference is typically last
    }

    i++;
  }

  return column;
}

function parseIndex(line: string): Index {
  // index <name> [unique] <col1>[,<col2>,...]
  const parts = line.substring(6).trim().split(/\s+/); // Remove 'index '

  if (parts.length < 2) {
    throw new Error(`Invalid index definition: ${line}`);
  }

  const index: Index = {
    name: parts[0],
    columns: []
  };

  let i = 1;

  if (parts[i] === 'unique') {
    index.unique = true;
    i++;
  }

  // Parse column list (may be comma-separated in single part)
  const colList = parts.slice(i).join(' ');
  index.columns = colList.split(',').map(c => c.trim());

  return index;
}

function parseValue(str: string): string | number | boolean {
  // Remove quotes if present
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    return str.slice(1, -1);
  }

  // Check for boolean
  if (str === 'true') return true;
  if (str === 'false') return false;

  // Check for number
  const num = Number(str);
  if (!isNaN(num)) return num;

  // Return as string (for CURRENT_TIMESTAMP, etc.)
  return str;
}
