import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, like, or } from 'drizzle-orm';
import { users } from '../../db/schema';
import { authMiddleware } from '../middleware/auth';
import { success, handleError } from '../utils/response';

type Env = { Bindings: { DB: D1Database; JWT_SECRET: string } };

const app = new Hono<Env>();

// Apply auth middleware to all routes
app.use('*', authMiddleware);

// GET /api/users - List all users
app.get('/', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const { role, search } = c.req.query();

    let conditions = [];
    if (role) {
      conditions.push(eq(users.role, role));
    }
    if (search) {
      conditions.push(
        or(
          like(users.name, `%${search}%`),
          like(users.email, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0
      ? conditions.length === 1 ? conditions[0] : undefined
      : undefined;

    // Don't expose password hashes
    const results = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(whereClause);

    return c.json(success(results));
  } catch (err) {
    const e = handleError('Fetch users', err);
    return c.json(e.body, e.status);
  }
});

// GET /api/users/:id - Get a single user
app.get('/:id', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const id = c.req.param('id');

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    return c.json(success(user));
  } catch (err) {
    const e = handleError('Fetch user', err);
    return c.json(e.body, e.status);
  }
});

// POST /api/users - Create a new user (admin only check should be added)
app.post('/', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const body = await c.req.json();
    const currentUser = (c as any).get('user');

    // Only admins can create users
    if (currentUser.role !== 'admin') {
      return c.json({ success: false, error: 'Forbidden' }, 403);
    }

    const { name, email, password, role } = body;

    if (!name || !email || !password) {
      return c.json({ success: false, error: 'Name, email, and password are required' }, 400);
    }

    // Check if email already exists
    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing) {
      return c.json({ success: false, error: 'Email already registered' }, 409);
    }

    // Hash password
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const passwordHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const [newUser] = await db
      .insert(users)
      .values({
        id: crypto.randomUUID(),
        name,
        email,
        passwordHash,
        role: role || 'user',
      })
      .returning();

    // Don't return password hash
    const { passwordHash: _, ...userWithoutPassword } = newUser;
    return c.json(success(userWithoutPassword), 201);
  } catch (err) {
    const e = handleError('Create user', err);
    return c.json(e.body, e.status);
  }
});

// PUT /api/users/:id - Update a user
app.put('/:id', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const id = c.req.param('id');
    const body = await c.req.json();
    const currentUser = (c as any).get('user');

    // Users can only update themselves, admins can update anyone
    if (currentUser.id !== id && currentUser.role !== 'admin') {
      return c.json({ success: false, error: 'Forbidden' }, 403);
    }

    const { name, email, role } = body;

    const updateData: any = { updatedAt: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined && currentUser.role === 'admin') {
      updateData.role = role;
    }

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();

    if (!updated) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    // Don't return password hash
    const { passwordHash: _, ...userWithoutPassword } = updated;
    return c.json(success(userWithoutPassword));
  } catch (err) {
    const e = handleError('Update user', err);
    return c.json(e.body, e.status);
  }
});

// DELETE /api/users/:id - Delete a user (admin only)
app.delete('/:id', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const id = c.req.param('id');
    const currentUser = (c as any).get('user');

    // Only admins can delete users
    if (currentUser.role !== 'admin') {
      return c.json({ success: false, error: 'Forbidden' }, 403);
    }

    const [deleted] = await db.delete(users).where(eq(users.id, id)).returning();

    if (!deleted) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    return c.json(success({ message: 'User deleted successfully' }));
  } catch (err) {
    const e = handleError('Delete user', err);
    return c.json(e.body, e.status);
  }
});

export default app;
