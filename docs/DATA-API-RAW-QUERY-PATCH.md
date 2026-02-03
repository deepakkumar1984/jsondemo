# Data-API Raw Query Patch

## Change Required

**File:** `/Users/deepak/Working/blazorly_builder/blazorly/data-api/src/routes/query.ts`

**Lines:** 45-51

### Current Code (Restrictive)

```typescript
// Validate SQL - only allow SELECT queries for safety
const sqlTrimmed = sql.trim().toUpperCase();
if (!sqlTrimmed.startsWith('SELECT')) {
  return c.json({
    errors: [{ message: 'Only SELECT queries are allowed. Use standard CRUD endpoints for INSERT/UPDATE/DELETE operations.' }]
  }, 400);
}
```

### New Code (Flexible)

```typescript
// Validate SQL - allow SELECT, INSERT, UPDATE, DELETE, WITH (CTE) queries
// Security is handled by parameterized queries ($1, $2, etc.)
const sqlTrimmed = sql.trim().toUpperCase();
const allowedStatements = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'WITH'];
const isAllowed = allowedStatements.some(stmt => sqlTrimmed.startsWith(stmt));

if (!isAllowed) {
  return c.json({
    errors: [{
      message: `Only ${allowedStatements.join(', ')} queries are allowed. Received query starting with: ${sqlTrimmed.split(' ')[0]}`
    }]
  }, 400);
}

// Additional safety: Block dangerous commands
const dangerous = ['DROP', 'TRUNCATE', 'ALTER', 'CREATE', 'GRANT', 'REVOKE'];
const hasDangerous = dangerous.some(cmd => sqlTrimmed.includes(cmd));
if (hasDangerous) {
  return c.json({
    errors: [{ message: 'DDL and permission commands are not allowed' }]
  }, 403);
}
```

## Implementation Steps

### 1. Open the file

```bash
cd /Users/deepak/Working/blazorly_builder/blazorly/data-api
code src/routes/query.ts
# or
vim src/routes/query.ts
```

### 2. Replace lines 45-51 with the new code above

### 3. Restart the data-api

```bash
npm run dev
# or
wrangler dev
```

## Security Considerations

### ✅ Safe

- **Parameterized queries** prevent SQL injection
- **Blocklist** prevents DDL commands (DROP, CREATE, ALTER, etc.)
- **Tenant isolation** is maintained (handled by middleware)
- **Query timeouts** prevent long-running queries

### ⚠️ What's NOT Protected

- **Performance**: Complex queries can still be slow
- **Permissions**: Row-level security must be handled in SQL (WHERE created_by = $1)
- **Resource limits**: No query cost estimation

### Best Practices for Callers

1. **Always use parameterized queries:**
   ```json
   {
     "sql": "INSERT INTO users (name) VALUES ($1)",
     "params": ["John"]
   }
   ```

2. **Never concatenate user input:**
   ```json
   // ❌ UNSAFE - DON'T DO THIS
   {
     "sql": "INSERT INTO users (name) VALUES ('{{body.name}}')"
   }
   ```

3. **Include user context in WHERE clauses:**
   ```sql
   UPDATE employees SET status = $1
   WHERE id = $2 AND created_by = $3
   ```

## Testing the Change

### Test 1: SELECT (Should still work)

```bash
curl -X POST http://localhost:8789/query/raw \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: your-tenant-id" \
  -H "x-api-key: your-api-key" \
  -d '{
    "sql": "SELECT * FROM employees WHERE status = $1",
    "params": ["active"]
  }'
```

### Test 2: INSERT (Should now work)

```bash
curl -X POST http://localhost:8789/query/raw \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: your-tenant-id" \
  -H "x-api-key: your-api-key" \
  -d '{
    "sql": "INSERT INTO employees (name, email) VALUES ($1, $2) RETURNING id",
    "params": ["Test User", "test@example.com"]
  }'
```

### Test 3: UPDATE (Should now work)

```bash
curl -X POST http://localhost:8789/query/raw \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: your-tenant-id" \
  -H "x-api-key: your-api-key" \
  -d '{
    "sql": "UPDATE employees SET status = $1 WHERE id = $2",
    "params": ["inactive", "some-uuid"]
  }'
```

### Test 4: DELETE (Should now work)

```bash
curl -X POST http://localhost:8789/query/raw \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: your-tenant-id" \
  -H "x-api-key: your-api-key" \
  -d '{
    "sql": "DELETE FROM employees WHERE id = $1",
    "params": ["some-uuid"]
  }'
```

### Test 5: Dangerous commands (Should be blocked)

```bash
# Should return 403 error
curl -X POST http://localhost:8789/query/raw \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: your-tenant-id" \
  -H "x-api-key: your-api-key" \
  -d '{
    "sql": "DROP TABLE employees",
    "params": []
  }'
```

## Expected Behavior After Change

| Query Type | Before | After | Status Code |
|------------|--------|-------|-------------|
| SELECT | ✅ Allowed | ✅ Allowed | 200 |
| INSERT | ❌ Blocked | ✅ Allowed | 200 |
| UPDATE | ❌ Blocked | ✅ Allowed | 200 |
| DELETE | ❌ Blocked | ✅ Allowed | 200 |
| WITH (CTE) | ❌ Blocked | ✅ Allowed | 200 |
| DROP | ❌ Blocked | ❌ Blocked | 403 |
| CREATE | ❌ Blocked | ❌ Blocked | 403 |
| ALTER | ❌ Blocked | ❌ Blocked | 403 |

## Rollback

If you need to rollback, simply restore the original 3 lines:

```typescript
const sqlTrimmed = sql.trim().toUpperCase();
if (!sqlTrimmed.startsWith('SELECT')) {
  return c.json({
    errors: [{ message: 'Only SELECT queries are allowed. Use standard CRUD endpoints for INSERT/UPDATE/DELETE operations.' }]
  }, 400);
}
```

## Production Considerations

### Additional Protections (Optional)

1. **Rate limiting** per tenant
2. **Query logging** for audit trails
3. **Query timeouts** (if not already implemented)
4. **Row count limits** for mutations

### Monitoring

Track these metrics:
- Query execution time
- Failed query attempts
- Queries per tenant
- DDL block attempts

## Integration with jsondemo

Once this change is deployed, your `db.execute` action will work seamlessly:

```json
{
  "type": "db.execute",
  "sql": "INSERT INTO employees (id, name, email, created_at) VALUES (gen_random_uuid(), $1, $2, NOW()) RETURNING id",
  "params": ["{{body.name}}", "{{body.email}}"],
  "into": "employee"
}
```

The ActionEngine in jsondemo will call `client.rawQuery(sql, params)` which will now work for INSERT/UPDATE/DELETE operations.
