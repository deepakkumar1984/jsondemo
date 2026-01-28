import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, like, desc, asc } from 'drizzle-orm';
import { projects, users } from '../../db/schema';
import { authMiddleware } from '../middleware/auth';
import { success, handleError } from '../utils/response';

type Env = { Bindings: { DB: D1Database; JWT_SECRET: string } };

const app = new Hono<Env>();

// Apply auth middleware to all routes
app.use('*', authMiddleware);

// GET /api/projects - List all projects
app.get('/', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const { search, ownerId } = c.req.query();

    let conditions = [];
    if (ownerId) {
      conditions.push(eq(projects.ownerId, ownerId));
    }
    if (search) {
      conditions.push(
        like(projects.name, `%${search}%`)
      );
    }

    const whereClause = conditions.length > 0
      ? conditions.length === 1 ? conditions[0] : undefined
      : undefined;

    const results = await db
      .select()
      .from(projects)
      .where(whereClause)
      .orderBy(desc(projects.createdAt));

    return c.json(success(results));
  } catch (err) {
    const e = handleError('Fetch projects', err);
    return c.json(e.body, e.status);
  }
});

// GET /api/projects/:id - Get a single project
app.get('/:id', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const id = c.req.param('id');

    const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);

    if (!project) {
      return c.json({ success: false, error: 'Project not found' }, 404);
    }

    // Get owner
    const [owner] = await db.select({
      id: users.id,
      name: users.name,
      email: users.email
    }).from(users).where(eq(users.id, project.ownerId)).limit(1);

    return c.json(success({ ...project, owner }));
  } catch (err) {
    const e = handleError('Fetch project', err);
    return c.json(e.body, e.status);
  }
});

// POST /api/projects - Create a new project
app.post('/', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const body = await c.req.json();
    const user = (c as any).get('user');

    const { name, description, startDate, endDate } = body;

    if (!name) {
      return c.json({ success: false, error: 'Name is required' }, 400);
    }

    const [newProject] = await db
      .insert(projects)
      .values({
        id: crypto.randomUUID(),
        name,
        description: description || null,
        ownerId: user.id,
        startDate: startDate || null,
        endDate: endDate || null,
      })
      .returning();

    return c.json(success(newProject), 201);
  } catch (err) {
    const e = handleError('Create project', err);
    return c.json(e.body, e.status);
  }
});

// PUT /api/projects/:id - Update a project
app.put('/:id', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const id = c.req.param('id');
    const body = await c.req.json();

    const { name, description, startDate, endDate } = body;

    const updateData: any = { updatedAt: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (startDate !== undefined) updateData.startDate = startDate;
    if (endDate !== undefined) updateData.endDate = endDate;

    const [updated] = await db
      .update(projects)
      .set(updateData)
      .where(eq(projects.id, id))
      .returning();

    if (!updated) {
      return c.json({ success: false, error: 'Project not found' }, 404);
    }

    return c.json(success(updated));
  } catch (err) {
    const e = handleError('Update project', err);
    return c.json(e.body, e.status);
  }
});

// DELETE /api/projects/:id - Delete a project
app.delete('/:id', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const id = c.req.param('id');

    const [deleted] = await db.delete(projects).where(eq(projects.id, id)).returning();

    if (!deleted) {
      return c.json({ success: false, error: 'Project not found' }, 404);
    }

    return c.json(success({ message: 'Project deleted successfully' }));
  } catch (err) {
    const e = handleError('Delete project', err);
    return c.json(e.body, e.status);
  }
});

export default app;
