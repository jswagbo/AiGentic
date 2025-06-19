// Simple expression evaluator for workflow conditions
// In production, consider using a proper expression library like expr-eval

export function evaluateExpression(expression: string, context: Record<string, any>): boolean {
  try {
    // Clean the expression
    const cleanExpr = expression.trim();
    
    // Handle simple boolean values
    if (cleanExpr === 'true') return true;
    if (cleanExpr === 'false') return false;
    
    // Handle variable references
    if (cleanExpr in context) {
      return Boolean(context[cleanExpr]);
    }
    
    // Handle equality comparisons
    const equalityMatch = cleanExpr.match(/^(.+?)\s*===\s*(.+)$/);
    if (equalityMatch) {
      const [, left, right] = equalityMatch;
      const leftValue = resolveValue(left.trim(), context);
      const rightValue = resolveValue(right.trim(), context);
      return leftValue === rightValue;
    }
    
    // Handle inequality comparisons
    const inequalityMatch = cleanExpr.match(/^(.+?)\s*!==\s*(.+)$/);
    if (inequalityMatch) {
      const [, left, right] = inequalityMatch;
      const leftValue = resolveValue(left.trim(), context);
      const rightValue = resolveValue(right.trim(), context);
      return leftValue !== rightValue;
    }
    
    // Handle greater than
    const gtMatch = cleanExpr.match(/^(.+?)\s*>\s*(.+)$/);
    if (gtMatch) {
      const [, left, right] = gtMatch;
      const leftValue = Number(resolveValue(left.trim(), context));
      const rightValue = Number(resolveValue(right.trim(), context));
      return leftValue > rightValue;
    }
    
    // Handle less than
    const ltMatch = cleanExpr.match(/^(.+?)\s*<\s*(.+)$/);
    if (ltMatch) {
      const [, left, right] = ltMatch;
      const leftValue = Number(resolveValue(left.trim(), context));
      const rightValue = Number(resolveValue(right.trim(), context));
      return leftValue < rightValue;
    }
    
    // Handle greater than or equal
    const gteMatch = cleanExpr.match(/^(.+?)\s*>=\s*(.+)$/);
    if (gteMatch) {
      const [, left, right] = gteMatch;
      const leftValue = Number(resolveValue(left.trim(), context));
      const rightValue = Number(resolveValue(right.trim(), context));
      return leftValue >= rightValue;
    }
    
    // Handle less than or equal
    const lteMatch = cleanExpr.match(/^(.+?)\s*<=\s*(.+)$/);
    if (lteMatch) {
      const [, left, right] = lteMatch;
      const leftValue = Number(resolveValue(left.trim(), context));
      const rightValue = Number(resolveValue(right.trim(), context));
      return leftValue <= rightValue;
    }
    
    // Handle logical AND
    const andMatch = cleanExpr.match(/^(.+?)\s*&&\s*(.+)$/);
    if (andMatch) {
      const [, left, right] = andMatch;
      return evaluateExpression(left.trim(), context) && evaluateExpression(right.trim(), context);
    }
    
    // Handle logical OR
    const orMatch = cleanExpr.match(/^(.+?)\s*\|\|\s*(.+)$/);
    if (orMatch) {
      const [, left, right] = orMatch;
      return evaluateExpression(left.trim(), context) || evaluateExpression(right.trim(), context);
    }
    
    // Handle NOT
    const notMatch = cleanExpr.match(/^!\s*(.+)$/);
    if (notMatch) {
      const [, operand] = notMatch;
      return !evaluateExpression(operand.trim(), context);
    }
    
    // Handle parentheses (simple case)
    const parenMatch = cleanExpr.match(/^\((.+)\)$/);
    if (parenMatch) {
      const [, inner] = parenMatch;
      return evaluateExpression(inner.trim(), context);
    }
    
    // If no pattern matches, try to resolve as a variable and convert to boolean
    const value = resolveValue(cleanExpr, context);
    return Boolean(value);
    
  } catch (error) {
    console.warn(`Expression evaluation failed: ${expression}`, error);
    return false;
  }
}

function resolveValue(value: string, context: Record<string, any>): any {
  // Remove quotes if present
  if ((value.startsWith('"') && value.endsWith('"')) || 
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  
  // Handle dot notation for nested properties
  if (value.includes('.')) {
    const parts = value.split('.');
    let current = context;
    
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    
    return current;
  }
  
  // Check if it's a variable in context
  if (value in context) {
    return context[value];
  }
  
  // Try parsing as number
  const numberValue = Number(value);
  if (!isNaN(numberValue)) {
    return numberValue;
  }
  
  // Try parsing as boolean
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  if (value === 'undefined') return undefined;
  
  // Return as string
  return value;
}

// Helper functions for common condition patterns
export function createCondition(pattern: string, ...args: any[]): string {
  switch (pattern) {
    case 'equals':
      return `${args[0]} === ${JSON.stringify(args[1])}`;
    case 'not_equals':
      return `${args[0]} !== ${JSON.stringify(args[1])}`;
    case 'greater_than':
      return `${args[0]} > ${args[1]}`;
    case 'less_than':
      return `${args[0]} < ${args[1]}`;
    case 'contains':
      return `${args[0]}.includes(${JSON.stringify(args[1])})`;
    case 'exists':
      return `${args[0]} !== undefined && ${args[0]} !== null`;
    case 'not_exists':
      return `${args[0]} === undefined || ${args[0]} === null`;
    default:
      throw new Error(`Unknown condition pattern: ${pattern}`);
  }
}

// Validate expression syntax (basic check)
export function validateExpression(expression: string): boolean {
  try {
    // Check for balanced parentheses
    let parenCount = 0;
    for (const char of expression) {
      if (char === '(') parenCount++;
      if (char === ')') parenCount--;
      if (parenCount < 0) return false;
    }
    if (parenCount !== 0) return false;
    
    // Check for dangerous patterns (basic security)
    const dangerousPatterns = [
      /\beval\b/,
      /\bFunction\b/,
      /\bsetTimeout\b/,
      /\bsetInterval\b/,
      /\brequire\b/,
      /\bimport\b/,
      /\bprocess\b/,
      /\b__dirname\b/,
      /\b__filename\b/
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(expression)) {
        return false;
      }
    }
    
    return true;
  } catch {
    return false;
  }
} 