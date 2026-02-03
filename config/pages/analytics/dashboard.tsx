import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../src/client/components/ui/card';
import { Button } from '../../../src/client/components/ui/button';
import { Input } from '../../../src/client/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../src/client/components/ui/select';
import api from '../../../src/client/lib/api';

export default function AnalyticsDashboardPage() {
  const [filters, setFilters] = useState({
    projectId: 'currentProjectId', // Assuming this is set somehow, e.g., from context or params
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    assignee: ''
  });
  const [kpis, setKpis] = useState<any>({});
  const [charts, setCharts] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        projectId: filters.projectId === 'all' ? '' : filters.projectId,
        startDate: filters.startDate,
        endDate: filters.endDate,
        assignee: filters.assignee
      }).toString();

      // Fetch KPIs
      const [tasksByStatusRes, createdTrendRes, completedTrendRes, overdueCountsRes, assigneeWorkloadRes, cycleTimeRes] = await Promise.all([
        api.get(`/analytics/tasks-by-status?${params}`),
        api.get(`/analytics/tasks-created-trend?${params}`),
        api.get(`/analytics/tasks-completed-trend?${params}`),
        api.get(`/analytics/overdue-counts?${params}`),
        api.get(`/analytics/assignee-workload?${params}`),
        api.get(`/cycles/cycle-time?${params}`)
      ]);

      if (!tasksByStatusRes.success || !createdTrendRes.success || !completedTrendRes.success || !overdueCountsRes.success || !assigneeWorkloadRes.success || !cycleTimeRes.success) {
        throw new Error('Failed to fetch analytics data');
      }

      // Calculate KPIs from responses
      const tasksByStatus = tasksByStatusRes.data || {};
      const openTasks = tasksByStatus.Todo || 0;
      const completedInRange = completedTrendRes.data?.reduce((sum: number, item: any) => sum + item.count, 0) || 0;
      const overdueOpen = overdueCountsRes.data?.open || 0;
      const avgCycleTime = cycleTimeRes.data?.average || 0;

      setKpis({
        openTasks,
        completedInRange,
        overdueOpen,
        avgCycleTime
      });

      setCharts({
        tasksByStatus,
        createdTrend: createdTrendRes.data || [],
        completedTrend: completedTrendRes.data || [],
        assigneeWorkload: assigneeWorkloadRes.data || [],
        overdueByPriority: overdueCountsRes.data?.byPriority || {}
      });
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value });
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
      
      {/* Filter Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="text-sm font-medium">Project</label>
              <Select value={filters.projectId} onValueChange={(val) => handleFilterChange('projectId', val)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  <SelectItem value="currentProjectId">Current Project</SelectItem>
                  {/* Add more projects if available */}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Assignee (Optional)</label>
              <Input
                placeholder="Assignee ID"
                value={filters.assignee}
                onChange={(e) => handleFilterChange('assignee', e.target.value)}
              />
            </div>
            <Button onClick={fetchData} className="self-end">Apply Filters</Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Open Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{kpis.openTasks}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Completed in Range</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{kpis.completedInRange}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Overdue Open</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{kpis.overdueOpen}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Avg Cycle Time</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{kpis.avgCycleTime} days</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts - Using placeholders since chart components are not available */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tasks by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <pre>{JSON.stringify(charts.tasksByStatus, null, 2)}</pre>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Created vs Completed Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div>Created: {JSON.stringify(charts.createdTrend)}</div>
            <div>Completed: {JSON.stringify(charts.completedTrend)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Assignee Workload</CardTitle>
          </CardHeader>
          <CardContent>
            <pre>{JSON.stringify(charts.assigneeWorkload, null, 2)}</pre>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Overdue by Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <pre>{JSON.stringify(charts.overdueByPriority, null, 2)}</pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}