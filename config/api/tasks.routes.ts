import { Hono } from 'hono';
import type { Env } from '../../src/types';
import { createDataClient } from '../../src/db/data-client';

export const tasksRouter = new Hono<{ Bindings: Env }>();

tasksRouter.get('/', async (c) => {
  const client = createDataClient(c.env);
  const query = c.req.query();

  const filter: any = {};
  if (query.projectId) filter.project_id = { _eq: query.projectId };
  if (query.status) filter.status = { _eq: query.status };
  if (query.assigneeUserId) filter.assignee_user_id = { _eq: query.assigneeUserId };
  if (query.priority) filter.priority = { _eq: query.priority };
  if (query.tag) filter.tags = { _in: [query.tag] }; // Assuming tags is array and _in works for jsonb
  if (query.dueDateFrom || query.dueDateTo) {
    filter.due_date = {};
    if (query.dueDateFrom) filter.due_date._gte = query.dueDateFrom;
    if (query.dueDateTo) filter.due_date._lte = query.dueDateTo;
  }
  // searchText not supported in filter, skipping

  const params: any = { filter };
  if (query.limit) params.limit = parseInt(query.limit);
  if (query.offset) params.offset = parseInt(query.offset);
  params.sort = ['due_date', '-updated_at', '-priority']; // Fixed sort as per requirements

  try {
    const tasks = await client.getItems('tasks', params);
    return c.json({ success: true, data: tasks.data });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }
});

tasksRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const client = createDataClient(c.env);

  try {
    const task = await client.getItem('tasks', id);
    if (!task.data) {
      return c.json({ success: false, error: { message: 'Task not found', status: 404 } }, 404);
    }

    // Fetch related project
    const project = await client.getItem('projects', task.data.project_id);
    task.data.project = project.data; // Include project reference

    return c.json({ success: true, data: task.data });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }
});

tasksRouter.post('/', async (c) => {
  const body = await c.req.json();
  const client = createDataClient(c.env);

  // Validation
  if (!body.projectId || !body.title || !body.status || !body.priority || !body.reporterUserId) {
    return c.json({
      success: false,
      error: { message: 'Missing required fields: projectId, title, status, priority, reporterUserId', status: 400 }
    }, 400);
  }

  const validStatuses = ['Backlog', 'Todo', 'InProgress', 'Blocked', 'Done'];
  const validPriorities = ['Low', 'Medium', 'High', 'Urgent'];
  if (!validStatuses.includes(body.status) || !validPriorities.includes(body.priority)) {
    return c.json({
      success: false,
      error: { message: 'Invalid status or priority', status: 400 }
    }, 400);
  }

  // Check if project exists
  try {
    const project = await client.getItem('projects', body.projectId);
    if (!project.data) {
      return c.json({ success: false, error: { message: 'Project not found', status: 404 } }, 404);
    }
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }

  try {
    const task = await client.createItem('tasks', {
      id: crypto.randomUUID(),
      project_id: body.projectId,
      title: body.title,
      description: body.description,
      status: body.status,
      priority: body.priority,
      assignee_user_id: body.assigneeUserId,
      reporter_user_id: body.reporterUserId,
      due_date: body.dueDate,
      start_date: body.startDate,
      completed_at: body.completedAt,
      estimate_points: body.estimatePoints,
      tags: body.tags,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    return c.json({
      success: true,
      data: task.data,
      message: 'Task created successfully'
    }, 201);
  } catch (error: any) {
    return c.json({
      success: false,
      error: { message: error.message, status: 500 }
    }, 500);
  }
});

tasksRouter.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const client = createDataClient(c.env);

  // Validation
  const validStatuses = ['Backlog', 'Todo', 'InProgress', 'Blocked', 'Done'];
  const validPriorities = ['Low', 'Medium', 'High', 'Urgent'];
  if (body.status && !validStatuses.includes(body.status)) {
    return c.json({
      success: false,
      error: { message: 'Invalid status', status: 400 }
    }, 400);
  }
  if (body.priority && !validPriorities.includes(body.priority)) {
    return c.json({
      success: false,
      error: { message: 'Invalid priority', status: 400 }
    }, 400);
  }

  try {
    const existingTask = await client.getItem('tasks', id);
    if (!existingTask.data) {
      return c.json({ success: false, error: { message: 'Task not found', status: 404 } }, 404);
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    };
    if (body.title) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status) updateData.status = body.status;
    if (body.priority) updateData.priority = body.priority;
    if (body.assigneeUserId !== undefined) updateData.assignee_user_id = body.assigneeUserId;
    if (body.dueDate !== undefined) updateData.due_date = body.dueDate;
    if (body.startDate !== undefined) updateData.start_date = body.startDate;
    if (body.completedAt !== undefined) updateData.completed_at = body.completedAt;
    if (body.estimatePoints !== undefined) updateData.estimate_points = body.estimatePoints;
    if (body.tags !== undefined) updateData.tags = body.tags;

    const task = await client.updateItem('tasks', id, updateData);

    return c.json({
      success: true,
      data: task.data,
      message: 'Task updated successfully'
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: { message: error.message, status: 500 }
    }, 500);
  }
});

tasksRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const client = createDataClient(c.env);

  try {
    const task = await client.getItem('tasks', id);
    if (!task.data) {
      return c.json({ success: false, error: { message: 'Task not found', status: 404 } }, 404);
    }

    // Check for dependent records
    const activities = await client.getItems('task_activities', { filter: { task_id: { _eq: id } } });
    const comments = await client.getItems('task_comments', { filter: { task_id: { _eq: id } } });
    if (activities.data.length > 0 || comments.data.length > 0) {
      return c.json({
        success: false,
        error: { message: 'Cannot delete task with existing activities or comments', status: 400 }
      }, 400);
    }

    await client.deleteItem('tasks', id);

    return c.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: { message: error.message, status: 500 }
    }, 500);
  }
});