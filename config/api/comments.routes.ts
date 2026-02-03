import { Hono } from 'hono';
import type { Env } from '../../src/types';
import { createDataClient } from '../../src/db/data-client';

export const taskCommentsRouter = new Hono<{ Bindings: Env }>();

// Assuming auth middleware sets c.set('user', { id: string, role: string })
taskCommentsRouter.post('/', async (c) => {
  const body = await c.req.json();
  const user = c.get('user'); // Assuming user is set by auth middleware
  if (!user) {
    return c.json({ success: false, error: { message: 'Unauthorized', status: 401 } }, 401);
  }

  const client = createDataClient(c.env);

  // Validation: taskId and body required, body non-empty
  if (!body.taskId || !body.body || typeof body.body !== 'string' || body.body.trim().length === 0) {
    return c.json({
      success: false,
      error: { message: 'Missing or invalid required fields: taskId and non-empty body', status: 400 }
    }, 400);
  }

  try {
    // Check if task exists
    const task = await client.getItem('tasks', body.taskId);
    if (!task.data) {
      return c.json({ success: false, error: { message: 'Task not found', status: 404 } }, 404);
    }

    const commentId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Create comment
    const comment = await client.createItem('task_comments', {
      id: commentId,
      task_id: body.taskId,
      author_user_id: user.id,
      body: body.body.trim(),
      created_at: now,
      updated_at: now
    });

    // Emit activity event
    await client.createItem('task_activities', {
      id: crypto.randomUUID(),
      task_id: body.taskId,
      actor_user_id: user.id,
      event_type: 'Commented',
      from_value: null,
      to_value: null,
      metadata: { comment_id: commentId },
      created_at: now
    });

    return c.json({
      success: true,
      data: comment.data,
      message: 'Comment created successfully'
    }, 201);
  } catch (error: any) {
    return c.json({
      success: false,
      error: { message: error.message, status: 500 }
    }, 500);
  }
});

taskCommentsRouter.get('/', async (c) => {
  const taskId = c.req.query('taskId');
  if (!taskId) {
    return c.json({
      success: false,
      error: { message: 'Missing required query parameter: taskId', status: 400 }
    }, 400);
  }

  const client = createDataClient(c.env);
  try {
    // Check if task exists (optional, but good practice)
    const task = await client.getItem('tasks', taskId);
    if (!task.data) {
      return c.json({ success: false, error: { message: 'Task not found', status: 404 } }, 404);
    }

    const comments = await client.getItems('task_comments', {
      filter: { task_id: { _eq: taskId } },
      sort: ['created_at']
    });
    return c.json({ success: true, data: comments.data });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }
});

taskCommentsRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const user = c.get('user'); // Assuming user is set by auth middleware
  if (!user) {
    return c.json({ success: false, error: { message: 'Unauthorized', status: 401 } }, 401);
  }

  const client = createDataClient(c.env);
  try {
    // Get comment to check existence and permissions
    const comment = await client.getItem('task_comments', id);
    if (!comment.data) {
      return c.json({ success: false, error: { message: 'Comment not found', status: 404 } }, 404);
    }

    // Check permissions: author or privileged role
    if (comment.data.author_user_id !== user.id && !['admin', 'moderator'].includes(user.role)) {
      return c.json({ success: false, error: { message: 'Forbidden', status: 403 } }, 403);
    }

    await client.deleteItem('task_comments', id);
    return c.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: { message: error.message, status: 500 }
    }, 500);
  }
});