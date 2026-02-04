import { Hono } from 'hono';
import { createDataClient } from '../../src/db/data-client';

export const expensesRouter = new Hono<{ Bindings: Env }>();

expensesRouter.get('/', async (c) => {
  const client = createDataClient(c.env);
  const query = c.req.query();

  // Assume userId from auth context (e.g., via middleware)
  const userId = c.get('userId'); // Placeholder for auth

  const limit = parseInt(query.limit) || 10;
  const offset = parseInt(query.offset) || 0;
  const dateFrom = query.date_from;
  const dateTo = query.date_to;
  const status = query.status;
  const reimbursable = query.reimbursable === 'true';
  const q = query.q;

  const filter: any = {};
  if (userId) filter.created_by = { _eq: userId };
  if (dateFrom) filter.date = { ...filter.date, _gte: dateFrom };
  if (dateTo) filter.date = { ...filter.date, _lte: dateTo };
  if (status) filter.status = { _eq: status };
  if (query.reimbursable !== undefined) filter.reimbursable = { _eq: reimbursable };
  if (q) filter.description = { _ilike: `%${q}%` }; // Assuming ilike for search

  try {
    const expenses = await client.getItems('expenses', { filter, limit, offset });
    return c.json({ success: true, data: expenses.data });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }
});

expensesRouter.get('/:id', async (c) => {
  const client = createDataClient(c.env);
  const id = c.req.param('id');
  const userId = c.get('userId'); // Placeholder for auth

  try {
    const filter: any = { id: { _eq: id } };
    if (userId) filter.created_by = { _eq: userId };
    const expenses = await client.getItems('expenses', { filter, limit: 1 });
    if (expenses.data.length === 0) {
      return c.json({ success: false, error: { message: 'Expense not found', status: 404 } }, 404);
    }
    return c.json({ success: true, data: expenses.data[0] });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }
});

expensesRouter.post('/', async (c) => {
  const body = await c.req.json();
  const client = createDataClient(c.env);
  const userId = c.get('userId'); // Placeholder for auth

  if (!body.description || !body.amount || !body.date) {
    return c.json({
      success: false,
      error: { message: 'Missing required fields: description, amount, date', status: 400 }
    }, 400);
  }

  if (body.amount <= 0) {
    return c.json({
      success: false,
      error: { message: 'Amount must be greater than 0', status: 400 }
    }, 400);
  }

  try {
    const expense = await client.createItem('expenses', {
      id: crypto.randomUUID(),
      description: body.description,
      amount: body.amount,
      date: body.date,
      status: body.status || 'pending',
      reimbursable: body.reimbursable || false,
      created_by: userId || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    return c.json({
      success: true,
      data: expense.data,
      message: 'Expense created successfully'
    }, 201);
  } catch (error: any) {
    return c.json({
      success: false,
      error: { message: error.message, status: 500 }
    }, 500);
  }
});

expensesRouter.put('/:id', async (c) => {
  const body = await c.req.json();
  const client = createDataClient(c.env);
  const id = c.req.param('id');
  const userId = c.get('userId'); // Placeholder for auth

  if (body.amount !== undefined && body.amount <= 0) {
    return c.json({
      success: false,
      error: { message: 'Amount must be greater than 0', status: 400 }
    }, 400);
  }

  try {
    // Check if exists and user owns it
    const filter: any = { id: { _eq: id } };
    if (userId) filter.created_by = { _eq: userId };
    const existing = await client.getItems('expenses', { filter, limit: 1 });
    if (existing.data.length === 0) {
      return c.json({ success: false, error: { message: 'Expense not found or access denied', status: 404 } }, 404);
    }

    const updateData: any = { updated_at: new Date().toISOString() };
    if (body.description) updateData.description = body.description;
    if (body.amount) updateData.amount = body.amount;
    if (body.date) updateData.date = body.date;
    if (body.status) updateData.status = body.status;
    if (body.reimbursable !== undefined) updateData.reimbursable = body.reimbursable;

    const expense = await client.updateItem('expenses', id, updateData);

    return c.json({
      success: true,
      data: expense.data,
      message: 'Expense updated successfully'
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: { message: error.message, status: 500 }
    }, 500);
  }
});

expensesRouter.delete('/:id', async (c) => {
  const client = createDataClient(c.env);
  const id = c.req.param('id');
  const userId = c.get('userId'); // Placeholder for auth

  try {
    // Check if exists and user owns it
    const filter: any = { id: { _eq: id } };
    if (userId) filter.created_by = { _eq: userId };
    const existing = await client.getItems('expenses', { filter, limit: 1 });
    if (existing.data.length === 0) {
      return c.json({ success: false, error: { message: 'Expense not found or access denied', status: 404 } }, 404);
    }

    await client.deleteItem('expenses', id);

    return c.json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: { message: error.message, status: 500 }
    }, 500);
  }
});