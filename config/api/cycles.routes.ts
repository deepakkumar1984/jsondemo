import { Hono } from 'hono';
import type { Env } from '../../src/types';
import { createDataClient } from '../../src/db/data-client';

export const analyticsRouter = new Hono<{ Bindings: Env }>();

analyticsRouter.get('/cycleTime', async (c) => {
  const client = createDataClient(c.env);
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');

  if (!startDate || !endDate) {
    return c.json({
      success: false,
      error: { message: 'startDate and endDate query parameters are required', status: 400 }
    }, 400);
  }

  try {
    // Get completed tasks within the date range
    const tasks = await client.getItems('tasks', {
      filter: {
        completed_at: { _gte: startDate, _lte: endDate },
        status: { _eq: 'Done' }
      },
      fields: ['id', 'start_date', 'completed_at']
    });

    const cycleTimes: number[] = [];

    for (const task of tasks.data) {
      let start: Date;
      if (task.start_date) {
        start = new Date(task.start_date);
      } else {
        // Fallback: find first StatusChanged to InProgress
        const activities = await client.getItems('task_activities', {
          filter: {
            task_id: { _eq: task.id },
            event_type: { _eq: 'StatusChanged' },
            to_value: { _eq: 'InProgress' }
          },
          sort: ['created_at'],
          limit: 1
        });
        if (activities.data.length > 0) {
          start = new Date(activities.data[0].created_at);
        } else {
          continue; // Skip if no start found
        }
      }
      const end = new Date(task.completed_at);
      const diffMs = end.getTime() - start.getTime();
      if (diffMs > 0) {
        cycleTimes.push(diffMs / (1000 * 60 * 60)); // in hours
      }
    }

    if (cycleTimes.length === 0) {
      return c.json({
        success: true,
        data: { average: 0, median: 0, distribution: {} },
        metadata: {
          fallbackRule: 'If startDate is missing, use the timestamp of the first StatusChanged to InProgress event.'
        }
      });
    }

    // Calculate average
    const average = cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length;

    // Calculate median
    cycleTimes.sort((a, b) => a - b);
    const median = cycleTimes.length % 2 === 0
      ? (cycleTimes[cycleTimes.length / 2 - 1] + cycleTimes[cycleTimes.length / 2]) / 2
      : cycleTimes[Math.floor(cycleTimes.length / 2)];

    // Distribution buckets (in hours: 0-1, 1-24, 24-168, 168+)
    const distribution = {
      '0-1h': cycleTimes.filter(t => t <= 1).length,
      '1-24h': cycleTimes.filter(t => t > 1 && t <= 24).length,
      '1-7d': cycleTimes.filter(t => t > 24 && t <= 168).length,
      '7d+': cycleTimes.filter(t => t > 168).length
    };

    return c.json({
      success: true,
      data: { average, median, distribution },
      metadata: {
        fallbackRule: 'If startDate is missing, use the timestamp of the first StatusChanged to InProgress event.'
      }
    });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }
});

analyticsRouter.get('/completionRate', async (c) => {
  const client = createDataClient(c.env);
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');

  if (!startDate || !endDate) {
    return c.json({
      success: false,
      error: { message: 'startDate and endDate query parameters are required', status: 400 }
    }, 400);
  }

  try {
    // Get tasks created within the range
    const createdTasks = await client.getItems('tasks', {
      filter: {
        created_at: { _gte: startDate, _lte: endDate }
      },
      fields: ['id', 'created_at']
    });

    // Get tasks completed within the range
    const completedTasks = await client.getItems('tasks', {
      filter: {
        completed_at: { _gte: startDate, _lte: endDate },
        status: { _eq: 'Done' }
      },
      fields: ['id', 'completed_at']
    });

    // Group by date (assuming daily)
    const createdByDate: Record<string, number> = {};
    const completedByDate: Record<string, number> = {};

    createdTasks.data.forEach(task => {
      const date = new Date(task.created_at).toISOString().split('T')[0];
      createdByDate[date] = (createdByDate[date] || 0) + 1;
    });

    completedTasks.data.forEach(task => {
      const date = new Date(task.completed_at).toISOString().split('T')[0];
      completedByDate[date] = (completedByDate[date] || 0) + 1;
    });

    // Combine dates
    const allDates = new Set([...Object.keys(createdByDate), ...Object.keys(completedByDate)]);
    const data = Array.from(allDates).sort().map(date => {
      const created = createdByDate[date] || 0;
      const completed = completedByDate[date] || 0;
      const rate = created > 0 ? (completed / created) * 100 : 0;
      return { date, created, completed, rate };
    });

    return c.json({
      success: true,
      data,
      metadata: {
        description: 'Completion rate as percentage of completed tasks over created tasks per day.'
      }
    });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }
});