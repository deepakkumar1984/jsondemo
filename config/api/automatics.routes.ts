import { Hono } from 'hono';
import type { Env } from '../../src/types';
import { createDataClient } from '../../src/db/data-client';

export const tasksRouter = new Hono<{ Bindings: Env }>();

tasksRouter.get('/', async (c) => {
  const client = createDataClient(c.env);
  try {
    const params: any = {};
    const filter: any = {};
    const query = c.req.query();

    if (query.projectId) filter.project_id = { _eq: query.projectId };
    if (query.status) filter.status = { _eq: query.status };
    if (query.assigneeUserId) filter.assignee_user_id = { _eq: query.assigneeUserId };
    if (query.priority) filter.priority = { _eq: query.priority };
    if (query.limit) params.limit = parseInt(query.limit);
    if (query.offset) params.offset = parseInt(query.offset);
    if (query.sort) params.sort = query.sort.split(',');
    if (query.fields) params.fields = query.fields.split(',');

    if (Object.keys(filter).length > 0) params.filter = filter;

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

  if (!body.projectId || !body.title || !body.reporterUserId) {
    return c.json({
      success: false,
      error: { message: 'Missing required fields: projectId, title, reporterUserId', status: 400 }
    }, 400);
  }

  // Validate project exists
  try {
    const project = await client.getItem('projects', body.projectId);
    if (!project.data) {
      return c.json({ success: false, error: { message: 'Project not found', status: 404 } }, 404);
    }
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }

  // Validate reporter user exists
  try {
    const reporter = await client.getItem('users', body.reporterUserId);
    if (!reporter.data) {
      return c.json({ success: false, error: { message: 'Reporter user not found', status: 404 } }, 404);
    }
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }

  // Validate assignee if provided
  if (body.assigneeUserId) {
    try {
      const assignee = await client.getItem('users', body.assigneeUserId);
      if (!assignee.data) {
        return c.json({ success: false, error: { message: 'Assignee user not found', status: 404 } }, 404);
      }
    } catch (error: any) {
      return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
    }
  }

  const taskData: any = {
    id: crypto.randomUUID(),
    project_id: body.projectId,
    title: body.title,
    description: body.description || null,
    status: body.status || 'Todo',
    priority: body.priority || 'Medium',
    assignee_user_id: body.assigneeUserId || null,
    reporter_user_id: body.reporterUserId,
    due_date: body.dueDate ? new Date(body.dueDate).toISOString() : null,
    start_date: body.startDate ? new Date(body.startDate).toISOString() : null,
    completed_at: null,
    estimate_points: body.estimatePoints || null,
    tags: body.tags || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    const task = await client.createItem('tasks', taskData);

    // Log activity: Created
    const actorUserId = c.req.header('X-User-Id') || null; // Assuming authenticated user ID from header
    await client.createItem('task_activities', {
      id: crypto.randomUUID(),
      task_id: taskData.id,
      actor_user_id: actorUserId,
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

  try {
    const existingTask = await client.getItem('tasks', id);
    if (!existingTask.data) {
      return c.json({ success: false, error: { message: 'Task not found', status: 404 } }, 404);
    }

    const oldTask = existingTask.data;

    // Validate assignee if provided
    if (body.assigneeUserId) {
      const assignee = await client.getItem('users', body.assigneeUserId);
      if (!assignee.data) {
        return c.json({ success: false, error: { message: 'Assignee user not found', status: 404 } }, 404);
      }
    }

    const updateData: any = {
      title: body.title !== undefined ? body.title : oldTask.title,
      description: body.description !== undefined ? body.description : oldTask.description,
      status: body.status !== undefined ? body.status : oldTask.status,
      priority: body.priority !== undefined ? body.priority : oldTask.priority,
      assignee_user_id: body.assigneeUserId !== undefined ? body.assigneeUserId : oldTask.assignee_user_id,
      due_date: body.dueDate !== undefined ? (body.dueDate ? new Date(body.dueDate).toISOString() : null) : oldTask.due_date,
      start_date: body.startDate !== undefined ? (body.startDate ? new Date(body.startDate).toISOString() : null) : oldTask.start_date,
      estimate_points: body.estimatePoints !== undefined ? body.estimatePoints : oldTask.estimate_points,
      tags: body.tags !== undefined ? body.tags : oldTask.tags,
      updated_at: new Date().toISOString()
    };

    // Handle completed_at based on status
    if (updateData.status === 'Done' && !oldTask.completed_at) {
      updateData.completed_at = new Date().toISOString();
    } else if (updateData.status !== 'Done') {
      updateData.completed_at = null;
    }

    const updatedTask = await client.updateItem('tasks', id, updateData);

    // Log activities based on changes
    const actorUserId = c.req.header('X-User-Id') || null; // Assuming authenticated user ID from header
    const changes = [];

    if (oldTask.status !== updateData.status) {
      changes.push({
        event_type: 'StatusChanged',
        from_value: oldTask.status,
        to_value: updateData.status
      });
    }

    if (oldTask.assignee_user_id !== updateData.assignee_user_id) {
      if (oldTask.assignee_user_id && updateData.assignee_user_id) {
        changes.push({
          event_type: 'Unassigned',
          from_value: oldTask.assignee_user_id,
          to_value: null
        });
        changes.push({
          event_type: 'Assigned',
          from_value: null,
          to_value: updateData.assignee_user_id
        });
      } else if (oldTask.assignee_user_id) {
        changes.push({
          event_type: 'Unassigned',
          from_value: oldTask.assignee_user_id,
          to_value: null
        });
      } else if (updateData.assignee_user_id) {
        changes.push({
          event_type: 'Assigned',
          from_value: null,
          to_value: updateData.assignee_user_id
        });
      }
    }

    if (oldTask.due_date !== updateData.due_date) {
      changes.push({
        event_type: 'DueDateChanged',
        from_value: oldTask.due_date,
        to_value: updateData.due_date
      });
    }

    if (oldTask.priority !== updateData.priority) {
      changes.push({
        event_type: 'PriorityChanged',
        from_value: oldTask.priority,
        to_value: updateData.priority
      });
    }

    if (JSON.stringify(oldTask.tags) !== JSON.stringify(updateData.tags)) {
      changes.push({
        event_type: 'Tagged',
        from_value: oldTask.tags,
        to_value: updateData.tags
      });
    }

    // Check for generic Updated (non-tracked fields)
    const trackedFields = ['status', 'assignee_user_id', 'due_date', 'priority', 'tags'];
    const otherChanged = ['title', 'description', 'start_date', 'estimate_points'].some(field =>
      oldTask[field] !== updateData[field]
    );

    if (otherChanged && changes.length === 0) {
      changes.push({
        event_type: 'Updated',
        from_value: null,
        to_value: null
      });
    }

    for (const change of changes) {
      await client.createItem('task_activities', {
        id: crypto.randomUUID(),
        task_id: id,
        actor_user_id: actorUserId,
        event_type: change.event_type,
        from_value: change.from_value,
        to_value: change.to_value,
        metadata: null,
        created_at: new Date().toISOString()
      });
    }

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

tasksRouter.delete('/:id', async (c) => {
  const client = createDataClient(c.env);
  const id = c.req.param('id');

  try {
    const existingTask = await client.getItem('tasks', id);
    if (!existingTask.data) {
      return c.json({ success: false, error: { message: 'Task not found', status: 404 } }, 404);
    }

    // Check for dependent records (comments)
    const comments = await client.getItems('task_comments', { filter: { task_id: { _eq: id } } });
    if (comments.data && comments.data.length > 0) {
      return c.json({
        success: false,
        error: { message: 'Cannot delete task with existing comments', status: 400 }
      }, 400);
    }

    // Check for dependent activities (though we can delete, but perhaps log or prevent)
    // For now, allow deletion

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