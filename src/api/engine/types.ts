export interface JoinConfig {
  table: string;
  on: [string, string];
  fields: Record<string, string>;
}

export interface ComputedFieldConfig {
  name: string;
  sql: string;
  type: 'number' | 'string';
}

export interface LookupConfig {
  name: string;
  condition: string;
  table: string;
  where: { field: string; value: string };
  select: string[];
  format: string;
}

export interface FilterConfig {
  param: string;
  field: string;
  cast?: 'enum';
}

export interface SearchConfig {
  param: string;
  fields: string[];
}

export interface ReferentialCheck {
  table: string;
  foreignKey: string;
  message: string;
}

export interface AutoGenerateConfig {
  field: string;
  pattern: string;
}

export interface ListConfig {
  enabled: boolean;
  paginated: boolean;
  orderBy?: { field: string; direction: 'asc' | 'desc' };
  fields: string[];
  joins?: JoinConfig[];
  computedFields?: ComputedFieldConfig[];
  filters?: FilterConfig[];
  search?: SearchConfig | null;
}

export interface GetByIdConfig {
  enabled: boolean;
  fields: string[];
  joins?: JoinConfig[];
  computedFields?: ComputedFieldConfig[];
  lookups?: LookupConfig[];
}

export interface CreateConfig {
  enabled: boolean;
  requiredFields: string[];
  fields: string[];
  defaults?: Record<string, unknown>;
  coerce?: Record<string, string>;
  autoGenerate?: AutoGenerateConfig | null;
  referentialChecks?: { field: string; table: string; message: string }[];
}

export interface UpdateConfig {
  enabled: boolean;
  fields: string[];
  coerce?: Record<string, string>;
  addTimestamp?: boolean;
}

export interface DeleteConfig {
  enabled: boolean;
  mode: 'hard' | 'soft';
  softDeleteField?: string;
  softDeleteValue?: string;
  referentialChecks?: ReferentialCheck[];
}

export interface CustomEndpoint {
  method: 'get' | 'post' | 'put' | 'delete';
  path: string;
  handler: string;
}

export interface ResourceApiConfig {
  resource: string;
  table: string;
  basePath: string;
  auth?: boolean;
  list?: ListConfig;
  getById?: GetByIdConfig;
  create?: CreateConfig;
  update?: UpdateConfig;
  delete?: DeleteConfig;
  customEndpoints?: CustomEndpoint[];
}
