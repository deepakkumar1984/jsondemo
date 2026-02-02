/**
 * Page DSL Parser
 *
 * Converts Page DSL → JSON format matching page-format.json
 *
 * DSL Format:
 *   page <pageName>
 *     datasource <name> "<url>"
 *
 *     <Component> [props...]
 *       <ChildComponent> [props...]
 */

interface PageConfig {
  dataSources?: Record<string, { url: string }>;
  children: Component[];
}

interface Component {
  type: string;
  props?: Record<string, any>;
  children?: Component[];
}

export function parsePage(dsl: string): PageConfig {
  const lines = dsl.split('\n').filter(l => l && !l.trim().startsWith('#'));

  const config: PageConfig = {
    children: []
  };

  let i = 0;

  // Parse page declaration
  if (lines[i].trim().startsWith('page ')) {
    i++;
  }

  // Parse datasources and components
  while (i < lines.length) {
    const line = lines[i];
    const indent = getIndent(line);
    const trimmed = line.trim();

    if (trimmed.startsWith('datasource ')) {
      // Parse datasource
      const match = trimmed.match(/^datasource\s+(\w+)\s+"([^"]+)"/);
      if (match) {
        if (!config.dataSources) {
          config.dataSources = {};
        }
        config.dataSources[match[1]] = { url: match[2] };
      }
      i++;
    } else if (trimmed) {
      // Parse component
      const result = parseComponent(lines, i, 0);
      if (result.component) {
        config.children.push(result.component);
      }
      i = result.nextLine;
    } else {
      i++;
    }
  }

  return config;
}

function parseComponent(lines: string[], startIdx: number, baseIndent: number): { component: Component | null; nextLine: number } {
  const line = lines[startIdx];
  const indent = getIndent(line);

  if (indent < baseIndent) {
    return { component: null, nextLine: startIdx };
  }

  const trimmed = line.trim();

  // Skip datasource declarations
  if (trimmed.startsWith('datasource ') || trimmed.startsWith('page ')) {
    return { component: null, nextLine: startIdx + 1 };
  }

  // Parse component type and props (respecting quoted strings)
  const parts = smartSplit(trimmed);
  const componentType = parts[0];

  const component: Component = {
    type: componentType,
    props: {}
  };

  // Parse props
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];

    if (part.includes('=')) {
      const eqIndex = part.indexOf('=');
      const key = part.substring(0, eqIndex);
      const value = part.substring(eqIndex + 1);
      component.props![key] = parseValue(value);
    } else {
      // Handle special cases like col definitions in DataTable
      if (componentType === 'DataTable' && part === 'col') {
        // col <key> "<header>" [format=...] [action=...]
        // This will be parsed separately
        break;
      }
    }
  }

  let i = startIdx + 1;

  // Parse children
  component.children = [];

  while (i < lines.length) {
    const childLine = lines[i];
    const childIndent = getIndent(childLine);
    const childTrimmed = childLine.trim();

    if (childIndent <= indent) {
      // End of this component's children
      break;
    }

    // Handle special column syntax for DataTable
    if (childTrimmed.startsWith('col ')) {
      const colResult = parseColumn(childTrimmed);
      if (colResult) {
        if (!component.props!.columns) {
          component.props!.columns = [];
        }
        component.props!.columns.push(colResult);
      }
      i++;
    }
    // Handle option syntax for SelectField
    else if (childTrimmed.startsWith('option ')) {
      const optionResult = parseOption(childTrimmed);
      if (optionResult) {
        if (!component.props!.options) {
          component.props!.options = [];
        }
        component.props!.options.push(optionResult);
      }
      i++;
    }
    // Parse nested component
    else if (childTrimmed) {
      const result = parseComponent(lines, i, indent + 1);
      if (result.component) {
        component.children.push(result.component);
      }
      i = result.nextLine;
    } else {
      i++;
    }
  }

  // Clean up empty children array
  if (component.children && component.children.length === 0) {
    delete component.children;
  }

  // Clean up empty props
  if (component.props && Object.keys(component.props).length === 0) {
    delete component.props;
  }

  return { component, nextLine: i };
}

function parseColumn(line: string): any {
  // col <key> "<header>" [format=...] [action=...] [badge] [suffix="..."]
  const parts = line.substring(4).trim().split(/\s+/);

  const col: any = {
    key: parts[0]
  };

  // Check for quoted header
  const headerMatch = line.match(/"([^"]+)"/);
  if (headerMatch) {
    col.header = headerMatch[1];
  }

  // Parse additional props
  for (const part of parts) {
    if (part.includes('=')) {
      const [key, value] = part.split('=');
      col[key] = parseValue(value);
    } else if (part === 'badge') {
      col.badge = true;
    }
  }

  return col;
}

function parseOption(line: string): any {
  // option value="..." label="..."
  const option: any = {};

  const valueMatch = line.match(/value="([^"]+)"/);
  if (valueMatch) {
    option.value = valueMatch[1];
  }

  const labelMatch = line.match(/label="([^"]+)"/);
  if (labelMatch) {
    option.label = labelMatch[1];
  }

  return option;
}

function getIndent(line: string): number {
  return line.search(/\S/);
}

function parseValue(str: string): any {
  // Handle quoted strings
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    return str.slice(1, -1);
  }

  // Handle template expressions
  if (str.startsWith('{{') && str.endsWith('}}')) {
    return str; // Keep as-is for template interpolation
  }

  // Handle boolean
  if (str === 'true') return true;
  if (str === 'false') return false;

  // Handle number
  const num = Number(str);
  if (!isNaN(num)) return num;

  // Handle action syntax (navigate:/path, submit_form:id, etc.)
  if (str.includes(':')) {
    return str; // Keep as string for action parsing
  }

  // Return as string
  return str;
}

function smartSplit(line: string): string[] {
  // Split by spaces but respect quoted strings
  // Example: 'PageHeader title="Hello World" subtitle="Welcome"'
  // Returns: ['PageHeader', 'title="Hello World"', 'subtitle="Welcome"']
  const parts: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if (char === ' ' && !inQuotes) {
      if (current.trim()) {
        parts.push(current.trim());
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}
