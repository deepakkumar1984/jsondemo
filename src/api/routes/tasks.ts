import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, or, like, desc, asc } from 'drizzle-orm';
import { tasks, projects, users } from '../../db/schema';
import { authMiddleware } from '../middleware/auth';
import { success, handleError } from '../utils/response';

type Env = { Bindings: { DB: D1Database; JWT_SECRET: string } };

const app = new Hono<Env>();

// Apply auth middleware to all routes
app.use('*', authMiddleware);

// GET /api/tasks - List all tasks with filters
app.get('/', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const { status, priority, projectId, search } = c.req.query();

    let conditions = [];

    if (status) {
      conditions.push(eq(tasks.status, status));
    }
    if (priority !== undefined) {
      conditions.push(eq(tasks.priority, parseInt(priority)));
    }
    if (projectId) {
      conditions.push(eq(tasks.projectId, projectId));
    }
    if (search) {
      conditions.push(
        or(
          like(tasks.title, `%${search}%`),
          like(tasks.description || '', `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        projectId: tasks.projectId,
        assigneeId: tasks.assigneeId,
        createdById: tasks.createdById,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
      })
      .from(tasks)
      .where(whereClause)
      .orderBy(desc(tasks.priority), asc(tasks.createdAt));

    return c.json(success(results));
  } catch (err) {
    const e = handleError('Fetch tasks', err);
    return c.json(e.body, e.status);
  }
});

// GET /api/tasks/:id - Get a single task with relations
app.get('/:id', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const id = c.req.param('id');

    const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);

    if (!task) {
      return c.json({ success: false, error: 'Task not found' }, 404);
    }

    // Get related project
    let project = null;
    if (task.projectId) {
      const [proj] = await db.select().from(projects).where(eq(projects.id, task.projectId)).limit(1);
      if (proj) {
        project = { id: proj.id, name: proj.name, ownerId: proj.ownerId };
      }
    }

    // Get assignee
    let assignee = null;
    if (task.assigneeId) {
      const [usr] = await db.select({
        id: users.id,
        name: users.name,
        email: users.email
      }).from(users).where(eq(users.id, task.assigneeId)).limit(1);
      if (usr) assignee = usr;
    }

    // Get creator
    const [creator] = await db.select({
      id: users.id,
      name: users.name,
      email: users.email
    }).from(users).where(eq(users.id, task.createdById)).limit(1);

    return c.json(success({ ...task, project, assignee, creator }));
  } catch (err) {
    const e = handleError('Fetch task', err);
    return c.json(e.body, e.status);
  }
});

// POST /api/tasks - Create a new task
app.post('/', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const body = await c.req.json();
    const user = (c as any).get('user');

    const { title, description, status, priority, dueDate, projectId, assigneeId } = body;

    if (!title || !projectId) {
      return c.json({ success: false, error: 'Title and projectId are required' }, 400);
    }

    const [newTask] = await db
      .insert(tasks)
      .values({
        id: crypto.randomUUID(),
        title,
        description: description || null,
        status: status || 'todo',
        priority: priority || 0,
        dueDate: dueDate || null,
        projectId,
        assigneeId: assigneeId || null,
        createdById: user.id,
      })
      .returning();

    return c.json(success(newTask), 201);
  } catch (err) {
    const e = handleError('Create task', err);
    return c.json(e.body, e.status);
  }
});

// PUT /api/tasks/:id - Update a task
app.put('/:id', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const id = c.req.param('id');
    const body = await c.req.json();

    const { title, description, status, priority, dueDate, assigneeId } = body;

    const updateData: any = { updatedAt: new Date().toISOString() };
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (dueDate !== undefined) updateData.dueDate = dueDate;
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId;

    const [updated] = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, id))
      .returning();

    if (!updated) {
      return c.json({ success: false, error: 'Task not found' }, 404);
    }

    return c.json(success(updated));
  } catch (err) {
    const e = handleError('Update task', err);
    return c.json(e.body, e.status);
  }
});

// DELETE /api/tasks/:id - Delete a task
app.delete('/:id', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const id = c.req.param('id');

    const [deleted] = await db.delete(tasks).where(eq(tasks.id, id)).returning();

    if (!deleted) {
      return c.json({ success: false, error: 'Task not found' }, 404);
    }

    return c.json(success({ message: 'Task deleted successfully' }));
  } catch (err) {
    const e = handleError('Delete task', err);
    return c.json(e.body, e.status);
  }
});

export default app;
