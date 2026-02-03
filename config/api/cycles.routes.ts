import { Hono } from 'hono';
import { createDataClient } from '../../src/db/data-client';

export const analyticsRouter = new Hono<{ Bindings: Env }>();

// GET /analytics/cycle-time
// Computes average, median cycle time from start to completion, with distribution buckets.
// Cycle time start: start_date if present, else first StatusChanged to InProgress from task_activities.
// Query params: project_id (optional), start_date (ISO string), end_date (ISO string)
analyticsRouter.get('/cycle-time', async (c) => {
  const client = createDataClient(c.env);
  const { project_id, start_date, end_date } = c.req.query();

  // Validation
  if (start_date && isNaN(Date.parse(start_date))) {
    return c.json({ success: false, error: { message: 'Invalid start_date format', status: 400 } }, 400);
  }
  if (end_date && isNaN(Date.parse(end_date))) {
    return c.json({ success: false, error: { message: 'Invalid end_date format', status: 400 } }, 400);
  }
  if (project_id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(project_id)) {
    return c.json({ success: false, error: { message: 'Invalid project_id format', status: 400 } }, 400);
  }

  try {
    // Fetch tasks with completed_at not null, within date range if provided
    const filter: any = { completed_at: { _null: false } };
    if (start_date) filter.created_at = { _gte: start_date };
    if (end_date) filter.created_at = { ...filter.created_at, _lte: end_date };
    if (project_id) filter.project_id = { _eq: project_id };

    const tasksResponse = await client.getItems('tasks', { filter, fields: ['id', 'start_date', 'completed_at'] });
    const tasks = tasksResponse.data;

    const cycleTimes: number[] = [];

    for (const task of tasks) {
      let startTime: Date | null = task.start_date ? new Date(task.start_date) : null;
      if (!startTime) {
        // Fallback: first StatusChanged to InProgress
        const activitiesResponse = await client.getItems('task_activities', {
          filter: { task_id: { _eq: task.id }, event_type: { _eq: 'StatusChanged' }, to_value: { _eq: 'InProgress' } },
          sort: ['created_at'],
          limit: 1,
          fields: ['created_at']
        });
        if (activitiesResponse.data.length > 0) {
          startTime = new Date(activitiesResponse.data[0].created_at);
        }
      }
      if (startTime) {
        const endTime = new Date(task.completed_at);
        const cycleTimeMs = endTime.getTime() - startTime.getTime();
        if (cycleTimeMs > 0) cycleTimes.push(cycleTimeMs);
      }
    }

    if (cycleTimes.length === 0) {
      return c.json({ success: true, data: { average: 0, median: 0, distribution: {} }, message: 'No completed tasks found' });
    }

    // Calculate average
    const average = cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length;

    // Calculate median
    cycleTimes.sort((a, b) => a - b);
    const median = cycleTimes.length % 2 === 0
      ? (cycleTimes[cycleTimes.length / 2 - 1] + cycleTimes[cycleTimes.length / 2]) / 2
      : cycleTimes[Math.floor(cycleTimes.length / 2)];

    // Distribution buckets (in days: 0-1, 1-3, 3-7, 7-14, 14+)
    const buckets = { '0-1': 0, '1-3': 0, '3-7': 0, '7-14': 0, '14+': 0 };
    cycleTimes.forEach(ct => {
      const days = ct / (1000 * 60 * 60 * 24);
      if (days <= 1) buckets['0-1']++;
      else if (days <= 3) buckets['1-3']++;
      else if (days <= 7) buckets['3-7']++;
      else if (days <= 14) buckets['7-14']++;
      else buckets['14+']++;
    });

    return c.json({
      success: true,
      data: {
        average: Math.round(average / (1000 * 60 * 60 * 24) * 100) / 100, // in days, rounded to 2 decimals
        median: Math.round(median / (1000 * 60 * 60 * 24) * 100) / 100,
        distribution: buckets
      }
    });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }
});

// GET /analytics/completion-rate
// Computes completion rate: completed tasks / created tasks over time periods.
// Query params: project_id (optional), start_date (ISO string), end_date (ISO string), period (day|week|month, default month)
analyticsRouter.get('/completion-rate', async (c) => {
  const client = createDataClient(c.env);
  const { project_id, start_date, end_date, period = 'month' } = c.req.query();

  // Validation
  if (start_date && isNaN(Date.parse(start_date))) {
    return c.json({ success: false, error: { message: 'Invalid start_date format', status: 400 } }, 400);
  }
  if (end_date && isNaN(Date.parse(end_date))) {
    return c.json({ success: false, error: { message: 'Invalid end_date format', status: 400 } }, 400);
  }
  if (project_id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(project_id)) {
    return c.json({ success: false, error: { message: 'Invalid project_id format', status: 400 } }, 400);
  }
  if (!['day', 'week', 'month'].includes(period)) {
    return c.json({ success: false, error: { message: 'Invalid period, must be day, week, or month', status: 400 } }, 400);
  }

  try {
    const filter: any = {};
    if (start_date) filter.created_at = { _gte: start_date };
    if (end_date) filter.created_at = { ...filter.created_at, _lte: end_date };
    if (project_id) filter.project_id = { _eq: project_id };

    // Fetch all tasks in range
    const tasksResponse = await client.getItems('tasks', { filter, fields: ['id', 'created_at', 'completed_at'] });
    const tasks = tasksResponse.data;

    // Group by period
    const grouped: { [key: string]: { created: number, completed: number } } = {};

    tasks.forEach(task => {
      const date = new Date(task.created_at);
      let key: string;
      if (period === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (period === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else { // month
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!grouped[key]) grouped[key] = { created: 0, completed: 0 };
      grouped[key].created++;
      if (task.completed_at) grouped[key].completed++;
    });

    // Compute rates
    const data = Object.keys(grouped).sort().map(key => ({
      period: key,
      completionRate: grouped[key].created > 0 ? (grouped[key].completed / grouped[key].created) * 100 : 0
    }));

    return c.json({ success: true, data });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }
});