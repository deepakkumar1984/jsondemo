import { Hono } from 'hono';
import type { Env } from '../../src/types';
import { createDataClient } from '../../src/db/data-client';

export const analyticsRouter = new Hono<{ Bindings: Env }>();

// Helper function to get date range, defaulting to last 30 days
function getDateRange(dateFrom?: string, dateTo?: string) {
  const now = new Date();
  const from = dateFrom ? new Date(dateFrom) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const to = dateTo ? new Date(dateTo) : now;
  return { from: from.toISOString(), to: to.toISOString() };
}

// Helper function to group and count
function groupByCount(data: any[], key: string) {
  const counts: { [key: string]: number } = {};
  data.forEach(item => {
    const value = item[key];
    counts[value] = (counts[value] || 0) + 1;
  });
  return counts;
}

// Helper function for trend data (daily buckets)
function trendData(data: any[], dateField: string, from: string, to: string) {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const days = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
  const labels = [];
  const series = [];
  for (let i = 0; i <= days; i++) {
    const date = new Date(fromDate.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    labels.push(dateStr);
    const count = data.filter(item => new Date(item[dateField]).toISOString().split('T')[0] === dateStr).length;
    series.push(count);
  }
  return { labels, series };
}

analyticsRouter.get('/tasksByStatus', async (c) => {
  const client = createDataClient(c.env);
  const projectId = c.req.query('projectId');
  const { from, to } = getDateRange(c.req.query('dateFrom'), c.req.query('dateTo'));

  try {
    const filter: any = {
      created_at: { _gte: from, _lte: to }
    };
    if (projectId) filter.project_id = { _eq: projectId };

    const tasks = await client.getItems('tasks', { filter });
    const counts = groupByCount(tasks.data, 'status');
    const labels = Object.keys(counts);
    const series = Object.values(counts);

    return c.json({ success: true, data: { labels, series } });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }
});

analyticsRouter.get('/tasksCreatedTrend', async (c) => {
  const client = createDataClient(c.env);
  const projectId = c.req.query('projectId');
  const { from, to } = getDateRange(c.req.query('dateFrom'), c.req.query('dateTo'));

  try {
    const filter: any = {
      created_at: { _gte: from, _lte: to }
    };
    if (projectId) filter.project_id = { _eq: projectId };

    const tasks = await client.getItems('tasks', { filter });
    const { labels, series } = trendData(tasks.data, 'created_at', from, to);

    return c.json({ success: true, data: { labels, series } });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }
});

analyticsRouter.get('/tasksCompletedTrend', async (c) => {
  const client = createDataClient(c.env);
  const projectId = c.req.query('projectId');
  const { from, to } = getDateRange(c.req.query('dateFrom'), c.req.query('dateTo'));

  try {
    const filter: any = {
      completed_at: { _gte: from, _lte: to, _null: false }
    };
    if (projectId) filter.project_id = { _eq: projectId };

    const tasks = await client.getItems('tasks', { filter });
    const { labels, series } = trendData(tasks.data, 'completed_at', from, to);

    return c.json({ success: true, data: { labels, series } });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }
});

analyticsRouter.get('/overdueCounts', async (c) => {
  const client = createDataClient(c.env);
  const projectId = c.req.query('projectId');
  const { from, to } = getDateRange(c.req.query('dateFrom'), c.req.query('dateTo'));
  const now = new Date().toISOString();

  try {
    const filter: any = {
      status: { _ne: 'Done' },
      due_date: { _lt: now, _gte: from, _lte: to, _null: false }
    };
    if (projectId) filter.project_id = { _eq: projectId };

    const tasks = await client.getItems('tasks', { filter });
    const counts = groupByCount(tasks.data, 'priority');
    const labels = Object.keys(counts);
    const series = Object.values(counts);

    return c.json({ success: true, data: { labels, series } });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }
});

analyticsRouter.get('/assigneeWorkload', async (c) => {
  const client = createDataClient(c.env);
  const projectId = c.req.query('projectId');
  const { from, to } = getDateRange(c.req.query('dateFrom'), c.req.query('dateTo'));

  try {
    const filter: any = {
      status: { _ne: 'Done' },
      created_at: { _gte: from, _lte: to }
    };
    if (projectId) filter.project_id = { _eq: projectId };

    const tasks = await client.getItems('tasks', { filter });
    const grouped: { [assignee: string]: { [status: string]: number } } = {};
    tasks.data.forEach(task => {
      const assignee = task.assignee_user_id || 'Unassigned';
      const status = task.status;
      if (!grouped[assignee]) grouped[assignee] = {};
      grouped[assignee][status] = (grouped[assignee][status] || 0) + 1;
    });

    const labels = Object.keys(grouped);
    const series = Object.values(grouped).map(statusCounts => Object.values(statusCounts));

    return c.json({ success: true, data: { labels, series } });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }
});