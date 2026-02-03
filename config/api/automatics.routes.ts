import { Hono } from 'hono';
import type { Env } from '../../src/types';
import { createDataClient } from '../../src/db/data-client';

export const tasksRouter = new Hono<{ Bindings: Env }>();

tasksRouter.get('/', async (c) => {
  const client = createDataClient(c.env);
  try {
    const params = c.req.query();
    const tasks = await client.getItems('tasks', params);
    return c.json({ success: true, data: tasks.data });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }
});

tasksRouter.get('/:id', async (c) => {
  const client = createDataClient(c.env);
  const id = c.req.param('id');
  try {
    const task = await client.getItem('tasks', id);
    if (!task.data) {
      return c.json({ success: false, error: { message: 'Task not found', status: 404 } }, 404);
    }
    return c.json({ success: true, data: task.data });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }
});

tasksRouter.post('/', async (c) => {
  const body = await c.req.json();
  const client = createDataClient(c.env);

  // Assume userId from auth context
  const userId = c.get('userId'); // Assuming middleware sets this

  if (!body.projectId || !body.title) {
    return c.json({
      success: false,
      error: { message: 'Missing required fields: projectId, title', status: 400 }
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

  const taskData = {
    id: crypto.randomUUID(),
    project_id: body.projectId,
    title: body.title,
    description: body.description || null,
    status: body.status || 'Todo',
    priority: body.priority || 'Medium',
    assignee_user_id: body.assigneeUserId || null,
    reporter_user_id: userId,
    due_date: body.dueDate || null,
    start_date: body.startDate || null,
    completed_at: null,
    estimate_points: body.estimatePoints || null,
    tags: body.tags || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    const task = await client.createItem('tasks', taskData);

    // Log Created activity
    await client.createItem('task_activities', {
      id: crypto.randomUUID(),
      task_id: task.data.id,
      actor_user_id: userId,
      event_type: 'Created',
      from_value: null,
      to_value: null,
      metadata: null,
      created_at: new Date().toISOString()
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
  const body = await c.req.json();
  const client = createDataClient(c.env);
  const id = c.req.param('id');

  // Assume userId from auth context
  const userId = c.get('userId'); // Assuming middleware sets this

  if (!body.title) {
    return c.json({
      success: false,
      error: { message: 'Missing required field: title', status: 400 }
    }, 400);
  }

  try {
    const oldTaskRes = await client.getItem('tasks', id);
    if (!oldTaskRes.data) {
      return c.json({ success: false, error: { message: 'Task not found', status: 404 } }, 404);
    }
    const oldTask = oldTaskRes.data;

    const updateData = {
      title: body.title,
      description: body.description !== undefined ? body.description : oldTask.description,
      status: body.status !== undefined ? body.status : oldTask.status,
      priority: body.priority !== undefined ? body.priority : oldTask.priority,
      assignee_user_id: body.assigneeUserId !== undefined ? body.assigneeUserId : oldTask.assignee_user_id,
      due_date: body.dueDate !== undefined ? body.dueDate : oldTask.due_date,
      start_date: body.startDate !== undefined ? body.startDate : oldTask.start_date,
      completed_at: body.status === 'Done' ? (oldTask.completed_at || new Date().toISOString()) : null,
      estimate_points: body.estimatePoints !== undefined ? body.estimatePoints : oldTask.estimate_points,
      tags: body.tags !== undefined ? body.tags : oldTask.tags,
      updated_at: new Date().toISOString()
    };

    const newTask = await client.updateItem('tasks', id, updateData);

    // Log activities based on changes
    const activities = [];

    if (oldTask.status !== newTask.data.status) {
      activities.push({
        event_type: 'StatusChanged',
        from_value: oldTask.status,
        to_value: newTask.data.status
      });
    }

    if (oldTask.assignee_user_id !== newTask.data.assignee_user_id) {
      if (newTask.data.assignee_user_id === null) {
        activities.push({
          event_type: 'Unassigned',
          from_value: oldTask.assignee_user_id,
          to_value: null
        });
      } else {
        activities.push({
          event_type: 'Assigned',
          from_value: oldTask.assignee_user_id,
          to_value: newTask.data.assignee_user_id
        });
      }
    }

    if (oldTask.due_date !== newTask.data.due_date) {
      activities.push({
        event_type: 'DueDateChanged',
        from_value: oldTask.due_date,
        to_value: newTask.data.due_date
      });
    }

    if (oldTask.priority !== newTask.data.priority) {
      activities.push({
        event_type: 'PriorityChanged',
        from_value: oldTask.priority,
        to_value: newTask.data.priority
      });
    }

    if (JSON.stringify(oldTask.tags) !== JSON.stringify(newTask.data.tags)) {
      activities.push({
        event_type: 'Tagged',
        from_value: oldTask.tags,
        to_value: newTask.data.tags
      });
    }

    // Check for other changes (non-tracked fields)
    const trackedFields = ['status', 'assignee_user_id', 'due_date', 'priority', 'tags'];
    const otherChanged = Object.keys(updateData).some(key => 
      !trackedFields.includes(key.replace(/_/g, '')) && oldTask[key] !== newTask.data[key]
    );

    if (activities.length === 0 && otherChanged) {
      activities.push({
        event_type: 'Updated',
        from_value: null,
        to_value: null
      });
    }

    // Create activity records
    for (const act of activities) {
      await client.createItem('task_activities', {
        id: crypto.randomUUID(),
        task_id: id,
        actor_user_id: userId,
        event_type: act.event_type,
        from_value: act.from_value,
        to_value: act.to_value,
        metadata: null,
        created_at: new Date().toISOString()
      });
    }

    return c.json({
      success: true,
      data: newTask.data,
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
  const client = createDataClient(c.env);
  const id = c.req.param('id');
  try {
    const task = await client.getItem('tasks', id);
    if (!task.data) {
      return c.json({ success: false, error: { message: 'Task not found', status: 404 } }, 404);
    }

    // Check for dependent records (e.g., task_activities, task_comments)
    const activities = await client.getItems('task_activities', { filter: { task_id: { _eq: id } } });
    const comments = await client.getItems('task_comments', { filter: { task_id: { _eq: id } } });
    if (activities.data.length > 0 || comments.data.length > 0) {
      return c.json({
        success: false,
        error: { message: 'Cannot delete task with existing activities or comments', status: 400 }
      }, 400);
    }

    await client.deleteItem('tasks', id);
    return c.json({ success: true, message: 'Task deleted successfully' });
  } catch (error: any) {
    return c.json({
      success: false,
      error: { message: error.message, status: 500 }
    }, 500);
  }
});