export const generateInsightsPrompt = (
  data: any[],
  columns: string[],
  originalQuery: string,
): string => {
  // Sample a subset of data for analysis (first 100 rows)
  const sampleData = data.slice(0, 100);
  const dataPreview = JSON.stringify(sampleData, null, 2);

  return `Analyze the following query results and provide insights.

Original Question: ${originalQuery}

Columns: ${columns.join(', ')}

Data Sample (first ${sampleData.length} rows):
${dataPreview}

Total Rows: ${data.length}

Please provide:
1. Key insights and patterns in the data
2. Notable statistics or trends
3. Any anomalies or interesting observations
4. Recommendations based on the data

Keep the response concise and actionable.`;
};

