import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc, count } from 'drizzle-orm';
import {
  jobPostings,
  performanceReviews,
  employees,
  departments,
  positions,
} from '../../db/schema';
import { success, error } from '../utils/response';
import { getPaginationParams, getOffset, buildMeta } from '../utils/pagination';

type Env = { Bindings: { DB: D1Database; JWT_SECRET: string } };
const talentRouter = new Hono<Env>();

// ---------- Job Postings ----------

// GET /jobs - List job postings
talentRouter.get('/jobs', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const url = new URL(c.req.url);
    const paginationParams = getPaginationParams(url);
    const offset = getOffset(paginationParams);

    const status = c.req.query('status');
    const departmentId = c.req.query('departmentId');

    const [totalResult] = await db
      .select({ value: count() })
      .from(jobPostings);
    const total = totalResult.value;

    const baseQuery = db
      .select({
        id: jobPostings.id,
        title: jobPostings.title,
        departmentId: jobPostings.departmentId,
        positionId: jobPostings.positionId,
        description: jobPostings.description,
        requirements: jobPostings.requirements,
        status: jobPostings.status,
        postedDate: jobPostings.postedDate,
        closingDate: jobPostings.closingDate,
        departmentName: departments.name,
        positionTitle: positions.title,
      })
      .from(jobPostings)
      .leftJoin(departments, eq(jobPostings.departmentId, departments.id))
      .leftJoin(positions, eq(jobPostings.positionId, positions.id))
      .limit(paginationParams.limit)
      .offset(offset);

    let results;
    if (status) {
      results = await baseQuery.where(eq(jobPostings.status, status));
    } else if (departmentId) {
      results = await baseQuery.where(eq(jobPostings.departmentId, departmentId));
    } else {
      results = await baseQuery;
    }

    const meta = buildMeta(paginationParams, total);
    return c.json(success(results, meta));
  } catch (err) {
    const e = error('Failed to fetch job postings', 500);
    return c.json(e.body, e.status);
  }
});

// POST /jobs - Create job posting
talentRouter.post('/jobs', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const body = await c.req.json();

    if (!body.title) {
      const e = error('Job posting title is required', 400);
      return c.json(e.body, e.status);
    }

    const id = crypto.randomUUID();

    await db.insert(jobPostings).values({
      id,
      title: body.title,
      departmentId: body.departmentId || null,
      positionId: body.positionId || null,
      description: body.description || null,
      requirements: body.requirements || null,
      status: body.status || 'draft',
      postedDate: body.postedDate || null,
      closingDate: body.closingDate || null,
    });

    const [created] = await db
      .select()
      .from(jobPostings)
      .where(eq(jobPostings.id, id))
      .limit(1);

    return c.json(success(created), 201);
  } catch (err) {
    const e = error('Failed to create job posting', 500);
    return c.json(e.body, e.status);
  }
});

// ---------- Performance Reviews ----------

// GET /reviews - List performance reviews
talentRouter.get('/reviews', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const url = new URL(c.req.url);
    const paginationParams = getPaginationParams(url);
    const offset = getOffset(paginationParams);

    const employeeId = c.req.query('employeeId');

    const [totalResult] = await db
      .select({ value: count() })
      .from(performanceReviews);
    const total = totalResult.value;

    const baseQuery = db
      .select({
        id: performanceReviews.id,
        employeeId: performanceReviews.employeeId,
        reviewerId: performanceReviews.reviewerId,
        period: performanceReviews.period,
        rating: performanceReviews.rating,
        comments: performanceReviews.comments,
        status: performanceReviews.status,
        reviewDate: performanceReviews.reviewDate,
        employeeFirstName: employees.firstName,
        employeeLastName: employees.lastName,
      })
      .from(performanceReviews)
      .leftJoin(employees, eq(performanceReviews.employeeId, employees.id))
      .limit(paginationParams.limit)
      .offset(offset);

    let results;
    if (employeeId) {
      results = await baseQuery.where(eq(performanceReviews.employeeId, employeeId));
    } else {
      results = await baseQuery;
    }

    const meta = buildMeta(paginationParams, total);
    return c.json(success(results, meta));
  } catch (err) {
    const e = error('Failed to fetch performance reviews', 500);
    return c.json(e.body, e.status);
  }
});

// POST /reviews - Create performance review
talentRouter.post('/reviews', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const body = await c.req.json();

    if (!body.employeeId || !body.reviewerId || !body.period) {
      const e = error('employeeId, reviewerId, and period are required', 400);
      return c.json(e.body, e.status);
    }

    const id = crypto.randomUUID();

    await db.insert(performanceReviews).values({
      id,
      employeeId: body.employeeId,
      reviewerId: body.reviewerId,
      period: body.period,
      rating: body.rating || null,
      comments: body.comments || null,
      status: body.status || 'draft',
      reviewDate: body.reviewDate || null,
    });

    const [created] = await db
      .select()
      .from(performanceReviews)
      .where(eq(performanceReviews.id, id))
      .limit(1);

    return c.json(success(created), 201);
  } catch (err) {
    const e = error('Failed to create performance review', 500);
    return c.json(e.body, e.status);
  }
});

export default talentRouter;
