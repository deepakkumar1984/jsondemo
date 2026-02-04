import { Hono } from 'hono';
import { createDataClient } from '../../src/db/data-client';

export const budgetsRouter = new Hono<{ Bindings: Env }>();

budgetsRouter.get('/', async (c) => {
  const client = createDataClient(c.env);
  const query = c.req.query();

  const filter: any = {};
  if (query.period_start) filter.period_start = { _gte: query.period_start };
  if (query.period_end) filter.period_end = { _lte: query.period_end };
  if (query.currency) filter.currency = { _eq: query.currency };
  if (query.category_id) filter.category_id = { _eq: query.category_id };
  if (query.created_by) filter.created_by = { _eq: query.created_by };

  try {
    const budgets = await client.getItems('budgets', { filter });
    return c.json({ success: true, data: budgets.data });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }
});

budgetsRouter.get('/:id', async (c) => {
  const client = createDataClient(c.env);
  const id = c.req.param('id');

  try {
    const budget = await client.getItem('budgets', id);
    if (!budget.data) {
      return c.json({ success: false, error: { message: 'Budget not found', status: 404 } }, 404);
    }
    return c.json({ success: true, data: budget.data });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }
});

budgetsRouter.post('/', async (c) => {
  const body = await c.req.json();
  const client = createDataClient(c.env);

  if (!body.periodStart || !body.periodEnd || !body.amount || !body.currency || !body.categoryId || !body.createdBy) {
    return c.json({
      success: false,
      error: { message: 'Missing required fields', status: 400 }
    }, 400);
  }

  if (new Date(body.periodStart) > new Date(body.periodEnd)) {
    return c.json({
      success: false,
      error: { message: 'period_start must be less than or equal to period_end', status: 400 }
    }, 400);
  }

  if (body.amount <= 0) {
    return c.json({
      success: false,
      error: { message: 'amount must be greater than 0', status: 400 }
    }, 400);
  }

  try {
    const budget = await client.createItem('budgets', {
      id: crypto.randomUUID(),
      period_start: body.periodStart,
      period_end: body.periodEnd,
      amount: body.amount,
      currency: body.currency,
      category_id: body.categoryId,
      created_by: body.createdBy,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    return c.json({
      success: true,
      data: budget.data,
      message: 'Budget created successfully'
    }, 201);
  } catch (error: any) {
    return c.json({
      success: false,
      error: { message: error.message, status: 500 }
    }, 500);
  }
});

budgetsRouter.put('/:id', async (c) => {
  const body = await c.req.json();
  const client = createDataClient(c.env);
  const id = c.req.param('id');

  if (!body.periodStart || !body.periodEnd || !body.amount || !body.currency || !body.categoryId || !body.createdBy) {
    return c.json({
      success: false,
      error: { message: 'Missing required fields', status: 400 }
    }, 400);
  }

  if (new Date(body.periodStart) > new Date(body.periodEnd)) {
    return c.json({
      success: false,
      error: { message: 'period_start must be less than or equal to period_end', status: 400 }
    }, 400);
  }

  if (body.amount <= 0) {
    return c.json({
      success: false,
      error: { message: 'amount must be greater than 0', status: 400 }
    }, 400);
  }

  try {
    const existing = await client.getItem('budgets', id);
    if (!existing.data) {
      return c.json({ success: false, error: { message: 'Budget not found', status: 404 } }, 404);
    }

    const budget = await client.updateItem('budgets', id, {
      period_start: body.periodStart,
      period_end: body.periodEnd,
      amount: body.amount,
      currency: body.currency,
      category_id: body.categoryId,
      created_by: body.createdBy,
      updated_at: new Date().toISOString()
    });

    return c.json({
      success: true,
      data: budget.data,
      message: 'Budget updated successfully'
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: { message: error.message, status: 500 }
    }, 500);
  }
});

budgetsRouter.delete('/:id', async (c) => {
  const client = createDataClient(c.env);
  const id = c.req.param('id');

  try {
    const existing = await client.getItem('budgets', id);
    if (!existing.data) {
      return c.json({ success: false, error: { message: 'Budget not found', status: 404 } }, 404);
    }

    await client.deleteItem('budgets', id);
    return c.json({
      success: true,
      message: 'Budget deleted successfully'
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: { message: error.message, status: 500 }
    }, 500);
  }
});