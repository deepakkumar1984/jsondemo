import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, count } from 'drizzle-orm';
import { positions, departments, employees } from '../../db/schema';
import { success, error } from '../utils/response';

type Env = { Bindings: { DB: D1Database; JWT_SECRET: string } };
const positionsRouter = new Hono<Env>();

// GET / - List all positions, filterable by departmentId. Include department name.
positionsRouter.get('/', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const departmentId = c.req.query('departmentId');

    const baseQuery = db
      .select({
        id: positions.id,
        title: positions.title,
        code: positions.code,
        departmentId: positions.departmentId,
        level: positions.level,
        minSalary: positions.minSalary,
        maxSalary: positions.maxSalary,
        active: positions.active,
        createdAt: positions.createdAt,
        departmentName: departments.name,
      })
      .from(positions)
      .leftJoin(departments, eq(positions.departmentId, departments.id))
      .orderBy(positions.title);

    let results;
    if (departmentId) {
      results = await baseQuery.where(eq(positions.departmentId, departmentId));
    } else {
      results = await baseQuery;
    }

    return c.json(success(results));
  } catch (err) {
    const e = error('Failed to fetch positions', 500);
    return c.json(e.body, e.status);
  }
});

// GET /:id - Get single position with department name
positionsRouter.get('/:id', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const id = c.req.param('id');

    const results = await db
      .select({
        id: positions.id,
        title: positions.title,
        code: positions.code,
        departmentId: positions.departmentId,
        level: positions.level,
        minSalary: positions.minSalary,
        maxSalary: positions.maxSalary,
        active: positions.active,
        createdAt: positions.createdAt,
        departmentName: departments.name,
      })
      .from(positions)
      .leftJoin(departments, eq(positions.departmentId, departments.id))
      .where(eq(positions.id, id))
      .limit(1);

    if (results.length === 0) {
      const e = error('Position not found', 404);
      return c.json(e.body, e.status);
    }

    return c.json(success(results[0]));
  } catch (err) {
    const e = error('Failed to fetch position', 500);
    return c.json(e.body, e.status);
  }
});

// POST / - Create position
positionsRouter.post('/', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const body = await c.req.json();

    if (!body.title || !body.code) {
      const e = error('Position title and code are required', 400);
      return c.json(e.body, e.status);
    }

    const id = crypto.randomUUID();

    await db.insert(positions).values({
      id,
      title: body.title,
      code: body.code,
      departmentId: body.departmentId || null,
      level: body.level || null,
      minSalary: body.minSalary || null,
      maxSalary: body.maxSalary || null,
      active: body.active !== undefined ? body.active : 1,
    });

    const [created] = await db
      .select()
      .from(positions)
      .where(eq(positions.id, id))
      .limit(1);

    return c.json(success(created), 201);
  } catch (err) {
    const e = error('Failed to create position', 500);
    return c.json(e.body, e.status);
  }
});

// PUT /:id - Update position
positionsRouter.put('/:id', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const id = c.req.param('id');
    const body = await c.req.json();

    // Check position exists
    const [existing] = await db
      .select()
      .from(positions)
      .where(eq(positions.id, id))
      .limit(1);
    if (!existing) {
      const e = error('Position not found', 404);
      return c.json(e.body, e.status);
    }

    await db
      .update(positions)
      .set({
        ...(body.title !== undefined && { title: body.title }),
        ...(body.code !== undefined && { code: body.code }),
        ...(body.departmentId !== undefined && { departmentId: body.departmentId }),
        ...(body.level !== undefined && { level: body.level }),
        ...(body.minSalary !== undefined && { minSalary: body.minSalary }),
        ...(body.maxSalary !== undefined && { maxSalary: body.maxSalary }),
        ...(body.active !== undefined && { active: body.active }),
      })
      .where(eq(positions.id, id));

    const [updated] = await db
      .select()
      .from(positions)
      .where(eq(positions.id, id))
      .limit(1);

    return c.json(success(updated));
  } catch (err) {
    const e = error('Failed to update position', 500);
    return c.json(e.body, e.status);
  }
});

// DELETE /:id - Delete (only if no employees assigned)
positionsRouter.delete('/:id', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const id = c.req.param('id');

    // Check position exists
    const [existing] = await db
      .select()
      .from(positions)
      .where(eq(positions.id, id))
      .limit(1);
    if (!existing) {
      const e = error('Position not found', 404);
      return c.json(e.body, e.status);
    }

    // Check if employees are assigned to this position
    const [empCount] = await db
      .select({ value: count() })
      .from(employees)
      .where(eq(employees.positionId, id));

    if (empCount.value > 0) {
      const e = error(
        `Cannot delete position: ${empCount.value} employee(s) are still assigned to this position`,
        409
      );
      return c.json(e.body, e.status);
    }

    await db.delete(positions).where(eq(positions.id, id));

    return c.json(success({ message: 'Position deleted successfully' }));
  } catch (err) {
    const e = error('Failed to delete position', 500);
    return c.json(e.body, e.status);
  }
});

export default positionsRouter;
