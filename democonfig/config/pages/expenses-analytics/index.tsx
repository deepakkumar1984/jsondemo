import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../src/client/components/ui/card';
import { Button } from '../../../src/client/components/ui/button';
import { Input } from '../../../src/client/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../src/client/components/ui/select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../../src/client/components/ui/table';
import api from '../../../src/client/lib/api';

export default function ExpensesAnalyticsPage() {
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [currency, setCurrency] = useState('USD');
  const [summary, setSummary] = useState<any>(null);
  const [timeseries, setTimeseries] = useState<any[]>([]);
  const [byCategory, setByCategory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = `?dateFrom=${dateFrom}&dateTo=${dateTo}&currency=${currency}`;
      const [summaryRes, timeseriesRes, byCategoryRes] = await Promise.all([
        api.get(`/expenses/summary${params}`),
        api.get(`/expenses/timeseries${params}`),
        api.get(`/expenses/by-category${params}`)
      ]);
      if (summaryRes.success) setSummary(summaryRes.data);
      if (timeseriesRes.success) setTimeseries(timeseriesRes.data || []);
      if (byCategoryRes.success) setByCategory(byCategoryRes.data || []);
    } catch (err) {
      setError('Failed to load data');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [dateFrom, dateTo, currency]);

  const setPreset = (preset: string) => {
    const now = new Date();
    let from: Date;
    switch (preset) {
      case 'thisMonth':
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'lastMonth':
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const to = new Date(now.getFullYear(), now.getMonth(), 0);
        setDateTo(to.toISOString().split('T')[0]);
        setDateFrom(from.toISOString().split('T')[0]);
        return;
      case 'ytd':
        from = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        return;
    }
    setDateFrom(from.toISOString().split('T')[0]);
    setDateTo(now.toISOString().split('T')[0]);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Expense Analytics</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div>
              <label className="text-sm font-medium">From</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">To</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Currency</label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setPreset('thisMonth')}>This Month</Button>
            <Button onClick={() => setPreset('lastMonth')}>Last Month</Button>
            <Button onClick={() => setPreset('ytd')}>YTD</Button>
          </div>
        </CardContent>
      </Card>
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Total Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{summary.total || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Average Expense</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{summary.average || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{summary.categories || 0}</p>
            </CardContent>
          </Card>
        </div>
      )}
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
              {timeseries.map((item: any, index: number) => (
                <TableRow key={index}>
                  <TableCell>{item.date}</TableCell>
                  <TableCell>{item.amount}</TableCell>
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
              {byCategory.map((item: any, index: number) => (
                <TableRow key={index}>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{item.amount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}