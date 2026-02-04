import { Hono } from 'hono';
import { createDataClient } from '../../src/db/data-client';

export const vendorsRouter = new Hono<{ Bindings: Env }>();

vendorsRouter.get('/', async (c) => {
  const client = createDataClient(c.env);
  try {
    const vendors = await client.getItems('vendors', {});
    return c.json({ success: true, data: vendors.data });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }
});

vendorsRouter.post('/', async (c) => {
  const body = await c.req.json();
  const client = createDataClient(c.env);

  if (!body.name) {
    return c.json({
      success: false,
      error: { message: 'Missing required field: name', status: 400 }
    }, 400);
  }

  try {
    // Check for duplicate name
    const existing = await client.getItems('vendors', { filter: { name: { _eq: body.name } } });
    if (existing.data && existing.data.length > 0) {
      return c.json({
        success: false,
        error: { message: 'Vendor with this name already exists', status: 400 }
      }, 400);
    }

    const vendor = await client.createItem('vendors', {
      id: crypto.randomUUID(),
      name: body.name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    return c.json({
      success: true,
      data: vendor.data,
      message: 'Vendor created successfully'
    }, 201);
  } catch (error: any) {
    return c.json({
      success: false,
      error: { message: error.message, status: 500 }
    }, 500);
  }
});

vendorsRouter.put('/:id', async (c) => {
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
    // Check if vendor exists
    const existingVendor = await client.getItem('vendors', id);
    if (!existingVendor.data) {
      return c.json({
        success: false,
        error: { message: 'Vendor not found', status: 404 }
      }, 404);
    }

    // Check for duplicate name (excluding current vendor)
    const duplicateCheck = await client.getItems('vendors', { filter: { name: { _eq: body.name }, id: { _ne: id } } });
    if (duplicateCheck.data && duplicateCheck.data.length > 0) {
      return c.json({
        success: false,
        error: { message: 'Vendor with this name already exists', status: 400 }
      }, 400);
    }

    const updatedVendor = await client.updateItem('vendors', id, {
      name: body.name,
      updated_at: new Date().toISOString()
    });

    return c.json({
      success: true,
      data: updatedVendor.data,
      message: 'Vendor updated successfully'
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: { message: error.message, status: 500 }
    }, 500);
  }
});

vendorsRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const client = createDataClient(c.env);

  try {
    // Check if vendor exists
    const existingVendor = await client.getItem('vendors', id);
    if (!existingVendor.data) {
      return c.json({
        success: false,
        error: { message: 'Vendor not found', status: 404 }
      }, 404);
    }

    await client.deleteItem('vendors', id);

    return c.json({
      success: true,
      message: 'Vendor deleted successfully'
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: { message: error.message, status: 500 }
    }, 500);
  }
});