import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, sql, count } from 'drizzle-orm';
import { departments, employees } from '../../db/schema';
import { success, error } from '../utils/response';

type Env = { Bindings: { DB: D1Database; JWT_SECRET: string } };
const departmentsRouter = new Hono<Env>();

// GET / - List all departments with employee count
departmentsRouter.get('/', async (c) => {
  try {
    const db = drizzle(c.env.DB);

    const results = await db
      .select({
        id: departments.id,
        name: departments.name,
        code: departments.code,
        description: departments.description,
        headId: departments.headId,
        parentId: departments.parentId,
        active: departments.active,
        createdAt: departments.createdAt,
        employeeCount: sql<number>`(
          SELECT COUNT(*) FROM employees
          WHERE employees.department_id = departments.id
          AND employees.status != 'terminated'
        )`.as('employee_count'),
      })
      .from(departments)
      .orderBy(departments.name);

    return c.json(success(results));
  } catch (err) {
    const e = error('Failed to fetch departments', 500);
    return c.json(e.body, e.status);
  }
});

// GET /:id - Get department with employee count and head name
departmentsRouter.get('/:id', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const id = c.req.param('id');

    const results = await db
      .select({
        id: departments.id,
        name: departments.name,
        code: departments.code,
        description: departments.description,
        headId: departments.headId,
        parentId: departments.parentId,
        active: departments.active,
        createdAt: departments.createdAt,
        employeeCount: sql<number>`(
          SELECT COUNT(*) FROM employees
          WHERE employees.department_id = departments.id
          AND employees.status != 'terminated'
        )`.as('employee_count'),
      })
      .from(departments)
      .where(eq(departments.id, id))
      .limit(1);

    if (results.length === 0) {
      const e = error('Department not found', 404);
      return c.json(e.body, e.status);
    }

    const department = results[0];

    // Fetch head name if headId exists (headId references users table, but we look up
    // the employee record linked to that user for a display name)
    let headName: string | null = null;
    if (department.headId) {
      // headId references users.id; try to find the employee linked to that user
      const [headEmployee] = await db
        .select({
          firstName: employees.firstName,
          lastName: employees.lastName,
        })
        .from(employees)
        .where(eq(employees.userId, department.headId))
        .limit(1);
      if (headEmployee) {
        headName = `${headEmployee.firstName} ${headEmployee.lastName}`;
      }
    }

    return c.json(success({ ...department, headName }));
  } catch (err) {
    const e = error('Failed to fetch department', 500);
    return c.json(e.body, e.status);
  }
});

// POST / - Create department
departmentsRouter.post('/', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const body = await c.req.json();

    if (!body.name || !body.code) {
      const e = error('Department name and code are required', 400);
      return c.json(e.body, e.status);
    }

    const id = crypto.randomUUID();

    await db.insert(departments).values({
      id,
      name: body.name,
      code: body.code,
      description: body.description || null,
      headId: body.headId || null,
      parentId: body.parentId || null,
      active: body.active !== undefined ? body.active : 1,
    });

    const [created] = await db
      .select()
      .from(departments)
      .where(eq(departments.id, id))
      .limit(1);

    return c.json(success(created), 201);
  } catch (err) {
    const e = error('Failed to create department', 500);
    return c.json(e.body, e.status);
  }
});

// PUT /:id - Update department
departmentsRouter.put('/:id', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const id = c.req.param('id');
    const body = await c.req.json();

    // Check department exists
    const [existing] = await db
      .select()
      .from(departments)
      .where(eq(departments.id, id))
      .limit(1);
    if (!existing) {
      const e = error('Department not found', 404);
      return c.json(e.body, e.status);
    }

    await db
      .update(departments)
      .set({
        ...(body.name !== undefined && { name: body.name }),
        ...(body.code !== undefined && { code: body.code }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.headId !== undefined && { headId: body.headId }),
        ...(body.parentId !== undefined && { parentId: body.parentId }),
        ...(body.active !== undefined && { active: body.active }),
      })
      .where(eq(departments.id, id));

    const [updated] = await db
      .select()
      .from(departments)
      .where(eq(departments.id, id))
      .limit(1);

    return c.json(success(updated));
  } catch (err) {
    const e = error('Failed to update department', 500);
    return c.json(e.body, e.status);
  }
});

// DELETE /:id - Delete (only if no employees assigned)
departmentsRouter.delete('/:id', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const id = c.req.param('id');

    // Check department exists
    const [existing] = await db
      .select()
      .from(departments)
      .where(eq(departments.id, id))
      .limit(1);
    if (!existing) {
      const e = error('Department not found', 404);
      return c.json(e.body, e.status);
    }

    // Check if employees are assigned to this department
    const [empCount] = await db
      .select({ value: count() })
      .from(employees)
      .where(eq(employees.departmentId, id));

    if (empCount.value > 0) {
      const e = error(
        `Cannot delete department: ${empCount.value} employee(s) are still assigned to this department`,
        409
      );
      return c.json(e.body, e.status);
    }

    await db.delete(departments).where(eq(departments.id, id));

    return c.json(success({ message: 'Department deleted successfully' }));
  } catch (err) {
    const e = error('Failed to delete department', 500);
    return c.json(e.body, e.status);
  }
});

export default departmentsRouter;
