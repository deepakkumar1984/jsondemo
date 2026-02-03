import { Hono } from 'hono';
import type { Env } from '../../src/types';
import { createDataClient } from '../../src/db/data-client';

export const projectsRouter = new Hono<{ Bindings: Env }>();

projectsRouter.get('/', async (c) => {
  const client = createDataClient(c.env);
  const query = c.req.query();

  const filter: any = {};
  if (query.status) {
    filter.status = { _eq: query.status };
  }
  if (query.ownerUserId) {
    filter.owner_user_id = { _eq: query.ownerUserId };
  }
  if (query.searchByName) {
    filter.name = { _eq: query.searchByName }; // Assuming exact match; adjust if partial search is needed
  }

  const sort = query.sort === 'updatedAt desc' ? ['-updated_at'] : query.sort === 'name asc' ? ['name'] : ['-updated_at'];

  try {
    const projects = await client.getItems('projects', { filter, sort });
    return c.json({ success: true, data: projects.data });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }
});

projectsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const client = createDataClient(c.env);

  try {
    const project = await client.getItem('projects', id);
    if (!project.data) {
      return c.json({ success: false, error: { message: 'Project not found', status: 404 } }, 404);
    }
    return c.json({ success: true, data: project.data });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }
});

projectsRouter.post('/', async (c) => {
  const body = await c.req.json();
  const client = createDataClient(c.env);

  if (!body.name || !body.ownerUserId) {
    return c.json({
      success: false,
      error: { message: 'Missing required fields: name and ownerUserId', status: 400 }
    }, 400);
  }

  // Check for duplicate name
  try {
    const existing = await client.getItems('projects', { filter: { name: { _eq: body.name } } });
    if (existing.data && existing.data.length > 0) {
      return c.json({
        success: false,
        error: { message: 'Project name must be unique', status: 400 }
      }, 400);
    }
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }

  try {
    const project = await client.createItem('projects', {
      id: crypto.randomUUID(),
      name: body.name,
      description: body.description || null,
      status: 'Active',
      owner_user_id: body.ownerUserId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    return c.json({
      success: true,
      data: project.data,
      message: 'Project created successfully'
    }, 201);
  } catch (error: any) {
    return c.json({
      success: false,
      error: { message: error.message, status: 500 }
    }, 500);
  }
});

projectsRouter.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const client = createDataClient(c.env);

  if (!body.name && !body.description && !body.ownerUserId) {
    return c.json({
      success: false,
      error: { message: 'At least one field to update is required', status: 400 }
    }, 400);
  }

  // Check if project exists
  try {
    const existingProject = await client.getItem('projects', id);
    if (!existingProject.data) {
      return c.json({ success: false, error: { message: 'Project not found', status: 404 } }, 404);
    }
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }

  // Check for duplicate name if updating name
  if (body.name) {
    try {
      const existing = await client.getItems('projects', { filter: { name: { _eq: body.name } } });
      if (existing.data && existing.data.length > 0 && existing.data[0].id !== id) {
        return c.json({
          success: false,
          error: { message: 'Project name must be unique', status: 400 }
        }, 400);
      }
    } catch (error: any) {
      return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
    }
  }

  const updateData: any = {};
  if (body.name) updateData.name = body.name;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.ownerUserId) updateData.owner_user_id = body.ownerUserId;
  updateData.updated_at = new Date().toISOString();

  try {
    const project = await client.updateItem('projects', id, updateData);
    return c.json({
      success: true,
      data: project.data,
      message: 'Project updated successfully'
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: { message: error.message, status: 500 }
    }, 500);
  }
});

projectsRouter.put('/:id/archive', async (c) => {
  const id = c.req.param('id');
  const client = createDataClient(c.env);

  // Check if project exists
  try {
    const existingProject = await client.getItem('projects', id);
    if (!existingProject.data) {
      return c.json({ success: false, error: { message: 'Project not found', status: 404 } }, 404);
    }
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }

  try {
    const project = await client.updateItem('projects', id, {
      status: 'Archived',
      updated_at: new Date().toISOString()
    });
    return c.json({
      success: true,
      data: project.data,
      message: 'Project archived successfully'
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: { message: error.message, status: 500 }
    }, 500);
  }
});