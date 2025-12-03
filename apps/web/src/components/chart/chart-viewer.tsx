'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@askdb/ui';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ChartViewerProps {
  data: any[];
  columns: string[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function ChartViewer({ data, columns }: ChartViewerProps) {
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');
  const [xAxis, setXAxis] = useState<string>(columns[0] || '');
  const [yAxis, setYAxis] = useState<string>(columns[1] || '');

  if (data.length === 0 || columns.length < 2) {
    return null;
  }

  const numericColumns = columns.filter((col) => {
    return data.some((row) => {
      const value = row[col];
      return typeof value === 'number' || (!isNaN(Number(value)) && value !== null);
    });
  });

  const chartData = data.map((row) => ({
    ...row,
    [xAxis]: row[xAxis] !== null && row[xAxis] !== undefined ? String(row[xAxis]) : 'N/A',
    [yAxis]:
      row[yAxis] !== null && row[yAxis] !== undefined ? Number(row[yAxis]) || 0 : 0,
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Data Visualization</CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={chartType === 'bar' ? 'default' : 'outline'}
              onClick={() => setChartType('bar')}
            >
              Bar
            </Button>
            <Button
              size="sm"
              variant={chartType === 'line' ? 'default' : 'outline'}
              onClick={() => setChartType('line')}
            >
              Line
            </Button>
            <Button
              size="sm"
              variant={chartType === 'pie' ? 'default' : 'outline'}
              onClick={() => setChartType('pie')}
            >
              Pie
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">X-Axis</label>
              <select
                value={xAxis}
                onChange={(e) => setXAxis(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              >
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>
            {chartType !== 'pie' && (
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Y-Axis</label>
                <select
                  value={yAxis}
                  onChange={(e) => setYAxis(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  {numericColumns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={xAxis} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey={yAxis} fill={COLORS[0]} />
                </BarChart>
              ) : chartType === 'line' ? (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={xAxis} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey={yAxis} stroke={COLORS[0]} />
                </LineChart>
              ) : (
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey={yAxis}
                    nameKey={xAxis}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

