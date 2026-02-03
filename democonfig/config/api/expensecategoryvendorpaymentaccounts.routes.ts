import { Hono } from 'hono';
import { createDataClient } from '../../src/db/data-client';

export const expenseCategoriesRouter = new Hono<{ Bindings: Env }>();

expenseCategoriesRouter.get('/', async (c) => {
  const client = createDataClient(c.env);
  try {
    const filter = { is_active: { _eq: true } };
    const expenseCategories = await client.getItems('expense_categories', { filter });
    return c.json({ success: true, data: expenseCategories.data });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }
});

expenseCategoriesRouter.post('/', async (c) => {
  const body = await c.req.json();
  const client = createDataClient(c.env);

  if (!body.name || typeof body.sortOrder !== 'number') {
    return c.json({
      success: false,
      error: { message: 'Missing required fields: name and sortOrder', status: 400 }
    }, 400);
  }

  try {
    // Check for duplicate name
    const existing = await client.getItems('expense_categories', { filter: { name: { _eq: body.name } } });
    if (existing.data.length > 0) {
      return c.json({
        success: false,
        error: { message: 'Expense category name already exists', status: 400 }
      }, 400);
    }

    const expenseCategory = await client.createItem('expense_categories', {
      id: crypto.randomUUID(),
      name: body.name,
      color: body.color || null,
      icon: body.icon || null,
      is_active: true,
      sort_order: body.sortOrder,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    return c.json({
      success: true,
      data: expenseCategory.data,
      message: 'Expense category created successfully'
    }, 201);
  } catch (error: any) {
    return c.json({
      success: false,
      error: { message: error.message, status: 500 }
    }, 500);
  }
});

expenseCategoriesRouter.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const client = createDataClient(c.env);

  if (!body.name || typeof body.sortOrder !== 'number') {
    return c.json({
      success: false,
      error: { message: 'Missing required fields: name and sortOrder', status: 400 }
    }, 400);
  }

  try {
    const existing = await client.getItem('expense_categories', id);
    if (!existing.data) {
      return c.json({
        success: false,
        error: { message: 'Expense category not found', status: 404 }
      }, 404);
    }

    // Check for duplicate name if changed
    if (body.name !== existing.data.name) {
      const dup = await client.getItems('expense_categories', { filter: { name: { _eq: body.name } } });
      if (dup.data.length > 0) {
        return c.json({
          success: false,
          error: { message: 'Expense category name already exists', status: 400 }
        }, 400);
      }
    }

    const updated = await client.updateItem('expense_categories', id, {
      name: body.name,
      color: body.color || null,
      icon: body.icon || null,
      sort_order: body.sortOrder,
      updated_at: new Date().toISOString()
    });

    return c.json({
      success: true,
      data: updated.data,
      message: 'Expense category updated successfully'
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: { message: error.message, status: 500 }
    }, 500);
  }
});

expenseCategoriesRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const client = createDataClient(c.env);

  try {
    const existing = await client.getItem('expense_categories', id);
    if (!existing.data) {
      return c.json({
        success: false,
        error: { message: 'Expense category not found', status: 404 }
      }, 404);
    }

    // Soft delete by setting is_active to false
    await client.updateItem('expense_categories', id, {
      is_active: false,
      updated_at: new Date().toISOString()
    });

    return c.json({
      success: true,
      message: 'Expense category deleted successfully'
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: { message: error.message, status: 500 }
    }, 500);
  }
});