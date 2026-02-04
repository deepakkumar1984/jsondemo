import { Hono } from 'hono';
import { createDataClient } from '../../src/db/data-client';

export const expenseCategoriesRouter = new Hono<{ Bindings: Env }>();

expenseCategoriesRouter.get('/', async (c) => {
  const client = createDataClient(c.env);
  const isActive = c.req.query('is_active');
  const filter: any = {};
  if (isActive !== undefined) {
    filter.is_active = { _eq: isActive === 'true' };
  }
  try {
    const categories = await client.getItems('expense_categories', { filter });
    return c.json({ success: true, data: categories.data });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }
});

expenseCategoriesRouter.post('/', async (c) => {
  const body = await c.req.json();
  const client = createDataClient(c.env);

  if (!body.name) {
    return c.json({
      success: false,
      error: { message: 'Missing required field: name', status: 400 }
    }, 400);
  }

  try {
    // Check for unique name
    const existing = await client.getItems('expense_categories', {
      filter: { name: { _eq: body.name } }
    });
    if (existing.data && existing.data.length > 0) {
      return c.json({
        success: false,
        error: { message: 'Expense category with this name already exists', status: 400 }
      }, 400);
    }

    const category = await client.createItem('expense_categories', {
      id: crypto.randomUUID(),
      name: body.name,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    return c.json({
      success: true,
      data: category.data,
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

  if (!body.name) {
    return c.json({
      success: false,
      error: { message: 'Missing required field: name', status: 400 }
    }, 400);
  }

  try {
    // Check if category exists
    const existingCategory = await client.getItem('expense_categories', id);
    if (!existingCategory.data) {
      return c.json({
        success: false,
        error: { message: 'Expense category not found', status: 404 }
      }, 404);
    }

    // Check for unique name, excluding current
    const duplicate = await client.getItems('expense_categories', {
      filter: { name: { _eq: body.name }, id: { _ne: id } }
    });
    if (duplicate.data && duplicate.data.length > 0) {
      return c.json({
        success: false,
        error: { message: 'Expense category with this name already exists', status: 400 }
      }, 400);
    }

    const updatedCategory = await client.updateItem('expense_categories', id, {
      name: body.name,
      updated_at: new Date().toISOString()
    });

    return c.json({
      success: true,
      data: updatedCategory.data,
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
    // Check if category exists
    const existingCategory = await client.getItem('expense_categories', id);
    if (!existingCategory.data) {
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