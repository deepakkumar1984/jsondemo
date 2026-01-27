import { Hono } from 'hono';
import type { ResourceApiConfig } from './types';
import { schemaRegistry } from './schema-registry';
import { listHandler } from './list-handler';
import { getByIdHandler } from './get-handler';
import { createHandler } from './create-handler';
import { updateHandler } from './update-handler';
import { deleteHandler } from './delete-handler';
import { customHandlerRegistry } from './custom-handlers';

type Env = { Bindings: { DB: D1Database; JWT_SECRET: string } };

export function createResourceRouter(config: ResourceApiConfig): Hono<Env> {
  const router = new Hono<Env>();
  const table = schemaRegistry[config.table];

  // Register custom endpoints FIRST so they match before /:id params
  for (const ep of config.customEndpoints ?? []) {
    const handler = customHandlerRegistry[ep.handler];
    if (handler) {
      router[ep.method](ep.path, handler);
    }
  }

  if (config.list?.enabled) router.get('/', listHandler(config, table));
  if (config.getById?.enabled) router.get('/:id', getByIdHandler(config, table));
  if (config.create?.enabled) router.post('/', createHandler(config, table));
  if (config.update?.enabled) router.put('/:id', updateHandler(config, table));
  if (config.delete?.enabled) router.delete('/:id', deleteHandler(config, table));

  return router;
}
