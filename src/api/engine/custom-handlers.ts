import type { Context } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, sql, count } from 'drizzle-orm';
import {
  employees,
  departments,
  employeeDocuments,
} from '../../db/schema';
import { success, error, handleError } from '../utils/response';

type Env = { Bindings: { DB: D1Database; JWT_SECRET: string } };

export const customHandlerRegistry: Record<string, (c: Context<Env>) => Promise<Response>> = {
  'employees.stats': async (c) => {
    try {
      const db = drizzle(c.env.DB);

      const [totalResult] = await db.select({ value: count() }).from(employees);
      const totalEmployees = totalResult.value;

      const [activeResult] = await db
        .select({ value: count() })
        .from(employees)
        .where(eq(employees.status, 'active'));
      const activeEmployees = activeResult.value;

      const byDepartment = await db
        .select({
          departmentId: employees.departmentId,
          departmentName: departments.name,
          count: count(),
        })
        .from(employees)
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .groupBy(employees.departmentId, departments.name);

      const byStatus = await db
        .select({
          status: employees.status,
          count: count(),
        })
        .from(employees)
        .groupBy(employees.status);

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
      const e = handleError('Fetch employee stats', err);
      return c.json(e.body, e.status);
    }
  },

  'employees.listDocuments': async (c) => {
    try {
      const db = drizzle(c.env.DB);
      const employeeId = c.req.param('id');

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
      const e = handleError('Fetch employee documents', err);
      return c.json(e.body, e.status);
    }
  },

  'employees.createDocument': async (c) => {
    try {
      const db = drizzle(c.env.DB);
      const employeeId = c.req.param('id');
      const body = await c.req.json();

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
      const e = handleError('Create employee document', err);
      return c.json(e.body, e.status);
    }
  },
};
