import { Hono } from 'hono';
import { createDataClient } from '../../src/db/data-client';

export const taskCommentRouter = new Hono<{ Bindings: Env }>();

// Create a task comment
taskCommentRouter.post('/', async (c) => {
  const body = await c.req.json();
  const client = createDataClient(c.env);

  // Validation: required fields
  if (!body.taskId || !body.authorUserId || !body.body || body.body.trim() === '') {
    return c.json({
      success: false,
      error: { message: 'Missing or invalid required fields: taskId, authorUserId, body', status: 400 }
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

  // Check if author exists
  try {
    const author = await client.getItem('users', body.authorUserId);
    if (!author.data) {
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
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

// List comments by task, sorted by createdAt asc
taskCommentRouter.get('/', async (c) => {
  const taskId = c.req.query('taskId');
  const client = createDataClient(c.env);

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

// Delete a comment (restricted to author or privileged roles)
taskCommentRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const client = createDataClient(c.env);

  // Assume current user ID is available via header or env; adjust as per auth setup
  const currentUserId = c.req.header('user-id'); // Placeholder; replace with actual auth logic
  if (!currentUserId) {
    return c.json({
      success: false,
      error: { message: 'Unauthorized', status: 401 }
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

    // Check if current user is author or has privileged role
    const user = await client.getItem('users', currentUserId);
    if (!user.data) {
      return c.json({
        success: false,
        error: { message: 'User not found', status: 404 }
      }, 404);
    }

    const isAuthor = comment.data.author_user_id === currentUserId;
    const isPrivileged = ['admin', 'moderator'].includes(user.data.role);

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