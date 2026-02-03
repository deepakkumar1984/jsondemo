import { Hono } from 'hono';
import type { Env } from '../../src/types';
import { createDataClient } from '../../src/db/data-client';

export const taskCommentsRouter = new Hono<{ Bindings: Env }>();

// List task comments by task, sorted by createdAt asc
taskCommentsRouter.get('/', async (c) => {
  const client = createDataClient(c.env);
  const taskId = c.req.query('taskId');

  if (!taskId) {
    return c.json({
      success: false,
      error: { message: 'taskId query parameter is required', status: 400 }
    }, 400);
  }

  try {
    const comments = await client.getItems('task_comments', {
      filter: { task_id: { _eq: taskId } },
      sort: ['created_at']
    });
    return c.json({ success: true, data: comments.data });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }
});

// Create a new task comment and emit activity event
taskCommentsRouter.post('/', async (c) => {
  const body = await c.req.json();
  const client = createDataClient(c.env);

  // Validation: assume TaskComment schema requires taskId, authorUserId, body
  if (!body.taskId || !body.authorUserId || !body.body || typeof body.body !== 'string' || body.body.trim().length === 0) {
    return c.json({
      success: false,
      error: { message: 'Missing or invalid required fields: taskId, authorUserId, body (non-empty string)', status: 400 }
    }, 400);
  }

  // Check if task exists
  try {
    const task = await client.getItem('tasks', body.taskId);
    if (!task.data) {
      return c.json({
        success: false,
        error: { message: 'Task not found', status: 404 }
      }, 404);
    }
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }

  // Check if author user exists
  try {
    const user = await client.getItem('users', body.authorUserId);
    if (!user.data) {
      return c.json({
        success: false,
        error: { message: 'Author user not found', status: 404 }
      }, 404);
    }
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }

  try {
    const comment = await client.createItem('task_comments', {
      id: crypto.randomUUID(),
      task_id: body.taskId,
      author_user_id: body.authorUserId,
      body: body.body.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Emit activity event
    await client.createItem('task_activities', {
      id: crypto.randomUUID(),
      task_id: body.taskId,
      actor_user_id: body.authorUserId,
      event_type: 'Commented',
      metadata: { comment_id: comment.data.id },
      created_at: new Date().toISOString()
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

// Delete a task comment, restricted to author or privileged roles
taskCommentsRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const client = createDataClient(c.env);

  // Assume user ID from request context (e.g., from auth middleware, not shown)
  const currentUserId = c.req.header('X-User-ID'); // Placeholder for user ID
  if (!currentUserId) {
    return c.json({
      success: false,
      error: { message: 'Unauthorized: User ID required', status: 401 }
    }, 401);
  }

  try {
    const comment = await client.getItem('task_comments', id);
    if (!comment.data) {
      return c.json({
        success: false,
        error: { message: 'Comment not found', status: 404 }
      }, 404);
    }

    // Check if current user is author or privileged (placeholder for role check)
    const isAuthor = comment.data.author_user_id === currentUserId;
    const isPrivileged = false; // Placeholder: implement role check based on existing patterns
    if (!isAuthor && !isPrivileged) {
      return c.json({
        success: false,
        error: { message: 'Forbidden: Only author or privileged users can delete', status: 403 }
      }, 403);
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