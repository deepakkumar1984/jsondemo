import { Hono } from 'hono';
import { createDataClient } from '../../src/db/data-client';

export const paymentAccountsRouter = new Hono<{ Bindings: Env }>();

paymentAccountsRouter.get('/', async (c) => {
  const client = createDataClient(c.env);
  try {
    const paymentAccounts = await client.getItems('payment_accounts', {});
    return c.json({ success: true, data: paymentAccounts.data });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }
});

paymentAccountsRouter.post('/', async (c) => {
  const body = await c.req.json();
  const client = createDataClient(c.env);

  if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
    return c.json({
      success: false,
      error: { message: 'Missing or invalid required field: name', status: 400 }
    }, 400);
  }

  try {
    // Check for unique name
    const existing = await client.getItems('payment_accounts', {
      filter: { name: { _eq: body.name.trim() } }
    });
    if (existing.data && existing.data.length > 0) {
      return c.json({
        success: false,
        error: { message: 'Payment account name must be unique', status: 400 }
      }, 400);
    }

    const paymentAccount = await client.createItem('payment_accounts', {
      id: crypto.randomUUID(),
      name: body.name.trim(),
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    return c.json({
      success: true,
      data: paymentAccount.data,
      message: 'Payment account created successfully'
    }, 201);
  } catch (error: any) {
    return c.json({
      success: false,
      error: { message: error.message, status: 500 }
    }, 500);
  }
});

paymentAccountsRouter.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const client = createDataClient(c.env);

  if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
    return c.json({
      success: false,
      error: { message: 'Missing or invalid required field: name', status: 400 }
    }, 400);
  }

  try {
    // Check if item exists
    const existingItem = await client.getItem('payment_accounts', id);
    if (!existingItem.data) {
      return c.json({
        success: false,
        error: { message: 'Payment account not found', status: 404 }
      }, 404);
    }

    // Check for unique name, excluding current id
    const existingName = await client.getItems('payment_accounts', {
      filter: { name: { _eq: body.name.trim() }, id: { _ne: id } }
    });
    if (existingName.data && existingName.data.length > 0) {
      return c.json({
        success: false,
        error: { message: 'Payment account name must be unique', status: 400 }
      }, 400);
    }

    const paymentAccount = await client.updateItem('payment_accounts', id, {
      name: body.name.trim(),
      updated_at: new Date().toISOString()
    });

    return c.json({
      success: true,
      data: paymentAccount.data,
      message: 'Payment account updated successfully'
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: { message: error.message, status: 500 }
    }, 500);
  }
});

paymentAccountsRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const client = createDataClient(c.env);

  try {
    // Check if item exists
    const existingItem = await client.getItem('payment_accounts', id);
    if (!existingItem.data) {
      return c.json({
        success: false,
        error: { message: 'Payment account not found', status: 404 }
      }, 404);
    }

    // Soft delete by setting is_active to false
    const paymentAccount = await client.updateItem('payment_accounts', id, {
      is_active: false,
      updated_at: new Date().toISOString()
    });

    return c.json({
      success: true,
      data: paymentAccount.data,
      message: 'Payment account deleted successfully'
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: { message: error.message, status: 500 }
    }, 500);
  }
});