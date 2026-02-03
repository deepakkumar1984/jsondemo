import { Hono } from 'hono';
import type { Env } from '../../src/types';
import { createDataClient } from '../../src/db/data-client';

export const projectsRouter = new Hono<{ Bindings: Env }>();

// GET / - List projects with filters and sorting
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
    filter.name = { _like: `%${query.searchByName}%` };
  }

  const params = {
    filter,
    sort: ['-updated_at', 'name'],
    limit: query.limit ? parseInt(query.limit) : undefined,
    offset: query.offset ? parseInt(query.offset) : undefined,
  };

  try {
    const projects = await client.getItems('projects', params);
    return c.json({ success: true, data: projects.data });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }
});

// GET /:id - Get project by ID
projectsRouter.get('/:id', async (c) => {
  const client = createDataClient(c.env);
  const id = c.req.param('id');

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

// POST / - Create a new project
projectsRouter.post('/', async (c) => {
  const body = await c.req.json();
  const client = createDataClient(c.env);

  // Validation
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    return c.json({ success: false, error: { message: 'Name is required and must be a non-empty string', status: 400 } }, 400);
  }
  if (!body.ownerUserId || typeof body.ownerUserId !== 'string') {
    return c.json({ success: false, error: { message: 'Owner user ID is required', status: 400 } }, 400);
  }
  if (body.description && typeof body.description !== 'string') {
    return c.json({ success: false, error: { message: 'Description must be a string', status: 400 } }, 400);
  }
  if (body.status && !['Active', 'Archived'].includes(body.status)) {
    return c.json({ success: false, error: { message: 'Status must be Active or Archived', status: 400 } }, 400);
  }

  // Check uniqueness within owner (assuming owner as workspace scope)
  try {
    const existing = await client.getItems('projects', {
      filter: { name: { _eq: body.name.trim() }, owner_user_id: { _eq: body.ownerUserId } }
    });
    if (existing.data && existing.data.length > 0) {
      return c.json({ success: false, error: { message: 'Project name must be unique within the workspace', status: 400 } }, 400);
    }
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }

  try {
    const project = await client.createItem('projects', {
      id: crypto.randomUUID(),
      name: body.name.trim(),
      description: body.description || null,
      status: body.status || 'Active',
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

// PUT /:id - Update a project
projectsRouter.put('/:id', async (c) => {
  const body = await c.req.json();
  const client = createDataClient(c.env);
  const id = c.req.param('id');

  // Validation
  if (body.name && (typeof body.name !== 'string' || body.name.trim().length === 0)) {
    return c.json({ success: false, error: { message: 'Name must be a non-empty string', status: 400 } }, 400);
  }
  if (body.ownerUserId && typeof body.ownerUserId !== 'string') {
    return c.json({ success: false, error: { message: 'Owner user ID must be a string', status: 400 } }, 400);
  }
  if (body.description && typeof body.description !== 'string') {
    return c.json({ success: false, error: { message: 'Description must be a string', status: 400 } }, 400);
  }
  if (body.status && !['Active', 'Archived'].includes(body.status)) {
    return c.json({ success: false, error: { message: 'Status must be Active or Archived', status: 400 } }, 400);
  }

  // Check if project exists
  try {
    const existingProject = await client.getItem('projects', id);
    if (!existingProject.data) {
      return c.json({ success: false, error: { message: 'Project not found', status: 404 } }, 404);
    }

    // Check uniqueness if name is being updated
    if (body.name) {
      const ownerId = body.ownerUserId || existingProject.data.owner_user_id;
      const existing = await client.getItems('projects', {
        filter: { name: { _eq: body.name.trim() }, owner_user_id: { _eq: ownerId }, id: { _ne: id } }
      });
      if (existing.data && existing.data.length > 0) {
        return c.json({ success: false, error: { message: 'Project name must be unique within the workspace', status: 400 } }, 400);
      }
    }
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }

  try {
    const updateData: any = { updated_at: new Date().toISOString() };
    if (body.name) updateData.name = body.name.trim();
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status) updateData.status = body.status;
    if (body.ownerUserId) updateData.owner_user_id = body.ownerUserId;

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

// PUT /:id/archive - Archive a project
projectsRouter.put('/:id/archive', async (c) => {
  const client = createDataClient(c.env);
  const id = c.req.param('id');

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