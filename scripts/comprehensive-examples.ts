/**
 * COMPREHENSIVE EXAMPLES FOR AI CONFIG GENERATION
 *
 * These examples demonstrate EVERY property, function, action type, and pattern
 * available in the jsondemo config system. Use these as training data for AI.
 *
 * CRITICAL: These examples must be kept in sync with format schemas.
 * If you add new features to the system, ADD THEM HERE.
 */

export const COMPREHENSIVE_SCHEMA_EXAMPLES = [
  // Example 1: Advanced schema with all column types and constraints
  {
    "description": "Shows all column types, constraints, default functions, and indexes",
    "config": {
      "table": "employees",
      "description": "Employee records with comprehensive field types",
      "columns": [
        {
          "name": "id",
          "type": "text",
          "primaryKey": true,
          "defaultFn": "uuid",
          "description": "Unique employee identifier"
        },
        {
          "name": "email",
          "type": "text",
          "notNull": true,
          "unique": true,
          "description": "Employee email address"
        },
        {
          "name": "full_name",
          "type": "text",
          "notNull": true
        },
        {
          "name": "age",
          "type": "integer",
          "notNull": false
        },
        {
          "name": "salary",
          "type": "numeric",
          "notNull": true,
          "default": 0
        },
        {
          "name": "is_active",
          "type": "boolean",
          "notNull": true,
          "default": true
        },
        {
          "name": "hire_date",
          "type": "timestamp",
          "notNull": true,
          "default": "CURRENT_TIMESTAMP"
        },
        {
          "name": "metadata",
          "type": "jsonb",
          "notNull": false,
          "description": "Additional employee metadata"
        },
        {
          "name": "department_id",
          "type": "text",
          "notNull": true,
          "references": {
            "table": "departments",
            "column": "id",
            "onDelete": "cascade"
          }
        },
        {
          "name": "manager_id",
          "type": "text",
          "notNull": false,
          "references": {
            "table": "employees",
            "column": "id",
            "onDelete": "set null"
          }
        },
        {
          "name": "created_at",
          "type": "timestamp",
          "notNull": true,
          "default": "CURRENT_TIMESTAMP"
        },
        {
          "name": "updated_at",
          "type": "timestamp",
          "notNull": true,
          "default": "CURRENT_TIMESTAMP"
        }
      ],
      "indexes": [
        {
          "name": "idx_employees_email",
          "columns": ["email"],
          "unique": true
        },
        {
          "name": "idx_employees_department",
          "columns": ["department_id"]
        },
        {
          "name": "idx_employees_active_dept",
          "columns": ["is_active", "department_id"]
        }
      ]
    }
  },
  // Example 2: Simple schema with auto-increment and minimal constraints
  {
    "description": "Shows serial type for autoincrement, minimal constraints, and simple structure",
    "config": {
      "table": "categories",
      "description": "Product categories",
      "columns": [
        {
          "name": "id",
          "type": "serial",
          "primaryKey": true
        },
        {
          "name": "name",
          "type": "text",
          "notNull": true,
          "unique": true
        },
        {
          "name": "slug",
          "type": "text",
          "notNull": true,
          "unique": true
        },
        {
          "name": "parent_id",
          "type": "integer",
          "notNull": false,
          "references": {
            "table": "categories",
            "column": "id",
            "onDelete": "cascade"
          },
          "description": "Self-referencing for category hierarchy"
        },
        {
          "name": "display_order",
          "type": "integer",
          "notNull": true,
          "default": 0
        },
        {
          "name": "is_visible",
          "type": "boolean",
          "notNull": true,
          "default": true
        }
      ],
      "indexes": [
        {
          "name": "idx_categories_slug",
          "columns": ["slug"],
          "unique": true
        },
        {
          "name": "idx_categories_parent",
          "columns": ["parent_id"]
        }
      ]
    }
  }
];

export const COMPREHENSIVE_API_EXAMPLES = [
  // Example 1: MINIMAL example - basic CRUD with correct structure
  {
    "description": "MINIMAL example showing basic CRUD structure - USE THIS AS YOUR PRIMARY TEMPLATE",
    "config": {
      "name": "Tasks API",
      "basePath": "/api/tasks",
      "operations": [
        {
          "id": "listTasks",
          "method": "GET",
          "path": "/",
          "actions": [
            {
              "type": "db.query",
              "table": "tasks",
              "where": { "user_id": "{{user.id}}" },
              "orderBy": [{ "field": "created_at", "direction": "DESC" }],
              "into": "tasks"
            },
            {
              "type": "response.map",
              "fields": { "items": "{{tasks}}" }
            }
          ]
        },
        {
          "id": "createTask",
          "method": "POST",
          "path": "/",
          "actions": [
            {
              "type": "validate",
              "rules": [
                { "field": "body.title", "rule": "required" }
              ]
            },
            {
              "type": "transform",
              "set": {
                "body.id": "uuid()",
                "body.userId": "{{user.id}}",
                "body.createdAt": "now()"
              }
            },
            {
              "type": "db.insert",
              "table": "tasks",
              "map": {
                "id": "{{body.id}}",
                "user_id": "{{body.userId}}",
                "title": "{{body.title}}",
                "created_at": "{{body.createdAt}}"
              },
              "returning": "taskId"
            },
            {
              "type": "response.map",
              "statusCode": 201,
              "fields": { "id": "{{taskId}}" }
            }
          ]
        }
      ]
    }
  },
  // Example 2: Complete CRUD operations with ALL action types
  {
    "description": "Shows ALL action types: validate, transform, db operations, conditions, loops, http calls, transactions, error handling",
    "config": {
      "resource": "time-entries",
      "name": "Time Entry Management API",
      "basePath": "/api/time-entries",
      "description": "Comprehensive time tracking with all action patterns",
      "operations": [
        {
          "id": "createTimeEntry",
          "name": "Create Time Entry",
          "method": "POST",
          "path": "/",
          "description": "Create time entry with validation, transformation, and transaction",
          "requestSchema": {
            "type": "object",
            "properties": {
              "projectId": { "type": "string" },
              "description": { "type": "string" },
              "hours": { "type": "number" },
              "date": { "type": "string" },
              "tags": { "type": "array", "items": { "type": "string" } }
            },
            "required": ["projectId", "hours", "date"]
          },
          "responseSchema": {
            "type": "object",
            "properties": {
              "id": { "type": "string" },
              "message": { "type": "string" },
              "calculatedRate": { "type": "number" }
            }
          },
          "requiresAuth": true,
          "actions": [
            {
              "type": "validate",
              "rules": [
                { "field": "body.projectId", "rule": "required", "message": "Project ID is required" },
                { "field": "body.hours", "rule": "required" },
                { "field": "body.hours", "rule": "min", "value": 0.1 },
                { "field": "body.hours", "rule": "max", "value": 24 },
                { "field": "body.date", "rule": "required" },
                { "field": "body.description", "rule": "max", "value": 500 }
              ]
            },
            {
              "type": "db.query",
              "table": "projects",
              "where": { "id": "{{body.projectId}}" },
              "limit": 1,
              "into": "project",
              "description": "Verify project exists"
            },
            {
              "type": "condition",
              "if": "{{project}} == null",
              "then": [
                {
                  "type": "response.map",
                  "status": 404,
                  "fields": {
                    "error": "Project not found"
                  }
                }
              ]
            },
            {
              "type": "transform",
              "set": {
                "body.id": "uuid()",
                "body.userId": "{{user.id}}",
                "body.createdAt": "now()",
                "body.status": "pending"
              }
            },
            {
              "type": "calc",
              "formula": "{{body.hours}} * {{project.hourlyRate}}",
              "into": "calculatedAmount"
            },
            {
              "type": "transaction",
              "actions": [
                {
                  "type": "db.insert",
                  "table": "time_entries",
                  "map": {
                    "id": "{{body.id}}",
                    "project_id": "{{body.projectId}}",
                    "user_id": "{{body.userId}}",
                    "description": "{{body.description}}",
                    "hours": "{{body.hours}}",
                    "date": "{{body.date}}",
                    "amount": "{{calculatedAmount}}",
                    "status": "{{body.status}}",
                    "created_at": "{{body.createdAt}}"
                  },
                  "returning": "timeEntryId"
                },
                {
                  "type": "condition",
                  "if": "{{body.tags}} != null && {{body.tags.length}} > 0",
                  "then": [
                    {
                      "type": "transform.array",
                      "source": "{{body.tags}}",
                      "map": {
                        "time_entry_id": "{{body.id}}",
                        "tag": "{{item}}",
                        "created_at": "{{body.createdAt}}"
                      },
                      "into": "tagRecords"
                    },
                    {
                      "type": "db.bulkInsert",
                      "table": "time_entry_tags",
                      "items": "{{tagRecords}}"
                    }
                  ]
                },
                {
                  "type": "db.update",
                  "table": "projects",
                  "where": { "id": "{{body.projectId}}" },
                  "map": {
                    "total_hours": "total_hours + {{body.hours}}",
                    "updated_at": "now()"
                  }
                }
              ]
            },
            {
              "type": "response.map",
              "status": 201,
              "fields": {
                "id": "{{body.id}}",
                "message": "Time entry created successfully",
                "calculatedRate": "{{calculatedAmount}}"
              }
            }
          ]
        },
        {
          "id": "listTimeEntries",
          "name": "List Time Entries",
          "method": "GET",
          "path": "/",
          "description": "Query with filters, pagination, sorting",
          "requestSchema": {
            "type": "object",
            "properties": {
              "projectId": { "type": "string" },
              "status": { "type": "string" },
              "startDate": { "type": "string" },
              "endDate": { "type": "string" },
              "limit": { "type": "number" },
              "offset": { "type": "number" }
            }
          },
          "requiresAuth": true,
          "actions": [
            {
              "type": "transform",
              "set": {
                "query.limit": "{{query.limit || 50}}",
                "query.offset": "{{query.offset || 0}}"
              }
            },
            {
              "type": "db.query",
              "table": "time_entries",
              "where": {
                "user_id": "{{user.id}}",
                "project_id": "{{query.projectId}}",
                "status": "{{query.status}}",
                "date": {
                  "_gte": "{{query.startDate}}",
                  "_lte": "{{query.endDate}}"
                }
              },
              "orderBy": { "date": "desc", "created_at": "desc" },
              "limit": "{{query.limit}}",
              "offset": "{{query.offset}}",
              "into": "entries"
            },
            {
              "type": "db.query",
              "table": "time_entries",
              "where": {
                "user_id": "{{user.id}}",
                "project_id": "{{query.projectId}}",
                "status": "{{query.status}}"
              },
              "select": ["COUNT(*) as total"],
              "limit": 1,
              "into": "countResult"
            },
            {
              "type": "calc",
              "formula": "sum({{entries}}, 'hours')",
              "into": "totalHours"
            },
            {
              "type": "response.map",
              "fields": {
                "items": "{{entries}}",
                "total": "{{countResult.total}}",
                "totalHours": "{{totalHours}}",
                "limit": "{{query.limit}}",
                "offset": "{{query.offset}}"
              }
            }
          ]
        },
        {
          "id": "updateTimeEntry",
          "name": "Update Time Entry",
          "method": "PUT",
          "path": "/:id",
          "description": "Update with validation and error handling",
          "requestSchema": {
            "type": "object",
            "properties": {
              "description": { "type": "string" },
              "hours": { "type": "number" },
              "status": { "type": "string", "enum": ["pending", "approved", "rejected"] }
            }
          },
          "requiresAuth": true,
          "actions": [
            {
              "type": "try",
              "actions": [
                {
                  "type": "db.query",
                  "table": "time_entries",
                  "where": { "id": "{{params.id}}", "user_id": "{{user.id}}" },
                  "limit": 1,
                  "into": "existingEntry"
                },
                {
                  "type": "condition",
                  "if": "{{existingEntry}} == null",
                  "then": [
                    {
                      "type": "response.map",
                      "status": 404,
                      "fields": { "error": "Time entry not found" }
                    }
                  ]
                },
                {
                  "type": "validate",
                  "rules": [
                    { "field": "body.hours", "rule": "min", "value": 0.1 },
                    { "field": "body.hours", "rule": "max", "value": 24 }
                  ]
                },
                {
                  "type": "transform",
                  "set": {
                    "body.updatedAt": "now()"
                  }
                },
                {
                  "type": "db.update",
                  "table": "time_entries",
                  "where": { "id": "{{params.id}}" },
                  "map": {
                    "description": "{{body.description}}",
                    "hours": "{{body.hours}}",
                    "status": "{{body.status}}",
                    "updated_at": "{{body.updatedAt}}"
                  },
                  "returning": "id"
                },
                {
                  "type": "response.map",
                  "fields": {
                    "id": "{{id}}",
                    "message": "Time entry updated successfully"
                  }
                }
              ],
              "catch": [
                {
                  "type": "response.map",
                  "status": 500,
                  "fields": {
                    "error": "Failed to update time entry",
                    "details": "{{error.message}}"
                  }
                }
              ]
            }
          ]
        },
        {
          "id": "deleteTimeEntry",
          "name": "Delete Time Entry",
          "method": "DELETE",
          "path": "/:id",
          "requiresAuth": true,
          "actions": [
            {
              "type": "db.query",
              "table": "time_entries",
              "where": { "id": "{{params.id}}", "user_id": "{{user.id}}" },
              "limit": 1,
              "into": "entry"
            },
            {
              "type": "condition",
              "if": "{{entry}} == null",
              "then": [
                {
                  "type": "response.map",
                  "status": 404,
                  "fields": { "error": "Time entry not found" }
                }
              ]
            },
            {
              "type": "db.delete",
              "table": "time_entries",
              "where": { "id": "{{params.id}}" },
              "returning": "id"
            },
            {
              "type": "response.map",
              "fields": {
                "message": "Time entry deleted successfully"
              }
            }
          ]
        },
        {
          "id": "bulkApprove",
          "name": "Bulk Approve Time Entries",
          "method": "POST",
          "path": "/bulk-approve",
          "description": "Shows loop, parallel actions, and http.call",
          "requestSchema": {
            "type": "object",
            "properties": {
              "entryIds": { "type": "array", "items": { "type": "string" } }
            },
            "required": ["entryIds"]
          },
          "requiresAuth": true,
          "actions": [
            {
              "type": "validate",
              "rules": [
                { "field": "body.entryIds", "rule": "required" },
                { "field": "body.entryIds", "rule": "min", "value": 1 }
              ]
            },
            {
              "type": "db.query",
              "table": "time_entries",
              "where": {
                "id": { "_in": "{{body.entryIds}}" },
                "status": "pending"
              },
              "into": "entriesToApprove"
            },
            {
              "type": "loop",
              "source": "{{entriesToApprove}}",
              "itemVar": "entry",
              "indexVar": "idx",
              "actions": [
                {
                  "type": "db.update",
                  "table": "time_entries",
                  "where": { "id": "{{entry.id}}" },
                  "map": {
                    "status": "approved",
                    "approved_by": "{{user.id}}",
                    "approved_at": "now()"
                  }
                }
              ]
            },
            {
              "type": "parallel",
              "actions": [
                {
                  "type": "http.call",
                  "url": "https://api.example.com/notifications/send",
                  "method": "POST",
                  "headers": {
                    "Authorization": "Bearer {{env.NOTIFICATION_API_KEY}}"
                  },
                  "body": {
                    "type": "bulk_approval",
                    "count": "{{entriesToApprove.length}}",
                    "approvedBy": "{{user.id}}"
                  },
                  "into": "notificationResult"
                },
                {
                  "type": "db.insert",
                  "table": "approval_logs",
                  "map": {
                    "id": "uuid()",
                    "approver_id": "{{user.id}}",
                    "entry_count": "{{entriesToApprove.length}}",
                    "created_at": "now()"
                  }
                }
              ]
            },
            {
              "type": "response.map",
              "fields": {
                "message": "{{entriesToApprove.length}} time entries approved",
                "approvedIds": "{{body.entryIds}}"
              }
            }
          ]
        }
      ]
    }
  },
  // Example 2: Report generation with advanced queries and transformations
  {
    "description": "Shows complex queries, aggregations, nested transformations, custom validation",
    "config": {
      "resource": "reports",
      "name": "Analytics Reports API",
      "basePath": "/api/reports",
      "operations": [
        {
          "id": "projectSummary",
          "name": "Generate Project Summary Report",
          "method": "GET",
          "path": "/project-summary",
          "requiresAuth": true,
          "actions": [
            {
              "type": "validate",
              "rules": [
                { "field": "query.startDate", "rule": "required" },
                { "field": "query.endDate", "rule": "required" },
                { "field": "query.startDate", "rule": "pattern", "value": "^\\d{4}-\\d{2}-\\d{2}$", "message": "Date must be YYYY-MM-DD" }
              ]
            },
            {
              "type": "db.query",
              "table": "time_entries",
              "where": {
                "date": {
                  "_gte": "{{query.startDate}}",
                  "_lte": "{{query.endDate}}"
                },
                "status": "approved"
              },
              "select": [
                "project_id",
                "SUM(hours) as total_hours",
                "SUM(amount) as total_amount",
                "COUNT(*) as entry_count"
              ],
              "groupBy": ["project_id"],
              "orderBy": { "total_hours": "desc" },
              "into": "projectStats"
            },
            {
              "type": "transform.array",
              "source": "{{projectStats}}",
              "map": {
                "projectId": "{{item.project_id}}",
                "hours": "{{item.total_hours}}",
                "amount": "{{item.total_amount}}",
                "entries": "{{item.entry_count}}"
              },
              "into": "formattedStats"
            },
            {
              "type": "calc",
              "formula": "sum({{formattedStats}}, 'hours')",
              "into": "grandTotalHours"
            },
            {
              "type": "calc",
              "formula": "sum({{formattedStats}}, 'amount')",
              "into": "grandTotalAmount"
            },
            {
              "type": "response.map",
              "fields": {
                "reportPeriod": {
                  "start": "{{query.startDate}}",
                  "end": "{{query.endDate}}"
                },
                "projects": "{{formattedStats}}",
                "totals": {
                  "hours": "{{grandTotalHours}}",
                  "amount": "{{grandTotalAmount}}",
                  "projectCount": "{{formattedStats.length}}"
                },
                "generatedAt": "now()",
                "generatedBy": "{{user.id}}"
              }
            }
          ]
        }
      ]
    }
  }
];

export const COMPREHENSIVE_PAGE_EXAMPLES = [
  // Example 1: Simple list page with DataTable
  {
    "description": "Basic list page with search, filters, and row actions using DataTable",
    "config": {
      "dataSources": {
        "items": {
          "url": "/items"
        }
      },
      "children": [
        {
          "type": "PageHeader",
          "props": {
            "title": "Items",
            "subtitle": "Manage your items"
          }
        },
        {
          "type": "Card",
          "children": [
            {
              "type": "DataTable",
              "props": {
                "dataPath": "items",
                "searchable": true,
                "searchPlaceholder": "Search items...",
                "paginated": true,
                "columns": [
                  {
                    "key": "name",
                    "header": "Name"
                  },
                  {
                    "key": "status",
                    "header": "Status",
                    "render": "badge"
                  },
                  {
                    "key": "createdAt",
                    "header": "Created",
                    "format": "date"
                  }
                ],
                "rowClickAction": {
                  "to": "/items/:id"
                },
                "emptyMessage": "No items found"
              }
            }
          ]
        }
      ]
    }
  },
  // Example 2: Form page with various field types
  {
    "description": "Form with TextField, TextArea, SelectField, DateField, and submit action",
    "config": {
      "dataSources": {
        "item": {
          "url": "/items/:id"
        },
        "categories": {
          "url": "/categories"
        }
      },
      "children": [
        {
          "type": "PageHeader",
          "props": {
            "title": "Edit Item"
          }
        },
        {
          "type": "Card",
          "children": [
            {
              "type": "Form",
              "props": {
                "action": {
                  "type": "submit_form",
                  "url": "/items/:id",
                  "method": "PUT",
                  "onSuccess": {
                    "type": "navigate",
                    "to": "/items"
                  }
                }
              },
              "children": [
                {
                  "type": "TextField",
                  "props": {
                    "label": "Name",
                    "bindPath": "name",
                    "validation": {
                      "checks": [
                        { "fn": "required", "message": "Name is required" },
                        { "fn": "minLength", "args": 3, "message": "Min 3 characters" },
                        { "fn": "maxLength", "args": 100 }
                      ],
                      "validateOn": "blur"
                    }
                  }
                },
                {
                  "type": "TextArea",
                  "props": {
                    "label": "Description",
                    "bindPath": "description",
                    "rows": 4,
                    "validation": {
                      "checks": [
                        { "fn": "maxLength", "args": 500, "message": "Max 500 characters" }
                      ]
                    }
                  }
                },
                {
                  "type": "SelectField",
                  "props": {
                    "label": "Category",
                    "bindPath": "categoryId",
                    "optionsPath": "categories",
                    "validation": {
                      "checks": [
                        { "fn": "required", "message": "Please select a category" }
                      ]
                    }
                  }
                },
                {
                  "type": "DateField",
                  "props": {
                    "label": "Due Date",
                    "bindPath": "dueDate",
                    "validation": {
                      "checks": [
                        { "fn": "required" }
                      ]
                    }
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  },
  // Example 3: Dashboard with StatCards and Grid layout
  {
    "description": "Dashboard page with statistics, grid layout, and multiple data sources",
    "config": {
      "dataSources": {
        "stats": {
          "url": "/dashboard/stats"
        },
        "recentItems": {
          "url": "/items?limit=5"
        }
      },
      "children": [
        {
          "type": "PageHeader",
          "props": {
            "title": "Dashboard",
            "subtitle": "Overview of your data"
          }
        },
        {
          "type": "Grid",
          "props": {
            "columns": 3,
            "gap": "4"
          },
          "children": [
            {
              "type": "StatCard",
              "props": {
                "label": "Total Items",
                "valuePath": "stats.totalItems"
              }
            },
            {
              "type": "StatCard",
              "props": {
                "label": "Active",
                "valuePath": "stats.activeItems"
              }
            },
            {
              "type": "StatCard",
              "props": {
                "label": "Completed",
                "valuePath": "stats.completedItems"
              }
            }
          ]
        },
        {
          "type": "Card",
          "props": {
            "title": "Recent Items"
          },
          "children": [
            {
              "type": "DataTable",
              "props": {
                "dataPath": "recentItems",
                "columns": [
                  {
                    "key": "name",
                    "header": "Name"
                  },
                  {
                    "key": "status",
                    "header": "Status",
                    "render": "badge"
                  },
                  {
                    "key": "updatedAt",
                    "header": "Updated",
                    "format": "date"
                  }
                ]
              }
            }
          ]
        }
      ]
    }
  },
  // Example 4: Visibility conditions with logic expressions
  {
    "description": "Conditional rendering using visible property with path, auth, and logic expressions",
    "config": {
      "dataSources": {
        "user": {
          "url": "/auth/me"
        },
        "item": {
          "url": "/items/:id"
        }
      },
      "children": [
        {
          "type": "PageHeader",
          "props": {
            "title": "Item Details"
          }
        },
        {
          "type": "Alert",
          "visible": { "auth": "signedIn" },
          "props": {
            "title": "Welcome",
            "message": "You are signed in"
          }
        },
        {
          "type": "Card",
          "visible": { "path": "/item" },
          "props": {
            "title": "Item Information"
          },
          "children": [
            {
              "type": "DetailSection",
              "props": {
                "title": "Details"
              },
              "children": [
                {
                  "type": "DetailRow",
                  "props": {
                    "label": "Name",
                    "valuePath": "item.name"
                  }
                },
                {
                  "type": "DetailRow",
                  "props": {
                    "label": "Status",
                    "valuePath": "item.status"
                  }
                }
              ]
            }
          ]
        },
        {
          "type": "Button",
          "visible": {
            "and": [
              { "path": "/user/isAdmin" },
              { "eq": [{ "path": "/item/status" }, "draft"] }
            ]
          },
          "props": {
            "label": "Publish Draft",
            "action": {
              "type": "api_call",
              "method": "POST",
              "url": "/items/:id/publish"
            }
          }
        },
        {
          "type": "Button",
          "visible": {
            "or": [
              { "path": "/user/isAdmin" },
              { "eq": [{ "path": "/item/createdBy" }, { "path": "/user/id" }] }
            ]
          },
          "props": {
            "label": "Edit",
            "action": {
              "type": "navigate",
              "to": "/items/:id/edit"
            }
          }
        },
        {
          "type": "Alert",
          "visible": {
            "not": { "path": "/item/isPublished" }
          },
          "props": {
            "variant": "destructive",
            "message": "This item is not published yet"
          }
        },
        {
          "type": "Card",
          "visible": {
            "and": [
              { "path": "/user/isAdmin" },
              { "gt": [{ "path": "/item/views" }, 100] }
            ]
          },
          "props": {
            "title": "Popular Item"
          },
          "children": [
            {
              "type": "Text",
              "props": {
                "content": "This item has over 100 views"
              }
            }
          ]
        }
      ]
    }
  },
  // Example 5: Action enhancements with confirm, onSuccess, onError
  {
    "description": "Demonstrates confirm dialogs and action chaining with onSuccess/onError",
    "config": {
      "dataSources": {
        "item": {
          "url": "/items/:id"
        }
      },
      "children": [
        {
          "type": "PageHeader",
          "props": {
            "title": "Advanced Actions"
          }
        },
        {
          "type": "Card",
          "props": {
            "title": "Action Examples"
          },
          "children": [
            {
              "type": "Stack",
              "props": {
                "direction": "vertical",
                "gap": "4"
              },
              "children": [
                {
                  "type": "Button",
                  "props": {
                    "label": "Delete with Confirmation",
                    "variant": "destructive",
                    "action": {
                      "type": "delete_confirm",
                      "url": "/items/:id",
                      "confirm": {
                        "title": "Delete Item",
                        "message": "Are you sure you want to delete this item? This action cannot be undone.",
                        "variant": "destructive"
                      },
                      "onSuccess": {
                        "type": "navigate",
                        "to": "/items"
                      }
                    }
                  }
                },
                {
                  "type": "Button",
                  "props": {
                    "label": "Publish with Success Action",
                    "action": {
                      "type": "api_call",
                      "method": "POST",
                      "url": "/items/:id/publish",
                      "confirm": {
                        "message": "Publish this item now?"
                      },
                      "onSuccess": {
                        "type": "refresh_data"
                      }
                    }
                  }
                },
                {
                  "type": "Button",
                  "props": {
                    "label": "Submit with Error Handling",
                    "action": {
                      "type": "api_call",
                      "method": "POST",
                      "url": "/items/:id/validate",
                      "onSuccess": {
                        "type": "navigate",
                        "to": "/items/:id/success"
                      },
                      "onError": {
                        "type": "refresh_data"
                      }
                    }
                  }
                },
                {
                  "type": "Button",
                  "props": {
                    "label": "Complex Chain",
                    "action": {
                      "type": "submit_form",
                      "url": "/items",
                      "method": "POST",
                      "confirm": {
                        "title": "Create Item",
                        "message": "Create this new item?"
                      },
                      "onSuccess": {
                        "type": "api_call",
                        "method": "POST",
                        "url": "/notifications/send",
                        "onSuccess": {
                          "type": "navigate",
                          "to": "/items"
                        }
                      }
                    }
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  }
];

export const COMPREHENSIVE_APPS_EXAMPLES = [
  // Example 1: Multi-app configuration with all routing features
  {
    "description": "Shows multiple apps, nested routes, route params, public/protected routes, navigation categories",
    "config": {
      "apps": [
        {
          "id": "main",
          "name": "Main Application",
          "description": "Primary application for project and time tracking",
          "defaultRoute": "/dashboard",
          "routes": [
            {
              "path": "/",
              "page": "landing",
              "public": true
            },
            {
              "path": "/login",
              "page": "auth/login",
              "public": true
            },
            {
              "path": "/signup",
              "page": "auth/signup",
              "public": true
            },
            {
              "path": "/forgot-password",
              "page": "auth/forgot-password",
              "public": true
            },
            {
              "path": "/dashboard",
              "page": "dashboard",
              "requiresAuth": true
            },
            {
              "path": "/projects",
              "page": "projects/list",
              "requiresAuth": true
            },
            {
              "path": "/projects/new",
              "page": "projects/form",
              "requiresAuth": true
            },
            {
              "path": "/projects/:id",
              "page": "projects/detail",
              "requiresAuth": true
            },
            {
              "path": "/projects/:id/edit",
              "page": "projects/form",
              "requiresAuth": true
            },
            {
              "path": "/time-entries",
              "page": "time-entries/list",
              "requiresAuth": true
            },
            {
              "path": "/time-entries/new",
              "page": "time-entries/form",
              "requiresAuth": true
            },
            {
              "path": "/time-entries/:id",
              "page": "time-entries/detail",
              "requiresAuth": true
            },
            {
              "path": "/reports",
              "page": "reports/dashboard",
              "requiresAuth": true
            },
            {
              "path": "/reports/project-summary",
              "page": "reports/project-summary",
              "requiresAuth": true
            },
            {
              "path": "/reports/time-tracking",
              "page": "reports/time-tracking",
              "requiresAuth": true
            },
            {
              "path": "/clients",
              "page": "clients/list",
              "requiresAuth": true
            },
            {
              "path": "/clients/:id",
              "page": "clients/detail",
              "requiresAuth": true
            },
            {
              "path": "/settings",
              "page": "settings/general",
              "requiresAuth": true
            },
            {
              "path": "/settings/profile",
              "page": "settings/profile",
              "requiresAuth": true
            },
            {
              "path": "/settings/team",
              "page": "settings/team",
              "requiresAuth": true
            }
          ],
          "navigation": {
            "categories": [
              {
                "title": "Overview",
                "items": [
                  {
                    "title": "Dashboard",
                    "path": "/dashboard",
                    "page": "dashboard",
                    "icon": "HomeIcon",
                    "description": "Overview of projects and time tracking"
                  }
                ]
              },
              {
                "title": "Work",
                "items": [
                  {
                    "title": "Projects",
                    "path": "/projects",
                    "page": "projects/list",
                    "icon": "FolderIcon",
                    "description": "Manage your projects"
                  },
                  {
                    "title": "Time Entries",
                    "path": "/time-entries",
                    "page": "time-entries/list",
                    "icon": "ClockIcon",
                    "description": "Track time and activities",
                    "badge": {
                      "dataPath": "pendingEntries.count",
                      "variant": "warning"
                    }
                  },
                  {
                    "title": "Clients",
                    "path": "/clients",
                    "page": "clients/list",
                    "icon": "UsersIcon",
                    "description": "Manage client relationships"
                  }
                ]
              },
              {
                "title": "Analytics",
                "items": [
                  {
                    "title": "Reports",
                    "path": "/reports",
                    "page": "reports/dashboard",
                    "icon": "ChartBarIcon",
                    "description": "View analytics and reports"
                  }
                ]
              },
              {
                "title": "Settings",
                "items": [
                  {
                    "title": "General",
                    "path": "/settings",
                    "page": "settings/general",
                    "icon": "CogIcon"
                  },
                  {
                    "title": "Profile",
                    "path": "/settings/profile",
                    "page": "settings/profile",
                    "icon": "UserIcon"
                  },
                  {
                    "title": "Team",
                    "path": "/settings/team",
                    "page": "settings/team",
                    "icon": "UsersIcon"
                  }
                ]
              }
            ]
          }
        },
        {
          "id": "admin",
          "name": "Admin Portal",
          "description": "Administrative functions and system management",
          "defaultRoute": "/admin/overview",
          "routes": [
            {
              "path": "/admin",
              "page": "admin/overview",
              "requiresAuth": true,
              "requiresRole": "admin"
            },
            {
              "path": "/admin/users",
              "page": "admin/users",
              "requiresAuth": true,
              "requiresRole": "admin"
            },
            {
              "path": "/admin/users/:id",
              "page": "admin/user-detail",
              "requiresAuth": true,
              "requiresRole": "admin"
            },
            {
              "path": "/admin/system",
              "page": "admin/system",
              "requiresAuth": true,
              "requiresRole": "admin"
            },
            {
              "path": "/admin/audit-logs",
              "page": "admin/audit-logs",
              "requiresAuth": true,
              "requiresRole": "admin"
            }
          ],
          "navigation": {
            "categories": [
              {
                "title": "Administration",
                "items": [
                  {
                    "title": "Overview",
                    "path": "/admin",
                    "page": "admin/overview",
                    "icon": "DashboardIcon"
                  },
                  {
                    "title": "User Management",
                    "path": "/admin/users",
                    "page": "admin/users",
                    "icon": "UsersIcon"
                  },
                  {
                    "title": "System Settings",
                    "path": "/admin/system",
                    "page": "admin/system",
                    "icon": "ServerIcon"
                  },
                  {
                    "title": "Audit Logs",
                    "path": "/admin/audit-logs",
                    "page": "admin/audit-logs",
                    "icon": "DocumentTextIcon"
                  }
                ]
              }
            ]
          }
        }
      ]
    }
  },
  // Example 2: Simple single-app configuration
  {
    "description": "Shows minimal app configuration with essential routes",
    "config": {
      "apps": [
        {
          "id": "simple",
          "name": "Simple App",
          "description": "Minimal configuration example",
          "defaultRoute": "/home",
          "routes": [
            {
              "path": "/",
              "page": "home",
              "public": true
            },
            {
              "path": "/login",
              "page": "login",
              "public": true
            },
            {
              "path": "/home",
              "page": "home",
              "requiresAuth": true
            },
            {
              "path": "/items",
              "page": "items",
              "requiresAuth": true
            },
            {
              "path": "/items/:id",
              "page": "item-detail",
              "requiresAuth": true
            }
          ],
          "navigation": {
            "categories": [
              {
                "items": [
                  {
                    "title": "Home",
                    "path": "/home",
                    "page": "home",
                    "icon": "HomeIcon"
                  },
                  {
                    "title": "Items",
                    "path": "/items",
                    "page": "items",
                    "icon": "ListIcon"
                  }
                ]
              }
            ]
          }
        }
      ]
    }
  }
];

// Export all action types for validation
export const VALID_ACTION_TYPES = [
  "validate",
  "transform",
  "db.query",
  "db.insert",
  "db.update",
  "db.delete",
  "db.bulkInsert",
  "calc",
  "condition",
  "loop",
  "http.call",
  "transaction",
  "parallel",
  "response.map",
  "transform.array",
  "try"
] as const;

// Export special functions for reference
export const SPECIAL_FUNCTIONS = {
  "uuid()": "Generates a new UUID",
  "now()": "Returns current timestamp",
  "sum(array, field)": "Sums a field across an array of objects"
} as const;

// Export template syntax patterns
export const TEMPLATE_PATTERNS = {
  "{{body.fieldName}}": "Access request body field",
  "{{params.id}}": "Access URL parameter",
  "{{query.filter}}": "Access query string parameter",
  "{{user.id}}": "Access authenticated user field",
  "{{variable}}": "Access variable set by previous action",
  "{{item.property}}": "Access nested property in loop/array"
} as const;
