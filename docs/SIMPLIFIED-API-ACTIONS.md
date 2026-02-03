# Simplified API Actions Reference

## Overview

The API action system has been streamlined from 16 action types to 9 core types, reducing complexity by 44% while maintaining full functionality.

## The 9 Action Types

### 1. validate - Input Validation
```json
{
  "type": "validate",
  "rules": [
    { "field": "body.email", "rule": "email", "message": "Invalid email format" },
    { "field": "body.age", "rule": "min", "value": 18 },
    { "field": "body.status", "rule": "in", "value": ["active", "inactive"] }
  ]
}
```

**Supported rules:** `required`, `email`, `url`, `uuid`, `min`, `max`, `minLength`, `maxLength`, `pattern`, `in`

### 2. transform - Set Variables
```json
{
  "type": "transform",
  "set": {
    "userId": "{{body.id}}",
    "timestamp": "now()",
    "fullName": "{{body.firstName}} {{body.lastName}}",
    "total": "sum(items, amount)"
  }
}
```

**Special functions:** `now()`, `uuid()`, `sum(array, field)`

### 3. condition - If/Then/Else Logic
```json
{
  "type": "condition",
  "if": "{{user.role}} === 'admin'",
  "then": [
    { "type": "transform", "set": { "canEdit": "true" } }
  ],
  "else": [
    { "type": "error", "status": 403, "message": "Insufficient permissions" }
  ]
}
```

**Supported operators:** `===`, `!==`, `>`, `<`, `>=`, `<=`

### 4. loop - Array Iteration
```json
{
  "type": "loop",
  "array": "{{body.items}}",
  "as": "item",
  "actions": [
    {
      "type": "db.execute",
      "sql": "INSERT INTO items (name, price) VALUES ($1, $2)",
      "params": ["{{item.name}}", "{{item.price}}"]
    }
  ]
}
```

### 5. db.query - Simple SELECT Queries
```json
{
  "type": "db.query",
  "table": "employees",
  "select": ["id", "name", "email"],
  "where": {
    "department": "{{params.dept}}",
    "status": "active"
  },
  "orderBy": "created_at DESC",
  "limit": 10,
  "offset": 0,
  "into": "employees"
}
```

**Use for:** Simple SELECT queries with basic WHERE conditions

### 6. db.execute - Raw SQL with Parameters
```json
{
  "type": "db.execute",
  "sql": "INSERT INTO employees (name, email, department) VALUES ($1, $2, $3) RETURNING id",
  "params": ["{{body.name}}", "{{body.email}}", "{{body.department}}"],
  "into": "employeeId"
}
```

**Use for:**
- INSERT with RETURNING clause
- UPDATE/DELETE operations
- Complex queries (JOINs, GROUP BY, CTEs, etc.)
- Bulk operations

**Examples:**

#### INSERT
```json
{
  "type": "db.execute",
  "sql": "INSERT INTO projects (id, name, created_by) VALUES (gen_random_uuid(), $1, $2) RETURNING id",
  "params": ["{{body.name}}", "{{user.id}}"],
  "into": "projectId"
}
```

#### UPDATE
```json
{
  "type": "db.execute",
  "sql": "UPDATE employees SET status = $1, updated_at = NOW() WHERE id = $2",
  "params": ["{{body.status}}", "{{params.id}}"]
}
```

#### DELETE
```json
{
  "type": "db.execute",
  "sql": "DELETE FROM employees WHERE id = $1 AND created_by = $2",
  "params": ["{{params.id}}", "{{user.id}}"]
}
```

#### Complex SELECT with JOIN
```json
{
  "type": "db.execute",
  "sql": "SELECT e.*, d.name as department_name, COUNT(p.id) as project_count FROM employees e LEFT JOIN departments d ON e.department_id = d.id LEFT JOIN project_members pm ON e.id = pm.employee_id LEFT JOIN projects p ON pm.project_id = p.id WHERE e.status = $1 GROUP BY e.id, d.name ORDER BY project_count DESC LIMIT $2",
  "params": ["active", 10],
  "into": "results"
}
```

#### Bulk INSERT
```json
{
  "type": "db.execute",
  "sql": "INSERT INTO tasks (name, project_id) SELECT name, $1 FROM unnest($2::text[]) AS name",
  "params": ["{{projectId}}", "{{body.taskNames}}"]
}
```

### 7. http.call - External API Calls
```json
{
  "type": "http.call",
  "url": "https://api.example.com/users",
  "method": "POST",
  "headers": {
    "Authorization": "Bearer {{env.API_KEY}}"
  },
  "body": {
    "email": "{{body.email}}",
    "name": "{{body.name}}"
  },
  "into": "apiResponse"
}
```

### 8. response.map - Final Response Mapping
```json
{
  "type": "response.map",
  "fields": {
    "id": "{{employeeId}}",
    "message": "Employee created successfully",
    "data": {
      "name": "{{body.name}}",
      "email": "{{body.email}}"
    }
  },
  "status": 201
}
```

### 9. error - Throw Errors
```json
{
  "type": "error",
  "status": 403,
  "message": "You do not have permission to access this resource",
  "code": "FORBIDDEN"
}
```

## Complete Examples

### Example 1: List Employees
```json
{
  "resource": "employees",
  "name": "Employees API",
  "basePath": "/api/employees",
  "operations": [
    {
      "id": "listEmployees",
      "method": "GET",
      "path": "/",
      "actions": [
        {
          "type": "db.query",
          "table": "employees",
          "where": {
            "status": "active"
          },
          "orderBy": "name ASC",
          "limit": 50,
          "into": "employees"
        },
        {
          "type": "response.map",
          "fields": {
            "data": "{{employees}}",
            "count": "{{employees.length}}"
          }
        }
      ]
    }
  ]
}
```

### Example 2: Create Employee with Validation
```json
{
  "id": "createEmployee",
  "method": "POST",
  "path": "/",
  "actions": [
    {
      "type": "validate",
      "rules": [
        { "field": "body.name", "rule": "required" },
        { "field": "body.email", "rule": "email" },
        { "field": "body.department", "rule": "required" }
      ]
    },
    {
      "type": "db.execute",
      "sql": "INSERT INTO employees (id, name, email, department, created_at) VALUES (gen_random_uuid(), $1, $2, $3, NOW()) RETURNING id, name, email",
      "params": ["{{body.name}}", "{{body.email}}", "{{body.department}}"],
      "into": "employee"
    },
    {
      "type": "response.map",
      "fields": {
        "id": "{{employee.id}}",
        "name": "{{employee.name}}",
        "email": "{{employee.email}}",
        "message": "Employee created successfully"
      },
      "status": 201
    }
  ]
}
```

### Example 3: Update with Conditional Logic
```json
{
  "id": "updateEmployee",
  "method": "PUT",
  "path": "/:id",
  "actions": [
    {
      "type": "db.query",
      "table": "employees",
      "where": {
        "id": "{{params.id}}"
      },
      "limit": 1,
      "into": "employee"
    },
    {
      "type": "condition",
      "if": "{{employee}} === null",
      "then": [
        { "type": "error", "status": 404, "message": "Employee not found" }
      ]
    },
    {
      "type": "condition",
      "if": "{{employee.created_by}} !== {{user.id}} && {{user.role}} !== 'admin'",
      "then": [
        { "type": "error", "status": 403, "message": "Not authorized to update this employee" }
      ]
    },
    {
      "type": "db.execute",
      "sql": "UPDATE employees SET name = $1, email = $2, updated_at = NOW() WHERE id = $3 RETURNING *",
      "params": ["{{body.name}}", "{{body.email}}", "{{params.id}}"],
      "into": "updated"
    },
    {
      "type": "response.map",
      "fields": {
        "data": "{{updated}}",
        "message": "Employee updated successfully"
      }
    }
  ]
}
```

### Example 4: Complex Query with Aggregation
```json
{
  "id": "getEmployeeStats",
  "method": "GET",
  "path": "/stats",
  "actions": [
    {
      "type": "db.execute",
      "sql": "SELECT department, COUNT(*) as count, AVG(salary) as avg_salary FROM employees WHERE status = $1 GROUP BY department ORDER BY count DESC",
      "params": ["active"],
      "into": "stats"
    },
    {
      "type": "db.execute",
      "sql": "SELECT COUNT(*) as total, SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active FROM employees",
      "params": [],
      "into": "totals"
    },
    {
      "type": "response.map",
      "fields": {
        "byDepartment": "{{stats}}",
        "totals": "{{totals}}"
      }
    }
  ]
}
```

### Example 5: Bulk Operations with Loop
```json
{
  "id": "bulkCreateTasks",
  "method": "POST",
  "path": "/tasks/bulk",
  "actions": [
    {
      "type": "validate",
      "rules": [
        { "field": "body.projectId", "rule": "required" },
        { "field": "body.tasks", "rule": "required" }
      ]
    },
    {
      "type": "loop",
      "array": "{{body.tasks}}",
      "as": "task",
      "actions": [
        {
          "type": "db.execute",
          "sql": "INSERT INTO tasks (id, name, project_id, created_at) VALUES (gen_random_uuid(), $1, $2, NOW())",
          "params": ["{{task.name}}", "{{body.projectId}}"]
        }
      ]
    },
    {
      "type": "response.map",
      "fields": {
        "message": "{{body.tasks.length}} tasks created successfully",
        "projectId": "{{body.projectId}}"
      },
      "status": 201
    }
  ]
}
```

## Migration Guide

### From Old Actions to New Actions

| Old Action | New Action | Notes |
|------------|------------|-------|
| `calc` | `transform` with `sum()` | Use `"set": { "total": "sum(items, amount)" }` |
| `db.insert` | `db.execute` | Use `INSERT ... RETURNING` with params |
| `db.update` | `db.execute` | Use `UPDATE` with params |
| `db.delete` | `db.execute` | Use `DELETE` with params |
| `db.bulkInsert` | `db.execute` + `loop` | Use loop for simple bulk, or `unnest()` for SQL bulk |
| `transform.array` | `loop` + `transform` | Iterate and transform each item |
| `transaction` | `db.execute` | Database handles transactions automatically |
| `parallel` | N/A | Actions execute sequentially (simpler, safer) |
| `try/catch` | N/A | Errors propagate automatically, use `condition` to check results |
| `cache.*` | N/A | Removed for MVP (add later if needed) |

### Example Migration

**Before (Old):**
```json
{
  "actions": [
    { "type": "validate", "rules": [...] },
    { "type": "transform", "set": { "body.id": "uuid()" } },
    { "type": "db.insert", "table": "employees", "map": "{{body}}", "returning": "id" },
    { "type": "response.map", "fields": { "id": "{{id}}" } }
  ]
}
```

**After (New):**
```json
{
  "actions": [
    { "type": "validate", "rules": [...] },
    {
      "type": "db.execute",
      "sql": "INSERT INTO employees (id, name, email, created_at) VALUES (gen_random_uuid(), $1, $2, NOW()) RETURNING id",
      "params": ["{{body.name}}", "{{body.email}}"],
      "into": "result"
    },
    { "type": "response.map", "fields": { "id": "{{result.id}}" } }
  ]
}
```

## Benefits

✅ **44% fewer action types** (9 vs 16)
✅ **Simpler for AI to generate** - Clear patterns, less to learn
✅ **More powerful** - Raw SQL enables complex queries
✅ **Always safe** - Parameterized queries prevent SQL injection
✅ **Better performance** - Direct SQL, no ORM overhead
✅ **Standard SQL** - Developers can use their existing SQL knowledge

## Security

All SQL queries use **parameterized queries** (`$1`, `$2`, etc.) which prevent SQL injection attacks. Never concatenate user input into SQL strings - always use parameters.

**Safe:**
```json
{
  "sql": "SELECT * FROM users WHERE email = $1",
  "params": ["{{body.email}}"]
}
```

**Unsafe (DON'T DO THIS):**
```json
{
  "sql": "SELECT * FROM users WHERE email = '{{body.email}}'"
}
```
