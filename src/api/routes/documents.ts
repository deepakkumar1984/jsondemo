import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, count } from 'drizzle-orm';
import { employeeDocuments, employees } from '../../db/schema';
import { success, error } from '../utils/response';
import { getPaginationParams, getOffset, buildMeta } from '../utils/pagination';

type Env = { Bindings: { DB: D1Database; JWT_SECRET: string } };
const documentsRouter = new Hono<Env>();

// GET / - List all documents (paginated)
documentsRouter.get('/', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const url = new URL(c.req.url);
    const paginationParams = getPaginationParams(url);
    const offset = getOffset(paginationParams);

    // Get total count
    const [totalResult] = await db
      .select({ value: count() })
      .from(employeeDocuments);
    const total = totalResult.value;

    // Get paginated results with employee info
    const results = await db
      .select({
        id: employeeDocuments.id,
        employeeId: employeeDocuments.employeeId,
        name: employeeDocuments.name,
        type: employeeDocuments.type,
        fileUrl: employeeDocuments.fileUrl,
        uploadedAt: employeeDocuments.uploadedAt,
        employeeFirstName: employees.firstName,
        employeeLastName: employees.lastName,
        employeeCode: employees.employeeCode,
      })
      .from(employeeDocuments)
      .leftJoin(employees, eq(employeeDocuments.employeeId, employees.id))
      .limit(paginationParams.limit)
      .offset(offset);

    const meta = buildMeta(paginationParams, total);
    return c.json(success(results, meta));
  } catch (err) {
    const e = error('Failed to fetch documents', 500);
    return c.json(e.body, e.status);
  }
});

// POST / - Create document
documentsRouter.post('/', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const body = await c.req.json();

    if (!body.employeeId || !body.name || !body.type || !body.fileUrl) {
      const e = error('employeeId, name, type, and fileUrl are required', 400);
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

    await db.insert(employeeDocuments).values({
      id,
      employeeId: body.employeeId,
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

export default documentsRouter;
