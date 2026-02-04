import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../../src/client/components/ui/card';
import { Button } from '../../../src/client/components/ui/button';
import { Input } from '../../../src/client/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../src/client/components/ui/select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../../src/client/components/ui/table';

export default function ExpensesAnalyticsPage() {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState<string>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [currency, setCurrency] = useState<string>('USD');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Static data since no APIs exist
  const summaryMetrics = [
    { label: 'Total Expenses', value: '$12,345.67' },
    { label: 'Average Expense', value: '$123.45' },
    { label: 'Top Category', value: 'Travel' },
  ];

  const timeseriesData = [
    { date: '2023-10-01', amount: 1000 },
    { date: '2023-10-02', amount: 1500 },
    // Add more static data as needed
  ];

  const byCategoryData = [
    { category: 'Food', amount: 3000 },
    { category: 'Travel', amount: 5000 },
    { category: 'Office', amount: 4345.67 },
  ];

  const handlePreset = (preset: string) => {
    const now = new Date();
    let start: Date;
    switch (preset) {
      case 'This month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'Last month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        setEndDate(endLastMonth.toISOString().split('T')[0]);
        break;
      case 'YTD':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        return;
    }
    setStartDate(start.toISOString().split('T')[0]);
    // Simulate refresh (no actual data refresh since no APIs)
  };

  useEffect(() => {
    // No API calls, so just set loading to false
    setLoading(false);
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Expense Analytics</h1>
      </div>
      <div className="flex space-x-4 items-center">
        <label>Start Date:</label>
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <label>End Date:</label>
        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <Select value={currency} onValueChange={setCurrency}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="USD">USD</SelectItem>
            <SelectItem value="EUR">EUR</SelectItem>
            <SelectItem value="GBP">GBP</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => handlePreset('This month')}>This month</Button>
        <Button onClick={() => handlePreset('Last month')}>Last month</Button>
        <Button onClick={() => handlePreset('YTD')}>YTD</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {summaryMetrics.map((metric: any, index: number) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle>{metric.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{metric.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Expenses Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeseriesData.map((item: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>{item.date}</TableCell>
                    <TableCell>${item.amount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byCategoryData.map((item: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>${item.amount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}