import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, desc, count } from 'drizzle-orm';
import {
  attendance,
  leaveRequests,
  leaveTypes,
  employees,
} from '../../db/schema';
import { success, error } from '../utils/response';
import { getPaginationParams, getOffset, buildMeta } from '../utils/pagination';

type Env = { Bindings: { DB: D1Database; JWT_SECRET: string } };
const workforceRouter = new Hono<Env>();

// ---------- Attendance ----------

// GET /attendance - List attendance records
workforceRouter.get('/attendance', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const url = new URL(c.req.url);
    const paginationParams = getPaginationParams(url);
    const offset = getOffset(paginationParams);

    const employeeId = c.req.query('employeeId');
    const date = c.req.query('date');

    // Build filter conditions
    const conditions = [];
    if (employeeId) {
      conditions.push(eq(attendance.employeeId, employeeId));
    }
    if (date) {
      conditions.push(eq(attendance.date, date));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db
      .select({ value: count() })
      .from(attendance)
      .where(whereClause);
    const total = totalResult.value;

    const results = await db
      .select({
        id: attendance.id,
        employeeId: attendance.employeeId,
        date: attendance.date,
        checkIn: attendance.checkIn,
        checkOut: attendance.checkOut,
        status: attendance.status,
        hoursWorked: attendance.hoursWorked,
        employeeFirstName: employees.firstName,
        employeeLastName: employees.lastName,
        employeeCode: employees.employeeCode,
      })
      .from(attendance)
      .leftJoin(employees, eq(attendance.employeeId, employees.id))
      .where(whereClause)
      .orderBy(desc(attendance.date))
      .limit(paginationParams.limit)
      .offset(offset);

    const meta = buildMeta(paginationParams, total);
    return c.json(success(results, meta));
  } catch (err) {
    const e = error('Failed to fetch attendance records', 500);
    return c.json(e.body, e.status);
  }
});

// POST /attendance - Create attendance record
workforceRouter.post('/attendance', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const body = await c.req.json();

    if (!body.employeeId || !body.date) {
      const e = error('employeeId and date are required', 400);
      return c.json(e.body, e.status);
    }

    // Verify employee exists
    const [emp] = await db
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.id, body.employeeId))
      .limit(1);
    if (!emp) {
      const e = error('Employee not found', 404);
      return c.json(e.body, e.status);
    }

    const id = crypto.randomUUID();

    await db.insert(attendance).values({
      id,
      employeeId: body.employeeId,
      date: body.date,
      checkIn: body.checkIn || null,
      checkOut: body.checkOut || null,
      status: body.status || 'present',
      hoursWorked: body.hoursWorked || null,
    });

    const [created] = await db
      .select()
      .from(attendance)
      .where(eq(attendance.id, id))
      .limit(1);

    return c.json(success(created), 201);
  } catch (err) {
    const e = error('Failed to create attendance record', 500);
    return c.json(e.body, e.status);
  }
});

// ---------- Leave Requests ----------

// GET /leave-requests - List leave requests
workforceRouter.get('/leave-requests', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const url = new URL(c.req.url);
    const paginationParams = getPaginationParams(url);
    const offset = getOffset(paginationParams);

    const employeeId = c.req.query('employeeId');
    const status = c.req.query('status');

    // Build filter conditions
    const conditions = [];
    if (employeeId) {
      conditions.push(eq(leaveRequests.employeeId, employeeId));
    }
    if (status) {
      conditions.push(eq(leaveRequests.status, status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db
      .select({ value: count() })
      .from(leaveRequests)
      .where(whereClause);
    const total = totalResult.value;

    const results = await db
      .select({
        id: leaveRequests.id,
        employeeId: leaveRequests.employeeId,
        leaveTypeId: leaveRequests.leaveTypeId,
        fromDate: leaveRequests.fromDate,
        toDate: leaveRequests.toDate,
        days: leaveRequests.days,
        reason: leaveRequests.reason,
        status: leaveRequests.status,
        approvedBy: leaveRequests.approvedBy,
        employeeFirstName: employees.firstName,
        employeeLastName: employees.lastName,
        employeeCode: employees.employeeCode,
        leaveTypeName: leaveTypes.name,
      })
      .from(leaveRequests)
      .leftJoin(employees, eq(leaveRequests.employeeId, employees.id))
      .leftJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
      .where(whereClause)
      .limit(paginationParams.limit)
      .offset(offset);

    const meta = buildMeta(paginationParams, total);
    return c.json(success(results, meta));
  } catch (err) {
    const e = error('Failed to fetch leave requests', 500);
    return c.json(e.body, e.status);
  }
});

// POST /leave-requests - Create leave request
workforceRouter.post('/leave-requests', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const body = await c.req.json();

    if (!body.employeeId || !body.leaveTypeId || !body.fromDate || !body.toDate || !body.days) {
      const e = error('employeeId, leaveTypeId, fromDate, toDate, and days are required', 400);
      return c.json(e.body, e.status);
    }

    // Verify employee exists
    const [emp] = await db
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.id, body.employeeId))
      .limit(1);
    if (!emp) {
      const e = error('Employee not found', 404);
      return c.json(e.body, e.status);
    }

    // Verify leave type exists
    const [lt] = await db
      .select({ id: leaveTypes.id })
      .from(leaveTypes)
      .where(eq(leaveTypes.id, body.leaveTypeId))
      .limit(1);
    if (!lt) {
      const e = error('Leave type not found', 404);
      return c.json(e.body, e.status);
    }

    const id = crypto.randomUUID();

    await db.insert(leaveRequests).values({
      id,
      employeeId: body.employeeId,
      leaveTypeId: body.leaveTypeId,
      fromDate: body.fromDate,
      toDate: body.toDate,
      days: body.days,
      reason: body.reason || null,
      status: 'pending',
      approvedBy: null,
    });

    const [created] = await db
      .select()
      .from(leaveRequests)
      .where(eq(leaveRequests.id, id))
      .limit(1);

    return c.json(success(created), 201);
  } catch (err) {
    const e = error('Failed to create leave request', 500);
    return c.json(e.body, e.status);
  }
});

// ---------- Leave Types ----------

// GET /leave-types - List leave types
workforceRouter.get('/leave-types', async (c) => {
  try {
    const db = drizzle(c.env.DB);

    const results = await db
      .select()
      .from(leaveTypes)
      .orderBy(leaveTypes.name);

    return c.json(success(results));
  } catch (err) {
    const e = error('Failed to fetch leave types', 500);
    return c.json(e.body, e.status);
  }
});

export default workforceRouter;
