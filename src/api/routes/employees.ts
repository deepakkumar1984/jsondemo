import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, like, and, sql, desc, count } from 'drizzle-orm';
import {
  employees,
  departments,
  positions,
  employeeDocuments,
} from '../../db/schema';
import { success, error } from '../utils/response';
import { getPaginationParams, getOffset, buildMeta } from '../utils/pagination';

type Env = { Bindings: { DB: D1Database; JWT_SECRET: string } };
const employeesRouter = new Hono<Env>();

// GET / - List employees with pagination, search, and filters
employeesRouter.get('/', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const url = new URL(c.req.url);
    const paginationParams = getPaginationParams(url);
    const offset = getOffset(paginationParams);

    const search = c.req.query('search');
    const departmentId = c.req.query('departmentId');
    const status = c.req.query('status');
    const employmentType = c.req.query('employmentType');

    // Build filter conditions
    const conditions = [];
    if (search) {
      conditions.push(
        sql`(${employees.firstName} LIKE ${'%' + search + '%'} OR ${employees.lastName} LIKE ${'%' + search + '%'} OR ${employees.employeeCode} LIKE ${'%' + search + '%'})`
      );
    }
    if (departmentId) {
      conditions.push(eq(employees.departmentId, departmentId));
    }
    if (status) {
      conditions.push(eq(employees.status, status));
    }
    if (employmentType) {
      conditions.push(eq(employees.employmentType, employmentType));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [totalResult] = await db
      .select({ value: count() })
      .from(employees)
      .where(whereClause);
    const total = totalResult.value;

    // Get paginated results with joins
    const results = await db
      .select({
        id: employees.id,
        employeeCode: employees.employeeCode,
        firstName: employees.firstName,
        lastName: employees.lastName,
        email: employees.email,
        phone: employees.phone,
        departmentId: employees.departmentId,
        positionId: employees.positionId,
        managerId: employees.managerId,
        employmentType: employees.employmentType,
        status: employees.status,
        dateOfJoining: employees.dateOfJoining,
        createdAt: employees.createdAt,
        updatedAt: employees.updatedAt,
        departmentName: departments.name,
        positionTitle: positions.title,
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(positions, eq(employees.positionId, positions.id))
      .where(whereClause)
      .limit(paginationParams.limit)
      .offset(offset)
      .orderBy(desc(employees.createdAt));

    const meta = buildMeta(paginationParams, total);
    return c.json(success(results, meta));
  } catch (err) {
    const e = error('Failed to fetch employees', 500);
    return c.json(e.body, e.status);
  }
});

// GET /stats - Dashboard statistics
employeesRouter.get('/stats', async (c) => {
  try {
    const db = drizzle(c.env.DB);

    // Total employees
    const [totalResult] = await db.select({ value: count() }).from(employees);
    const totalEmployees = totalResult.value;

    // Active employees
    const [activeResult] = await db
      .select({ value: count() })
      .from(employees)
      .where(eq(employees.status, 'active'));
    const activeEmployees = activeResult.value;

    // By department breakdown
    const byDepartment = await db
      .select({
        departmentId: employees.departmentId,
        departmentName: departments.name,
        count: count(),
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .groupBy(employees.departmentId, departments.name);

    // By status breakdown
    const byStatus = await db
      .select({
        status: employees.status,
        count: count(),
      })
      .from(employees)
      .groupBy(employees.status);

    // Recent hires (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const [recentHiresResult] = await db
      .select({ value: count() })
      .from(employees)
      .where(sql`${employees.dateOfJoining} >= ${thirtyDaysAgoStr}`);
    const recentHires = recentHiresResult.value;

    return c.json(
      success({
        totalEmployees,
        activeEmployees,
        byDepartment,
        byStatus,
        recentHires,
      })
    );
  } catch (err) {
    const e = error('Failed to fetch employee statistics', 500);
    return c.json(e.body, e.status);
  }
});

// GET /:id - Get single employee with related data
employeesRouter.get('/:id', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const id = c.req.param('id');

    const results = await db
      .select({
        id: employees.id,
        userId: employees.userId,
        employeeCode: employees.employeeCode,
        firstName: employees.firstName,
        lastName: employees.lastName,
        email: employees.email,
        phone: employees.phone,
        dateOfBirth: employees.dateOfBirth,
        gender: employees.gender,
        maritalStatus: employees.maritalStatus,
        nationality: employees.nationality,
        address: employees.address,
        city: employees.city,
        state: employees.state,
        country: employees.country,
        postalCode: employees.postalCode,
        departmentId: employees.departmentId,
        positionId: employees.positionId,
        managerId: employees.managerId,
        dateOfJoining: employees.dateOfJoining,
        employmentType: employees.employmentType,
        status: employees.status,
        emergencyContactName: employees.emergencyContactName,
        emergencyContactPhone: employees.emergencyContactPhone,
        emergencyContactRelation: employees.emergencyContactRelation,
        bankName: employees.bankName,
        bankAccount: employees.bankAccount,
        bankIfsc: employees.bankIfsc,
        createdAt: employees.createdAt,
        updatedAt: employees.updatedAt,
        departmentName: departments.name,
        positionTitle: positions.title,
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(positions, eq(employees.positionId, positions.id))
      .where(eq(employees.id, id))
      .limit(1);

    if (results.length === 0) {
      const e = error('Employee not found', 404);
      return c.json(e.body, e.status);
    }

    const employee = results[0];

    // Fetch manager name if managerId exists
    let managerName: string | null = null;
    if (employee.managerId) {
      const [manager] = await db
        .select({
          firstName: employees.firstName,
          lastName: employees.lastName,
        })
        .from(employees)
        .where(eq(employees.id, employee.managerId))
        .limit(1);
      if (manager) {
        managerName = `${manager.firstName} ${manager.lastName}`;
      }
    }

    return c.json(success({ ...employee, managerName }));
  } catch (err) {
    const e = error('Failed to fetch employee', 500);
    return c.json(e.body, e.status);
  }
});

// POST / - Create employee
employeesRouter.post('/', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const body = await c.req.json();

    if (!body.firstName || !body.lastName || !body.email || !body.dateOfJoining || !body.employmentType) {
      const e = error('firstName, lastName, email, dateOfJoining, and employmentType are required', 400);
      return c.json(e.body, e.status);
    }

    const id = crypto.randomUUID();

    // Generate employee code like EMP-XXXX
    const [countResult] = await db.select({ value: count() }).from(employees);
    const nextNum = countResult.value + 1;
    const employeeCode = `EMP-${String(nextNum).padStart(4, '0')}`;

    const now = new Date().toISOString();

    await db.insert(employees).values({
      id,
      employeeCode,
      userId: body.userId || null,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone || null,
      dateOfBirth: body.dateOfBirth || null,
      gender: body.gender || null,
      maritalStatus: body.maritalStatus || null,
      nationality: body.nationality || null,
      address: body.address || null,
      city: body.city || null,
      state: body.state || null,
      country: body.country || null,
      postalCode: body.postalCode || null,
      departmentId: body.departmentId || null,
      positionId: body.positionId || null,
      managerId: body.managerId || null,
      dateOfJoining: body.dateOfJoining,
      employmentType: body.employmentType,
      status: body.status || 'active',
      emergencyContactName: body.emergencyContactName || null,
      emergencyContactPhone: body.emergencyContactPhone || null,
      emergencyContactRelation: body.emergencyContactRelation || null,
      bankName: body.bankName || null,
      bankAccount: body.bankAccount || null,
      bankIfsc: body.bankIfsc || null,
    });

    const [created] = await db
      .select()
      .from(employees)
      .where(eq(employees.id, id))
      .limit(1);

    return c.json(success(created), 201);
  } catch (err) {
    const e = error('Failed to create employee', 500);
    return c.json(e.body, e.status);
  }
});

// PUT /:id - Update employee
employeesRouter.put('/:id', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const id = c.req.param('id');
    const body = await c.req.json();

    // Check employee exists
    const [existing] = await db
      .select()
      .from(employees)
      .where(eq(employees.id, id))
      .limit(1);
    if (!existing) {
      const e = error('Employee not found', 404);
      return c.json(e.body, e.status);
    }

    const now = new Date().toISOString();

    await db
      .update(employees)
      .set({
        ...body,
        updatedAt: now,
      })
      .where(eq(employees.id, id));

    const [updated] = await db
      .select()
      .from(employees)
      .where(eq(employees.id, id))
      .limit(1);

    return c.json(success(updated));
  } catch (err) {
    const e = error('Failed to update employee', 500);
    return c.json(e.body, e.status);
  }
});

// DELETE /:id - Soft delete (set status to 'terminated')
employeesRouter.delete('/:id', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const id = c.req.param('id');

    const [existing] = await db
      .select()
      .from(employees)
      .where(eq(employees.id, id))
      .limit(1);
    if (!existing) {
      const e = error('Employee not found', 404);
      return c.json(e.body, e.status);
    }

    const now = new Date().toISOString();

    await db
      .update(employees)
      .set({
        status: 'terminated',
        updatedAt: now,
      })
      .where(eq(employees.id, id));

    return c.json(success({ message: 'Employee terminated successfully' }));
  } catch (err) {
    const e = error('Failed to delete employee', 500);
    return c.json(e.body, e.status);
  }
});

// GET /:id/documents - List employee documents
employeesRouter.get('/:id/documents', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const employeeId = c.req.param('id');

    // Verify employee exists
    const [emp] = await db
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1);
    if (!emp) {
      const e = error('Employee not found', 404);
      return c.json(e.body, e.status);
    }

    const docs = await db
      .select()
      .from(employeeDocuments)
      .where(eq(employeeDocuments.employeeId, employeeId));

    return c.json(success(docs));
  } catch (err) {
    const e = error('Failed to fetch documents', 500);
    return c.json(e.body, e.status);
  }
});

// POST /:id/documents - Create document metadata
employeesRouter.post('/:id/documents', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const employeeId = c.req.param('id');
    const body = await c.req.json();

    // Verify employee exists
    const [emp] = await db
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1);
    if (!emp) {
      const e = error('Employee not found', 404);
      return c.json(e.body, e.status);
    }

    if (!body.name || !body.type || !body.fileUrl) {
      const e = error('name, type, and fileUrl are required', 400);
      return c.json(e.body, e.status);
    }

    const id = crypto.randomUUID();

    await db.insert(employeeDocuments).values({
      id,
      employeeId,
      name: body.name,
      type: body.type,
      fileUrl: body.fileUrl,
    });

    const [created] = await db
      .select()
      .from(employeeDocuments)
      .where(eq(employeeDocuments.id, id))
      .limit(1);

    return c.json(success(created), 201);
  } catch (err) {
    const e = error('Failed to create document', 500);
    return c.json(e.body, e.status);
  }
});

export default employeesRouter;
