# DSL Syntax Reference

Complete syntax reference for all configuration DSLs (Schema, API, Page, Apps).

---

## 1. Schema DSL

### Basic Structure

```
table <table_name> "<description>"
  <column_definition>
  <column_definition>
  ...

index <index_name> [unique] <column1>[,<column2>,...]
```

### Column Definition Syntax

```
<name> <type> [modifiers] [constraints] [references]
```

**Modifiers:**
- `!` = notNull (required field)
- `pk` = primaryKey
- `unique` = unique constraint

**Constraints:**
- `default=<value>` - Default value
- `uuid` - Default function for UUID generation (shorthand for defaultFn:"uuid")
- `desc="<text>"` - Column description

**References (Foreign Keys):**
- `-> <table>.<column>` - Basic foreign key
- `-> <table>.<column> cascade` - FK with ON DELETE CASCADE
- `-> <table>.<column> set_null` - FK with ON DELETE SET NULL
- `-> <table>.<column> restrict` - FK with ON DELETE RESTRICT
- `-> <table>.<column> no_action` - FK with ON DELETE NO ACTION

**PostgreSQL Types:**
- Text: `text`, `varchar`, `char`
- Numbers: `integer`, `smallint`, `bigint`, `serial`, `bigserial`, `real`, `double precision`, `numeric`, `decimal`
- Boolean: `boolean`
- Date/Time: `timestamp`, `timestamptz`, `date`, `time`, `timetz`, `interval`
- JSON: `json`, `jsonb`
- UUID: `uuid`
- Binary: `bytea`, `blob`

### Complete Schema Example

```
table employees "Employee management records"
  id text pk uuid
  email text! unique
  full_name text!
  age integer
  salary numeric! default=0
  is_active boolean! default=true
  hire_date timestamp! default=CURRENT_TIMESTAMP
  metadata jsonb desc="Additional employee metadata"
  department_id text! -> departments.id cascade
  manager_id text -> employees.id set_null
  created_at timestamp! default=CURRENT_TIMESTAMP
  updated_at timestamp! default=CURRENT_TIMESTAMP

index idx_employees_email unique email
index idx_employees_department department_id
index idx_employees_active_dept is_active,department_id
```

**Maps to JSON:**
```json
{
  "table": "employees",
  "description": "Employee management records",
  "columns": [
    {"name": "id", "type": "text", "primaryKey": true, "defaultFn": "uuid"},
    {"name": "email", "type": "text", "notNull": true, "unique": true},
    ...
  ],
  "indexes": [...]
}
```

---

## 2. API DSL

### Basic Structure

```
api <name> "<basePath>" [auth]
desc "<description>"

op <operationId> <METHOD> "<path>" [auth]
desc "<description>"
req <request_schema>
res <response_schema>
  <action>
  <action>
  ...
```

### Actions (One Line = One Action)

#### Validation
```
validate <field> <rule> [args...]
```

**Rules:** `required`, `min`, `max`, `email`, `pattern`, `length`, `in`

**Examples:**
```
validate body.title required
validate body.email required email
validate body.hours min=0.1 max=24
validate body.description max=500
validate body.status in=pending,approved,rejected
```

#### Transform / Set Variables
```
set <path>=<expr> [<path>=<expr>...]
```

**Examples:**
```
set body.id=uuid() body.createdAt=now()
set body.userId={{user.id}}
set totalAmount=calculatedHours*hourlyRate
```

#### Calculations
```
calc <varName>=<expression>
```

**Examples:**
```
calc totalHours=sum(entries.hours)
calc totalAmount=body.hours*project.hourlyRate
calc avgRating=sum(reviews.rating)/len(reviews)
```

#### Database Queries
```
query <table> [where <filter>] [order <field> <dir>] [limit <n>] [offset <n>] -> <varName>
```

**Examples:**
```
query tasks where user_id={{user.id}} order created_at desc -> tasks
query projects where id={{body.projectId}} limit 1 -> project
query time_entries where status=pending user_id={{user.id}} -> entries
```

**Where filters:**
- Simple: `field=value` or `field={{expr}}`
- Operators: `field>=value`, `field!=value`, `field in values`

#### Database Insert
```
insert <table> map(<field>=<expr>,...) [-> <varName>]
```

**Example:**
```
insert tasks map(id={{body.id}}, user_id={{body.userId}}, title={{body.title}}, created_at={{body.createdAt}}) -> taskId
```

#### Database Update
```
update <table> where <filter> set <field>=<expr> [<field>=<expr>...]
```

**Example:**
```
update time_entries where id={{params.id}} set status=approved approved_at=now()
update projects where id={{projectId}} set total_hours+=body.hours updated_at=now()
```

#### Database Delete
```
delete <table> where <filter>
```

**Example:**
```
delete time_entries where id={{params.id}}
```

#### Bulk Insert
```
bulkinsert <table> <arrayVar>
```

**Example:**
```
bulkinsert time_entry_tags tagRecords
```

#### HTTP Call
```
http <METHOD> "<url>" [header <key>=<value>...] [body <json>] -> <varName>
```

**Example:**
```
http POST "https://api.example.com/notify" header Authorization="Bearer {{env.API_KEY}}" body type=approval count={{len(entries)}} -> notificationResult
```

#### Control Flow - Conditions
```
if <condition>
  <actions>
[else]
  <actions>
endif
```

**Example:**
```
if project=null
  respond 404 error="Project not found"
endif

if body.hours>8
  set body.requiresApproval=true
else
  set body.requiresApproval=false
endif
```

#### Control Flow - Loops
```
loop <array> as <item>
  <actions>
endloop
```

**Example:**
```
loop entriesToApprove as entry
  update time_entries where id=entry.id set status=approved approved_at=now()
endloop

map body.tags as tag -> tagRecords(time_entry_id={{body.id}}, tag={{tag}}, created_at=now())
```

#### Transactions
```
tx begin
  <actions>
tx end
```

**Example:**
```
tx begin
  insert time_entries map(...)
  update projects set total_hours+=body.hours
tx end
```

#### Parallel Execution
```
parallel begin
  <actions>
parallel end
```

**Example:**
```
parallel begin
  http POST "..." -> notif
  insert logs map(...)
parallel end
```

#### Error Handling
```
try begin
  <actions>
catch
  <error_actions>
[finally]
  <cleanup_actions>
try end
```

**Example:**
```
try begin
  query entries where id={{params.id}} -> entry
  if entry=null
    respond 404 error="Not found"
  endif
  update entries where id={{params.id}} set status=approved
  respond 200 success=true
catch
  respond 500 error="Update failed" details={{error.message}}
try end
```

#### Response
```
respond [<statusCode>] <field>=<expr> [<field>=<expr>...]
```

**Examples:**
```
respond items={{tasks}}
respond 201 id={{taskId}} message="Created successfully"
respond 404 error="Not found"
respond 200 total={{count}} items={{entries}} limit={{query.limit}}
```

### Complete API Example

```
api Tasks "/api/tasks"

op listTasks GET "/"
  query tasks where user_id={{user.id}} order created_at desc -> tasks
  respond items={{tasks}}

op createTask POST "/"
  validate body.title required
  set body.id=uuid() body.userId={{user.id}} body.createdAt=now()
  insert tasks map(id={{body.id}}, user_id={{body.userId}}, title={{body.title}}, created_at={{body.createdAt}}) -> taskId
  respond 201 id={{taskId}}

op updateTask PUT "/:id"
  validate body.title required
  query tasks where id={{params.id}} user_id={{user.id}} -> task
  if task=null
    respond 404 error="Task not found"
  endif
  update tasks where id={{params.id}} set title={{body.title}} updated_at=now()
  respond 200 message="Updated"

op deleteTask DELETE "/:id"
  query tasks where id={{params.id}} user_id={{user.id}} -> task
  if task=null
    respond 404 error="Task not found"
  endif
  delete tasks where id={{params.id}}
  respond 200 message="Deleted"
```

**Special Functions:**
- `uuid()` - Generate UUID
- `now()` - Current timestamp
- `sum(array, field)` - Sum field values
- `len(array)` - Array length
- `env.VAR_NAME` - Environment variable

**Template Interpolation:**
- `{{body.fieldName}}` - Request body field
- `{{params.id}}` - URL parameter
- `{{query.filter}}` - Query string param
- `{{user.id}}` - Authenticated user
- `{{varName}}` - Runtime variable

---

## 3. Page DSL

### Basic Structure

```
page <pageName>
  datasource <name> "<url>"
  datasource <name> "<url>"

  <Component> [props]
    <ChildComponent> [props]
    ...
```

### Component Syntax

```
<ComponentType> [key=value key=value...]
  [children]
```

**Indentation-based hierarchy** (like Python/YAML)

### Available Components

**Layout:**
- `PageHeader`
- `Card`
- `Grid`
- `Stack`
- `Tabs` / `TabPanel`
- `Divider`

**Data Display:**
- `DataTable`
- `StatCard`
- `Badge`
- `DetailSection` / `DetailRow`

**Forms:**
- `Form`
- `TextField`
- `TextArea`
- `SelectField`
- `DateField`
- `Button`

**Other:**
- `Alert`

### Props Syntax

**Simple values:**
```
title="Dashboard"
cols=3
editable=true
```

**Data binding:**
```
data={{projects}}
value={{stats.total}}
valuePath="employee.firstName"
```

**Templates:**
```
template="{{firstName}} {{lastName}}"
```

**Actions:**
```
action=navigate:/projects/{{row.id}}
action=submit_form:createProject
action=delete_confirm:{{row.id}}
action=api_call:/api/projects/{{row.id}}:DELETE
```

**Arrays (columns, options):**
```
DataTable data={{projects}}
  col name "Project Name"
  col status "Status" badge
  col budget "Budget" format=currency
  col actions "Actions" action=navigate:/projects/{{row.id}}
```

### Complete Page Example

```
page dashboard
  datasource projects "/projects"
  datasource stats "/stats"

  PageHeader title="Dashboard" subtitle="Project overview"

  Grid cols=3 gap=4
    StatCard title="Total Projects" value={{stats.total}} icon="Briefcase"
    StatCard title="Active" value={{stats.active}} icon="CheckCircle" color="green"
    StatCard title="Completed" value={{stats.completed}} icon="Archive" color="blue"

  Card title="Projects"
    DataTable data={{projects}} searchable=true filterable=true
      col name "Name"
      col status "Status" badge
      col budget "Budget" format=currency
      col actions "Actions" action=navigate:/projects/{{row.id}}

  Divider spacing=6

  Card title="Quick Actions"
    Stack direction="horizontal" spacing=4
      Button label="New Project" action=navigate:/projects/new variant="primary"
      Button label="Reports" action=navigate:/reports variant="secondary"
```

---

## 4. Apps DSL

### Basic Structure

```
app <appId>
  name "<display_name>"
  subtitle "<subtitle>"
  prefix "<url_prefix>"
  [auth required]

  nav <category_title>
    item "<title>" "<path>" <page> [icon=<icon>] [badge=<badge>] [auth] [role=<role>]
    ...

  route "<path>" <page> [auth] [role=<role>]
  ...

  defaults
    <setting_category>
      <key>=<value>
      ...
```

### Complete Apps Example

```
app project-tracker
  name "Project Tracker"
  subtitle "Time & Budget Management"
  prefix "/"

  nav Overview
    item "Dashboard" "/" dashboard icon=LayoutDashboard

  nav Projects
    item "All Projects" "/projects" projects icon=Briefcase
    item "New Project" "/projects/new" new-project icon=Plus auth

  nav Admin
    item "Users" "/admin/users" admin-users icon=Users role=admin
    item "Settings" "/admin/settings" admin-settings icon=Settings role=admin

  route "/" dashboard
  route "/projects" projects
  route "/projects/new" new-project auth
  route "/projects/:id" project-detail
  route "/projects/:id/edit" edit-project auth
  route "/admin/users" admin-users auth role=admin

  defaults
    table
      pageSize=20
      pageSizes=10,20,50,100
      stickyHeader=true
      striped=true
    form
      validateOnBlur=true
      resetOnSuccess=true
    notification
      position=top-right
      duration=5000
```

---

## Grammar Rules

### Common Patterns

1. **Identifiers:** `camelCase` for IDs, operation names
2. **Database names:** `snake_case` for tables, columns
3. **Strings:** Double quotes `"..."` for text
4. **Booleans:** `true` / `false`
5. **Numbers:** Plain integers or decimals
6. **Arrays:** Comma-separated `val1,val2,val3`
7. **Key-value pairs:** `key=value` (no spaces around `=`)
8. **Comments:** `# This is a comment` (line comments only)

### Template Expressions

Use `{{expression}}` for dynamic values:
- `{{body.field}}` - Request body
- `{{params.id}}` - URL params
- `{{query.filter}}` - Query string
- `{{user.id}}` - Auth user
- `{{varName}}` - Runtime variable
- `{{row.id}}` - Table row data
- `{{env.VAR}}` - Environment variable

### Operators

**Comparison:**
- `=` equals
- `!=` not equals
- `>`, `<`, `>=`, `<=` numeric comparison
- `in` membership test

**Arithmetic:**
- `+`, `-`, `*`, `/`
- `+=`, `-=` compound assignment

---

## Token Savings

| DSL Type | JSON Size | DSL Size | Reduction |
|----------|-----------|----------|-----------|
| Schema   | ~800 tokens | ~200 tokens | **75%** |
| API      | ~8000 tokens | ~2000 tokens | **75%** |
| Page     | ~3000 tokens | ~800 tokens | **73%** |
| Apps     | ~1500 tokens | ~400 tokens | **73%** |

**Overall: 70-75% token reduction across all config types**
