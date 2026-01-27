import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc, count } from 'drizzle-orm';
import { payrollRuns, salaryStructures } from '../../db/schema';
import { success, error } from '../utils/response';
import { getPaginationParams, getOffset, buildMeta } from '../utils/pagination';

type Env = { Bindings: { DB: D1Database; JWT_SECRET: string } };
const payrollRouter = new Hono<Env>();

// ---------- Payroll Runs ----------

// GET /runs - List payroll runs
payrollRouter.get('/runs', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const url = new URL(c.req.url);
    const paginationParams = getPaginationParams(url);
    const offset = getOffset(paginationParams);

    const [totalResult] = await db
      .select({ value: count() })
      .from(payrollRuns);
    const total = totalResult.value;

    const results = await db
      .select()
      .from(payrollRuns)
      .limit(paginationParams.limit)
      .offset(offset);

    const meta = buildMeta(paginationParams, total);
    return c.json(success(results, meta));
  } catch (err) {
    const e = error('Failed to fetch payroll runs', 500);
    return c.json(e.body, e.status);
  }
});

// POST /runs - Create a payroll run
payrollRouter.post('/runs', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const body = await c.req.json();

    if (!body.periodMonth || !body.periodYear) {
      const e = error('periodMonth and periodYear are required', 400);
      return c.json(e.body, e.status);
    }

    const id = crypto.randomUUID();

    await db.insert(payrollRuns).values({
      id,
      periodMonth: body.periodMonth,
      periodYear: body.periodYear,
      status: body.status || 'draft',
      runDate: body.runDate || null,
      approvedBy: body.approvedBy || null,
      totalAmount: body.totalAmount || null,
    });

    const [created] = await db
      .select()
      .from(payrollRuns)
      .where(eq(payrollRuns.id, id))
      .limit(1);

    return c.json(success(created), 201);
  } catch (err) {
    const e = error('Failed to create payroll run', 500);
    return c.json(e.body, e.status);
  }
});

// ---------- Salary Structures ----------

// GET /structures - List salary structures
payrollRouter.get('/structures', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const url = new URL(c.req.url);
    const paginationParams = getPaginationParams(url);
    const offset = getOffset(paginationParams);

    const [totalResult] = await db
      .select({ value: count() })
      .from(salaryStructures);
    const total = totalResult.value;

    const results = await db
      .select()
      .from(salaryStructures)
      .limit(paginationParams.limit)
      .offset(offset);

    const meta = buildMeta(paginationParams, total);
    return c.json(success(results, meta));
  } catch (err) {
    const e = error('Failed to fetch salary structures', 500);
    return c.json(e.body, e.status);
  }
});

// POST /structures - Create salary structure
payrollRouter.post('/structures', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const body = await c.req.json();

    if (!body.name) {
      const e = error('Salary structure name is required', 400);
      return c.json(e.body, e.status);
    }

    const id = crypto.randomUUID();

    await db.insert(salaryStructures).values({
      id,
      name: body.name,
      description: body.description || null,
      active: body.active !== undefined ? body.active : 1,
    });

    const [created] = await db
      .select()
      .from(salaryStructures)
      .where(eq(salaryStructures.id, id))
      .limit(1);

    return c.json(success(created), 201);
  } catch (err) {
    const e = error('Failed to create salary structure', 500);
    return c.json(e.body, e.status);
  }
});

export default payrollRouter;
