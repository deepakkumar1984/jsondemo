import { Hono } from 'hono';
import { createDataClient } from '../../src/db/data-client';

export const projectsRouter = new Hono<{ Bindings: Env }>();

// List projects with filters and sort
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
    filter.name = { _like: `%${query.searchByName}%` }; // Assuming _like is supported, as per common patterns
  }

  const sort = query.sort === 'name' ? ['name'] : ['-updated_at'];

  try {
    const projects = await client.getItems('projects', { filter, sort });
    return c.json({ success: true, data: projects.data });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }
});

// Get project by ID
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

// Create project
projectsRouter.post('/', async (c) => {
  const body = await c.req.json();
  const client = createDataClient(c.env);

  if (!body.name || !body.ownerUserId) {
    return c.json({
      success: false,
      error: { message: 'Missing required fields: name and ownerUserId', status: 400 }
    }, 400);
  }

  // Check uniqueness of name globally
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

// Update project
projectsRouter.put('/:id', async (c) => {
  const body = await c.req.json();
  const client = createDataClient(c.env);
  const id = c.req.param('id');

  if (!body.name || !body.ownerUserId) {
    return c.json({
      success: false,
      error: { message: 'Missing required fields: name and ownerUserId', status: 400 }
    }, 400);
  }

  // Check if project exists
  try {
    const existingProject = await client.getItem('projects', id);
    if (!existingProject.data) {
      return c.json({ success: false, error: { message: 'Project not found', status: 404 } }, 404);
    }

    // Check uniqueness if name changed
    if (body.name !== existingProject.data.name) {
      const nameCheck = await client.getItems('projects', { filter: { name: { _eq: body.name } } });
      if (nameCheck.data && nameCheck.data.length > 0) {
        return c.json({
          success: false,
          error: { message: 'Project name must be unique', status: 400 }
        }, 400);
      }
    }
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }

  try {
    const project = await client.updateItem('projects', id, {
      name: body.name,
      description: body.description || null,
      status: body.status || 'Active',
      owner_user_id: body.ownerUserId,
      updated_at: new Date().toISOString()
    });

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

// Archive project
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