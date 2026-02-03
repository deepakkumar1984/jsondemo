import { Hono } from 'hono';
import { createDataClient } from '../../src/db/data-client';

export const analyticsRouter = new Hono<{ Bindings: Env }>();

analyticsRouter.get('/tasks-by-status', async (c) => {
  const { projectId, dateFrom, dateTo } = c.req.query();
  const client = createDataClient(c.env);

  let from = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  let to = dateTo ? new Date(dateTo) : new Date();

  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return c.json({ success: false, error: { message: 'Invalid date format', status: 400 } }, 400);
  }

  const filter: any = {};
  if (projectId) filter.project_id = { _eq: projectId };
  filter.created_at = { _gte: from.toISOString(), _lte: to.toISOString() };

  try {
    const tasks = await client.getItems('tasks', { filter });
    const statusCounts: Record<string, number> = {};
    tasks.data.forEach((task: any) => {
      statusCounts[task.status] = (statusCounts[task.status] || 0) + 1;
    });
    const labels = Object.keys(statusCounts);
    const series = labels.map(label => statusCounts[label]);
    return c.json({ success: true, data: { labels, series } });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }
});

analyticsRouter.get('/tasks-created-trend', async (c) => {
  const { projectId, dateFrom, dateTo } = c.req.query();
  const client = createDataClient(c.env);

  let from = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  let to = dateTo ? new Date(dateTo) : new Date();

  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return c.json({ success: false, error: { message: 'Invalid date format', status: 400 } }, 400);
  }

  const filter: any = {};
  if (projectId) filter.project_id = { _eq: projectId };
  filter.created_at = { _gte: from.toISOString(), _lte: to.toISOString() };

  try {
    const tasks = await client.getItems('tasks', { filter });
    const trend: Record<string, number> = {};
    tasks.data.forEach((task: any) => {
      const date = new Date(task.created_at).toISOString().split('T')[0];
      trend[date] = (trend[date] || 0) + 1;
    });
    const labels = Object.keys(trend).sort();
    const series = labels.map(label => trend[label]);
    return c.json({ success: true, data: { labels, series } });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }
});

analyticsRouter.get('/tasks-completed-trend', async (c) => {
  const { projectId, dateFrom, dateTo } = c.req.query();
  const client = createDataClient(c.env);

  let from = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  let to = dateTo ? new Date(dateTo) : new Date();

  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return c.json({ success: false, error: { message: 'Invalid date format', status: 400 } }, 400);
  }

  const filter: any = {};
  if (projectId) filter.project_id = { _eq: projectId };
  filter.created_at = { _gte: from.toISOString(), _lte: to.toISOString() };

  try {
    const tasks = await client.getItems('tasks', { filter });
    const trend: Record<string, number> = {};
    tasks.data.forEach((task: any) => {
      if (task.completed_at) {
        const date = new Date(task.completed_at).toISOString().split('T')[0];
        trend[date] = (trend[date] || 0) + 1;
      }
    });
    const labels = Object.keys(trend).sort();
    const series = labels.map(label => trend[label]);
    return c.json({ success: true, data: { labels, series } });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }
});

analyticsRouter.get('/overdue-counts', async (c) => {
  const { projectId, dateFrom, dateTo } = c.req.query();
  const client = createDataClient(c.env);

  let from = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  let to = dateTo ? new Date(dateTo) : new Date();

  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return c.json({ success: false, error: { message: 'Invalid date format', status: 400 } }, 400);
  }

  const filter: any = {};
  if (projectId) filter.project_id = { _eq: projectId };
  filter.created_at = { _gte: from.toISOString(), _lte: to.toISOString() };

  try {
    const tasks = await client.getItems('tasks', { filter });
    const overdue: Record<string, number> = {};
    const now = new Date();
    tasks.data.forEach((task: any) => {
      if (task.status !== 'Done' && task.due_date && new Date(task.due_date) < now) {
        overdue[task.priority] = (overdue[task.priority] || 0) + 1;
      }
    });
    const labels = Object.keys(overdue);
    const series = labels.map(label => overdue[label]);
    return c.json({ success: true, data: { labels, series } });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }
});

analyticsRouter.get('/assignee-workload', async (c) => {
  const { projectId, dateFrom, dateTo } = c.req.query();
  const client = createDataClient(c.env);

  let from = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  let to = dateTo ? new Date(dateTo) : new Date();

  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return c.json({ success: false, error: { message: 'Invalid date format', status: 400 } }, 400);
  }

  const filter: any = {};
  if (projectId) filter.project_id = { _eq: projectId };
  filter.created_at = { _gte: from.toISOString(), _lte: to.toISOString() };

  try {
    const tasks = await client.getItems('tasks', { filter });
    const workload: Record<string, Record<string, number>> = {};
    tasks.data.forEach((task: any) => {
      if (task.status !== 'Done') {
        const assignee = task.assignee_user_id || 'Unassigned';
        if (!workload[assignee]) workload[assignee] = {};
        workload[assignee][task.status] = (workload[assignee][task.status] || 0) + 1;
      }
    });
    const assigneeIds = Object.keys(workload).filter(id => id !== 'Unassigned');
    let userMap: Record<string, string> = {};
    if (assigneeIds.length > 0) {
      const users = await client.getItems('users', { filter: { id: { _in: assigneeIds } }, fields: ['id', 'display_name'] });
      userMap = users.data.reduce((acc: Record<string, string>, u: any) => {
        acc[u.id] = u.display_name;
        return acc;
      }, {});
    }
    const labels = Object.keys(workload).map(id => id === 'Unassigned' ? 'Unassigned' : userMap[id] || id);
    const statuses = ['Backlog', 'Todo', 'InProgress', 'Blocked'];
    const series = statuses.map(status => ({
      name: status,
      data: labels.map(label => {
        const originalId = label === 'Unassigned' ? 'Unassigned' : Object.keys(userMap).find(k => userMap[k] === label) || label;
        return workload[originalId]?.[status] || 0;
      })
    }));
    return c.json({ success: true, data: { labels, series } });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }
});