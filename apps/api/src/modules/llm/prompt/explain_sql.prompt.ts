export const generateExplainSQLPrompt = (sqlQuery: string): string => {
  return `Explain the following SQL query in plain English. Describe what data it retrieves and what the query does.

SQL Query:
${sqlQuery}

Explanation:`;
};

