export const generateNLToSQLPrompt = (
  naturalLanguageQuery: string,
  schemaContext: string,
  examples?: string[],
): string => {
  const examplesSection = examples
    ? `\n\nHere are some examples:\n${examples.map((ex) => `- ${ex}`).join('\n')}`
    : '';

  return `You are a SQL expert. Convert the following natural language question into a safe, optimized SQL query.

Database Schema:
${schemaContext}
${examplesSection}

Natural Language Query: ${naturalLanguageQuery}

Requirements:
1. Generate ONLY valid SQL (PostgreSQL syntax)
2. Do NOT include any explanations or markdown formatting
3. Use proper table and column names from the schema
4. Include appropriate JOINs when needed
5. Use parameterized queries where possible (use $1, $2, etc. for parameters)
6. Do NOT include any destructive operations (DROP, DELETE, UPDATE, TRUNCATE, ALTER)
7. Only SELECT queries are allowed
8. Ensure the query is optimized and uses indexes when available

SQL Query:`;
};

