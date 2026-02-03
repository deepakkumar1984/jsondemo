import { Hono } from 'hono';
import { createDataClient } from '../../src/db/data-client';

export const tasksRouter = new Hono<{ Bindings: Env }>();

// GET /tasks - List tasks with filters, pagination, and sort
tasksRouter.get('/', async (c) => {
  const client = createDataClient(c.env);
  const query = c.req.query();

  const filter: any = {};
  if (query.projectId) filter.project_id = { _eq: query.projectId };
  if (query.status) filter.status = { _eq: query.status };
  if (query.assigneeUserId) filter.assignee_user_id = { _eq: query.assigneeUserId };
  if (query.priority) filter.priority = { _eq: query.priority };
  if (query.dueDateFrom) filter.due_date = { ...filter.due_date, _gte: query.dueDateFrom };
  if (query.dueDateTo) filter.due_date = { ...filter.due_date, _lte: query.dueDateTo };
  // Note: searchText and tag filters not directly supported by client; implement in app logic if needed

  const limit = query.limit ? parseInt(query.limit) : 10;
  const offset = query.offset ? parseInt(query.offset) : 0;
  const sort = ['due_date', '-updated_at', '-priority']; // Default sort

  try {
    const tasks = await client.getItems('tasks', { filter, limit, offset, sort });
    return c.json({ success: true, data: tasks.data });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }
});

// POST /tasks - Create a new task
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

  // Check if project exists
  try {
    const project = await client.getItem('projects', body.projectId);
    if (!project.data) {
      return c.json({ success: false, error: { message: 'Project not found', status: 404 } }, 404);
    }
  } catch (error: any) {
    return c.json({ success: false, error: { message: 'Error checking project: ' + error.message, status: 500 } }, 500);
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

// GET /tasks/:id - Get task by ID with related project
tasksRouter.get('/:id', async (c) => {
  const client = createDataClient(c.env);
  const id = c.req.param('id');

  try {
    const task = await client.getItem('tasks', id);
    if (!task.data) {
      return c.json({ success: false, error: { message: 'Task not found', status: 404 } }, 404);
    }

    // Fetch related project
    const project = await client.getItem('projects', task.data.project_id);
    const taskWithProject = { ...task.data, project: project.data };

    return c.json({ success: true, data: taskWithProject });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }
});

// PUT /tasks/:id - Update task
tasksRouter.put('/:id', async (c) => {
  const body = await c.req.json();
  const client = createDataClient(c.env);
  const id = c.req.param('id');

  // Check if task exists
  try {
    const existingTask = await client.getItem('tasks', id);
    if (!existingTask.data) {
      return c.json({ success: false, error: { message: 'Task not found', status: 404 } }, 404);
    }
  } catch (error: any) {
    return c.json({ success: false, error: { message: 'Error checking task: ' + error.message, status: 500 } }, 500);
  }

  try {
    const updatedTask = await client.updateItem('tasks', id, {
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
      updated_at: new Date().toISOString()
    });

    return c.json({
      success: true,
      data: updatedTask.data,
      message: 'Task updated successfully'
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: { message: error.message, status: 500 }
    }, 500);
  }
});

// DELETE /tasks/:id - Delete task (hard delete)
tasksRouter.delete('/:id', async (c) => {
  const client = createDataClient(c.env);
  const id = c.req.param('id');

  // Check if task exists
  try {
    const existingTask = await client.getItem('tasks', id);
    if (!existingTask.data) {
      return c.json({ success: false, error: { message: 'Task not found', status: 404 } }, 404);
    }
  } catch (error: any) {
    return c.json({ success: false, error: { message: 'Error checking task: ' + error.message, status: 500 } }, 500);
  }

  try {
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