export const generateInsightsPrompt = (
  data: any[],
  columns: string[],
  originalQuery: string,
): string => {
  // Sample a subset of data for analysis (first 100 rows)
  const sampleData = data.slice(0, 100);
  const dataPreview = JSON.stringify(sampleData, null, 2);

  return `Analyze the following query results and provide insights in plain text format.

Original Question: ${originalQuery}

Columns: ${columns.join(', ')}

Data Sample (first ${sampleData.length} rows):
${dataPreview}

Total Rows: ${data.length}

Please provide insights in the following format (use plain text, NO markdown symbols like *, #, or ###):

Key Insights and Patterns:
[Provide key insights and patterns in the data]

Notable Statistics or Trends:
[Provide notable statistics or trends]

Anomalies or Interesting Observations:
[Provide any anomalies or interesting observations]

Recommendations:
[Provide recommendations based on the data]

IMPORTANT: 
- Use plain text only, NO markdown formatting
- NO asterisks (*), hash symbols (#), or other markdown characters
- Use bold text indicators like "Key Term:" format for emphasis
- Keep the response concise and actionable
- Use clear section headers followed by content`;
};

