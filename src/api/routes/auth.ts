import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { users } from '../../db/schema';
import { createJWT, authMiddleware } from '../middleware/auth';
import { success } from '../utils/response';

type Env = { Bindings: { DB: D1Database; JWT_SECRET: string } };
const auth = new Hono<Env>();

// Helper: hash password with Web Crypto API (Cloudflare Workers compatible)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// POST /api/auth/login
auth.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json();
    if (!email || !password) {
      return c.json({ success: false, error: 'Email and password required' }, 400);
    }

    const db = drizzle(c.env.DB);
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      return c.json({ success: false, error: 'Invalid credentials' }, 401);
    }

    const hashed = await hashPassword(password);
    if (hashed !== user.passwordHash) {
      return c.json({ success: false, error: 'Invalid credentials' }, 401);
    }

    if (!user.active) {
      return c.json({ success: false, error: 'Account disabled' }, 403);
    }

    const token = await createJWT(
      { sub: user.id, email: user.email, name: user.name, role: user.role },
      c.env.JWT_SECRET
    );

    return c.json(
      success({
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      })
    );
  } catch (err) {
    return c.json({ success: false, error: 'Login failed' }, 500);
  }
});

// POST /api/auth/register (admin only - in a real app you'd protect this)
auth.post('/register', async (c) => {
  try {
    const { email, password, name, role } = await c.req.json();
    if (!email || !password || !name) {
      return c.json({ success: false, error: 'Email, password, and name required' }, 400);
    }

    const db = drizzle(c.env.DB);
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      return c.json({ success: false, error: 'Email already registered' }, 409);
    }

    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    await db.insert(users).values({
      id,
      email,
      passwordHash,
      name,
      role: role || 'employee',
      active: 1,
    });

    return c.json(success({ id, email, name, role: role || 'employee' }), 201);
  } catch (err) {
    return c.json({ success: false, error: 'Registration failed' }, 500);
  }
});

// GET /api/auth/me
auth.get('/me', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    return c.json(success(user));
  } catch (err) {
    return c.json({ success: false, error: 'Failed to retrieve user info' }, 500);
  }
});

export default auth;
