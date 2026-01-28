/**
 * Safe Expression Evaluator
 *
 * Evaluates expressions from API configs without using eval().
 * Supports:
 * - Comparisons: ==, !=, >, <, >=, <=
 * - Logical operators: AND, OR, NOT
 * - Member access: user.status, body.items[0].price
 * - Basic math: +, -, *, /, %
 *
 * Security: No arbitrary code execution, only whitelisted operations.
 */

type Value = string | number | boolean | null | undefined | object | any[];
type Context = Record<string, any>;

interface ComparisonCondition {
  field: string;
  operator: string;
  value: any;
}

/**
 * Evaluate a string expression safely
 */
export function evaluateExpression(expr: string, context: Context): boolean {
  // Parse and evaluate the expression
  const tokens = tokenize(expr);
  const ast = parse(tokens);
  return evaluate(ast, context) as boolean;
}

/**
 * Evaluate a condition object
 */
export function evaluateCondition(condition: ComparisonCondition | string, context: Context): boolean {
  if (typeof condition === 'string') {
    return evaluateExpression(condition, context);
  }

  // Object-style condition
  const { field, operator, value } = condition;
  const leftValue = resolveVariable(field, context);
  const rightValue = resolveValue(value, context);

  switch (operator) {
    case 'equals':
    case '==':
      return leftValue == rightValue;
    case 'not_equals':
    case '!=':
      return leftValue != rightValue;
    case 'greater_than':
    case '>':
      return (leftValue as number) > (rightValue as number);
    case 'less_than':
    case '<':
      return (leftValue as number) < (rightValue as number);
    case 'gte':
    case '>=':
      return (leftValue as number) >= (rightValue as number);
    case 'lte':
    case '<=':
      return (leftValue as number) <= (rightValue as number);
    case 'in':
      return Array.isArray(rightValue) && rightValue.includes(leftValue);
    case 'not_in':
      return Array.isArray(rightValue) && !rightValue.includes(leftValue);
    case 'contains':
      return String(leftValue).includes(String(rightValue));
    case 'starts_with':
      return String(leftValue).startsWith(String(rightValue));
    case 'ends_with':
      return String(leftValue).endsWith(String(rightValue));
    default:
      throw new Error(`Unknown operator: ${operator}`);
  }
}

/**
 * Resolve a variable path like "user.status" or "body.items[0].price"
 */
export function resolveVariable(path: string, context: Context): any {
  // Check for template syntax {{var}}
  if (path.startsWith('{{') && path.endsWith('}}')) {
    path = path.slice(2, -2).trim();
  }

  const parts = path.split('.');
  let value: any = context;

  for (const part of parts) {
    // Handle array indexing: items[0]
    const match = part.match(/^(\w+)\[(\d+)\]$/);
    if (match) {
      const [, key, index] = match;
      value = value?.[key]?.[parseInt(index)];
    } else {
      value = value?.[part];
    }

    if (value === undefined) {
      return undefined;
    }
  }

  return value;
}

/**
 * Resolve a value (which might be a variable reference or literal)
 */
function resolveValue(value: any, context: Context): any {
  if (typeof value === 'string' && (value.startsWith('{{') || value.includes('.'))) {
    return resolveVariable(value, context);
  }
  return value;
}

/**
 * Interpolate variables in a string template
 * Example: "Hello {{user.name}}" with context {user: {name: "John"}} -> "Hello John"
 */
export function interpolateString(template: string, context: Context): string {
  return template.replace(/\{\{(.+?)\}\}/g, (_, path) => {
    const value = resolveVariable(path.trim(), context);
    return value !== undefined ? String(value) : '';
  });
}

/**
 * Interpolate variables in an object (recursively)
 */
export function interpolateObject(obj: any, context: Context): any {
  if (typeof obj === 'string') {
    return interpolateString(obj, context);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => interpolateObject(item, context));
  }

  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = interpolateObject(value, context);
    }
    return result;
  }

  return obj;
}

/**
 * Calculate a mathematical expression
 */
export function calculate(expr: string, context: Context): number {
  const tokens = tokenize(expr);
  const ast = parse(tokens);
  return evaluate(ast, context) as number;
}

// ============================================================================
// TOKENIZER & PARSER (simple recursive descent parser)
// ============================================================================

enum TokenType {
  NUMBER,
  STRING,
  IDENTIFIER,
  OPERATOR,
  LPAREN,
  RPAREN,
  EOF
}

interface Token {
  type: TokenType;
  value: string | number;
}

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expr.length) {
    const char = expr[i];

    // Skip whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Numbers
    if (/\d/.test(char)) {
      let num = '';
      while (i < expr.length && /[\d.]/.test(expr[i])) {
        num += expr[i];
        i++;
      }
      tokens.push({ type: TokenType.NUMBER, value: parseFloat(num) });
      continue;
    }

    // Strings
    if (char === '"' || char === "'") {
      const quote = char;
      let str = '';
      i++; // skip opening quote
      while (i < expr.length && expr[i] !== quote) {
        str += expr[i];
        i++;
      }
      i++; // skip closing quote
      tokens.push({ type: TokenType.STRING, value: str });
      continue;
    }

    // Operators
    if ('+-*/%'.includes(char)) {
      tokens.push({ type: TokenType.OPERATOR, value: char });
      i++;
      continue;
    }

    // Comparison operators
    if (char === '>' || char === '<' || char === '=' || char === '!') {
      let op = char;
      i++;
      if (i < expr.length && expr[i] === '=') {
        op += '=';
        i++;
      }
      tokens.push({ type: TokenType.OPERATOR, value: op });
      continue;
    }

    // Parentheses
    if (char === '(') {
      tokens.push({ type: TokenType.LPAREN, value: '(' });
      i++;
      continue;
    }

    if (char === ')') {
      tokens.push({ type: TokenType.RPAREN, value: ')' });
      i++;
      continue;
    }

    // Identifiers (variable names, AND, OR, NOT)
    if (/[a-zA-Z_]/.test(char)) {
      let ident = '';
      while (i < expr.length && /[a-zA-Z0-9_.]/.test(expr[i])) {
        ident += expr[i];
        i++;
      }

      // AND, OR, NOT are operators
      if (['AND', 'OR', 'NOT'].includes(ident)) {
        tokens.push({ type: TokenType.OPERATOR, value: ident });
      } else {
        tokens.push({ type: TokenType.IDENTIFIER, value: ident });
      }
      continue;
    }

    throw new Error(`Unexpected character: ${char}`);
  }

  tokens.push({ type: TokenType.EOF, value: 'EOF' });
  return tokens;
}

interface ASTNode {
  type: 'number' | 'string' | 'identifier' | 'binary' | 'unary';
  value?: string | number;
  operator?: string;
  left?: ASTNode;
  right?: ASTNode;
  operand?: ASTNode;
}

function parse(tokens: Token[]): ASTNode {
  let pos = 0;

  function peek(): Token {
    return tokens[pos];
  }

  function consume(): Token {
    return tokens[pos++];
  }

  function parseExpression(): ASTNode {
    return parseLogicalOr();
  }

  function parseLogicalOr(): ASTNode {
    let left = parseLogicalAnd();

    while (peek().value === 'OR') {
      const operator = consume().value as string;
      const right = parseLogicalAnd();
      left = { type: 'binary', operator, left, right };
    }

    return left;
  }

  function parseLogicalAnd(): ASTNode {
    let left = parseComparison();

    while (peek().value === 'AND') {
      const operator = consume().value as string;
      const right = parseComparison();
      left = { type: 'binary', operator, left, right };
    }

    return left;
  }

  function parseComparison(): ASTNode {
    let left = parseAdditive();

    const compOps = ['==', '!=', '>', '<', '>=', '<='];
    while (compOps.includes(peek().value as string)) {
      const operator = consume().value as string;
      const right = parseAdditive();
      left = { type: 'binary', operator, left, right };
    }

    return left;
  }

  function parseAdditive(): ASTNode {
    let left = parseMultiplicative();

    while (peek().value === '+' || peek().value === '-') {
      const operator = consume().value as string;
      const right = parseMultiplicative();
      left = { type: 'binary', operator, left, right };
    }

    return left;
  }

  function parseMultiplicative(): ASTNode {
    let left = parseUnary();

    while (peek().value === '*' || peek().value === '/' || peek().value === '%') {
      const operator = consume().value as string;
      const right = parseUnary();
      left = { type: 'binary', operator, left, right };
    }

    return left;
  }

  function parseUnary(): ASTNode {
    if (peek().value === 'NOT') {
      const operator = consume().value as string;
      const operand = parseUnary();
      return { type: 'unary', operator, operand };
    }

    return parsePrimary();
  }

  function parsePrimary(): ASTNode {
    const token = peek();

    if (token.type === TokenType.NUMBER) {
      consume();
      return { type: 'number', value: token.value as number };
    }

    if (token.type === TokenType.STRING) {
      consume();
      return { type: 'string', value: token.value as string };
    }

    if (token.type === TokenType.IDENTIFIER) {
      consume();
      return { type: 'identifier', value: token.value as string };
    }

    if (token.type === TokenType.LPAREN) {
      consume(); // (
      const expr = parseExpression();
      consume(); // )
      return expr;
    }

    throw new Error(`Unexpected token: ${JSON.stringify(token)}`);
  }

  return parseExpression();
}

function evaluate(node: ASTNode, context: Context): Value {
  switch (node.type) {
    case 'number':
      return node.value as number;

    case 'string':
      return node.value as string;

    case 'identifier':
      return resolveVariable(node.value as string, context);

    case 'binary': {
      const left = evaluate(node.left!, context);
      const right = evaluate(node.right!, context);

      switch (node.operator) {
        case '+':
          return (left as number) + (right as number);
        case '-':
          return (left as number) - (right as number);
        case '*':
          return (left as number) * (right as number);
        case '/':
          return (left as number) / (right as number);
        case '%':
          return (left as number) % (right as number);
        case '==':
          return left == right;
        case '!=':
          return left != right;
        case '>':
          return (left as number) > (right as number);
        case '<':
          return (left as number) < (right as number);
        case '>=':
          return (left as number) >= (right as number);
        case '<=':
          return (left as number) <= (right as number);
        case 'AND':
          return Boolean(left) && Boolean(right);
        case 'OR':
          return Boolean(left) || Boolean(right);
        default:
          throw new Error(`Unknown operator: ${node.operator}`);
      }
    }

    case 'unary': {
      const operand = evaluate(node.operand!, context);
      switch (node.operator) {
        case 'NOT':
          return !Boolean(operand);
        default:
          throw new Error(`Unknown unary operator: ${node.operator}`);
      }
    }

    default:
      throw new Error(`Unknown node type: ${(node as any).type}`);
  }
}
