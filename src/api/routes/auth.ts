import { Hono } from 'hono';
import { createDataClient, AppEnv } from '../../db/data-client';
import { createJWT, verifyJWT, authMiddleware } from '../middleware/auth';
import { success, handleError } from '../utils/response';

type Env = { Bindings: AppEnv };
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

    const client = createDataClient(c.env);

    // Find user by email using Data API
    const usersResult = await client.getItems('users', {
      filter: { email: { _eq: email } },
      limit: 1
    });

    const user = usersResult.data[0];

    if (!user) {
      return c.json({ success: false, error: 'Invalid credentials' }, 401);
    }

    const hashed = await hashPassword(password);
    if (hashed !== user.password_hash) {
      return c.json({ success: false, error: 'Invalid credentials' }, 401);
    }

    // Check is_active (new schema) or active (old schema fallback)
    if (user.is_active === false || user.active === false || user.is_suspended === true) {
      return c.json({ success: false, error: 'Account disabled or suspended' }, 403);
    }

    const userId = String(user.id);
    const userEmail = String(user.email);
    // Use display_name as primary name, fallback to name (old schema)
    const displayName = String(user.display_name || user.name || '');
    const userRole = String(user.role);

    const token = await createJWT(
      { sub: userId, email: userEmail, name: displayName, display_name: displayName, role: userRole },
      c.env.JWT_SECRET
    );

    return c.json(
      success({
        token,
        user: { id: userId, email: userEmail, display_name: displayName, role: userRole },
      })
    );
  } catch (err) {
    const e = handleError('Login', err);
    return c.json(e.body, e.status);
  }
});

// POST /api/auth/register (admin only - in a real app you'd protect this)
auth.post('/register', async (c) => {
  try {
    const { email, password, display_name, role } = await c.req.json();
    if (!email || !password || !display_name) {
      return c.json({ success: false, error: 'Email, password, and display_name required' }, 400);
    }

    const client = createDataClient(c.env);

    // Check if email already exists
    const existingResult = await client.getItems('users', {
      filter: { email: { _eq: email } },
      limit: 1
    });

    if (existingResult.data.length > 0) {
      return c.json({ success: false, error: 'Email already registered' }, 409);
    }

    const id = crypto.randomUUID();
    const password_hash = await hashPassword(password);

    // Create user via Data API (using snake_case column names)
    // Removed old 'name' field, changed to 'display_name'
    const newUserItem: any = {
      id,
      email,
      password_hash,
      display_name,
      role: role || 'employee',
      // active: true, // Check if 'active' or 'is_active' is in schema. Schema has 'is_active'.
      is_active: true
    };

    await client.createItem('users', newUserItem);

    return c.json(success({ id, email, display_name, role: role || 'employee' }), 201);
  } catch (err) {
    const e = handleError('Register', err);
    return c.json(e.body, e.status);
  }
});

// GET /api/auth/me
auth.get('/me', authMiddleware, async (c) => {
  try {
    const user = (c as any).get('user') as any; // Cast to access properties
    // Map JWT standard claims to User interface
    const userData = {
        id: user.sub,
        email: user.email,
        display_name: user.display_name || user.name,
        role: user.role
    };
    return c.json(success(userData));
  } catch (err) {
    const e = handleError('Get current user', err);
    return c.json(e.body, e.status);
  }
});

// POST /api/auth/forgot-password
auth.post('/forgot-password', async (c) => {
  try {
    const { email } = await c.req.json();
    if (!email) {
      return c.json({ success: false, error: 'Email is required' }, 400);
    }

    const client = createDataClient(c.env);

    // Find user by email
    const usersResult = await client.getItems('users', {
      filter: { email: { _eq: email } },
      limit: 1
    });

    const user = usersResult.data[0];

    // Always return success to prevent email enumeration
    // In production, you would send an email if user exists
    if (!user) {
      return c.json(success({ message: 'If an account exists with that email, a reset link has been sent.' }));
    }

    // Generate reset token (JWT valid for 1 hour)
    const resetToken = await createJWT(
      { sub: String(user.id), email: String(user.email), purpose: 'password-reset' },
      c.env.JWT_SECRET,
      3600 // 1 hour
    );

    // In production: send email with reset link
    // For demo mode, return the token directly
    return c.json(success({
      message: 'If an account exists with that email, a reset link has been sent.',
      resetToken // Remove this in production - only for demo
    }));
  } catch (err) {
    const e = handleError('Forgot password', err);
    return c.json(e.body, e.status);
  }
});

// POST /api/auth/reset-password
auth.post('/reset-password', async (c) => {
  try {
    const { token, password } = await c.req.json();
    if (!token || !password) {
      return c.json({ success: false, error: 'Token and password are required' }, 400);
    }

    if (password.length < 6) {
      return c.json({ success: false, error: 'Password must be at least 6 characters' }, 400);
    }

    // Verify reset token
    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    if (!payload) {
      return c.json({ success: false, error: 'Invalid or expired reset token' }, 400);
    }

    // Verify token purpose
    if (payload.purpose !== 'password-reset') {
      return c.json({ success: false, error: 'Invalid reset token' }, 400);
    }

    const client = createDataClient(c.env);

    // Find user by ID from token
    const usersResult = await client.getItems('users', {
      filter: { id: { _eq: payload.sub } },
      limit: 1
    });

    const user = usersResult.data[0];
    if (!user) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    // Update password (using snake_case column name)
    const password_hash = await hashPassword(password);
    await client.updateItem('users', String(user.id), { password_hash });

    return c.json(success({ message: 'Password reset successfully' }));
  } catch (err) {
    const e = handleError('Reset password', err);
    return c.json(e.body, e.status);
  }
});

export default auth;
