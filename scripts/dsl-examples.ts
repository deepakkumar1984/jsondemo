/**
 * Comprehensive DSL Examples for AI Config Generation
 *
 * These examples demonstrate ALL properties, action types, and patterns
 * in compact DSL format (70-75% smaller than JSON).
 *
 * Used by ai-config-generator.ts to teach AI the DSL syntax.
 */

// ============================================================================
// SCHEMA DSL EXAMPLES
// ============================================================================

export const DSL_SCHEMA_EXAMPLES = [
  // Example 1: Complex schema with all features
  {
    description: "Shows ALL column types, constraints, foreign keys, self-references, composite indexes",
    dsl: `
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
`.trim()
  },

  // Example 2: Simple schema with minimal constraints
  {
    description: "Shows serial type for autoincrement, minimal constraints, and simple structure",
    dsl: `
table categories "Product categories"
  id serial pk
  name text! unique
  slug text! unique
  parent_id integer -> categories.id cascade desc="Self-referencing for category hierarchy"
  display_order integer! default=0
  is_visible boolean! default=true

index idx_categories_slug unique slug
index idx_categories_parent parent_id
`.trim()
  }
];

// ============================================================================
// API DSL EXAMPLES
// ============================================================================

export const DSL_API_EXAMPLES = [
  // Example 1: MINIMAL CRUD - Use this as primary template
  {
    description: "MINIMAL example showing basic CRUD structure - USE THIS AS YOUR PRIMARY TEMPLATE",
    dsl: `
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
`.trim()
  },

  // Example 2: Complex API with ALL action types
  {
    description: "Shows ALL action types: validate, transform, db operations, conditions, loops, http calls, transactions, error handling",
    dsl: `
api TimeEntries "/api/time-entries" auth
desc "Comprehensive time tracking with all action patterns"

op createTimeEntry POST "/"
desc "Create time entry with validation, transformation, and transaction"
  validate body.projectId required message="Project ID is required"
  validate body.hours required min=0.1 max=24
  validate body.date required
  validate body.description max=500

  query projects where id={{body.projectId}} limit 1 -> project
  if project=null
    respond 404 error="Project not found"
  endif

  set body.id=uuid() body.userId={{user.id}} body.createdAt=now() body.status=pending
  calc calculatedAmount=body.hours*project.hourlyRate

  tx begin
    insert time_entries map(id={{body.id}}, project_id={{body.projectId}}, user_id={{body.userId}}, description={{body.description}}, hours={{body.hours}}, date={{body.date}}, amount={{calculatedAmount}}, status={{body.status}}, created_at={{body.createdAt}})

    if body.tags exists
      map body.tags as tag -> tagRecords(time_entry_id={{body.id}}, tag={{tag}}, created_at={{body.createdAt}})
      bulkinsert time_entry_tags tagRecords
    endif

    update projects where id={{body.projectId}} set total_hours+=body.hours updated_at=now()
  tx end

  respond 201 id={{body.id}} message="Time entry created successfully" calculatedRate={{calculatedAmount}}

op listTimeEntries GET "/"
desc "Query with filters, pagination, sorting"
  set query.limit=query.limit||50 query.offset=query.offset||0

  query time_entries where user_id={{user.id}} project_id={{query.projectId}} status={{query.status}} date>={{query.startDate}} date<={{query.endDate}} order date desc,created_at desc limit {{query.limit}} offset {{query.offset}} -> entries
  query time_entries select count(*) as total where user_id={{user.id}} project_id={{query.projectId}} status={{query.status}} -> countResult

  calc totalHours=sum(entries.hours)

  respond 200 items={{entries}} total={{countResult.total}} totalHours={{totalHours}} limit={{query.limit}} offset={{query.offset}}

op updateTimeEntry PUT "/:id"
desc "Update with validation and error handling"
  try begin
    query time_entries where id={{params.id}} user_id={{user.id}} -> existingEntry
    if existingEntry=null
      respond 404 error="Time entry not found"
    endif

    validate body.hours min=0.1 max=24
    set body.updatedAt=now()

    update time_entries where id={{params.id}} set description={{body.description}} hours={{body.hours}} status={{body.status}} updated_at={{body.updatedAt}}
    respond 200 id={{params.id}} message="Time entry updated successfully"
  catch
    respond 500 error="Failed to update time entry" details={{error.message}}
  try end

op deleteTimeEntry DELETE "/:id"
  query time_entries where id={{params.id}} user_id={{user.id}} -> entry
  if entry=null
    respond 404 error="Time entry not found"
  endif
  delete time_entries where id={{params.id}}
  respond 200 message="Time entry deleted successfully"

op bulkApprove POST "/bulk-approve"
desc "Loop, parallel actions, and http.call"
  validate body.entryIds required min=1

  query time_entries where id in {{body.entryIds}} status=pending -> entriesToApprove

  loop entriesToApprove as entry
    update time_entries where id=entry.id set status=approved approved_by={{user.id}} approved_at=now()
  endloop

  parallel begin
    http POST "https://api.example.com/notifications/send" header Authorization="Bearer {{env.NOTIFICATION_API_KEY}}" body type=bulk_approval count={{len(entriesToApprove)}} approvedBy={{user.id}} -> notificationResult
    insert approval_logs map(id=uuid(), approver_id={{user.id}}, entry_count={{len(entriesToApprove)}}, created_at=now())
  parallel end

  respond 200 message="{{len(entriesToApprove)}} time entries approved" approvedIds={{body.entryIds}}
`.trim()
  }
];

// ============================================================================
// PAGE DSL EXAMPLES
// ============================================================================

export const DSL_PAGE_EXAMPLES = [
  // Example 1: Dashboard with stats, tables, and actions
  {
    description: "Shows PageHeader, Grid, StatCard, DataTable, Card, Stack, Button with data binding and actions",
    dsl: `
page dashboard
  datasource projects "/projects"
  datasource stats "/stats"

  PageHeader title="Dashboard" subtitle="Project overview"

  Grid columns=3 gap="md"
    StatCard title="Total Projects" value={{stats.total}} icon="Briefcase"
    StatCard title="Active" value={{stats.active}} icon="CheckCircle" color="green"
    StatCard title="Completed" value={{stats.completed}} icon="Archive" color="blue"

  Card title="Recent Projects"
    DataTable data={{projects}} searchable=true filterable=true paginated=true pageSize=10
      col name "Name"
      col status "Status" badge
      col budget "Budget" format=currency
      col created_at "Created" format=date
      col actions "Actions" action=navigate:/projects/{{row.id}}

  Divider spacing=6

  Card title="Quick Actions"
    Stack direction="horizontal" spacing=4
      Button label="New Project" action=navigate:/projects/new variant="primary" icon="Plus"
      Button label="Reports" action=navigate:/reports variant="secondary" icon="BarChart"
`.trim()
  },

  // Example 2: Detail page with tabs, forms, and nested components
  {
    description: "Shows Tabs, TabPanel, Form, TextField, TextArea, SelectField, DateField, DetailSection with conditional rendering and validation",
    dsl: `
page project-detail
  datasource project "/projects/{{params.id}}"
  datasource timeEntries "/time-entries?projectId={{params.id}}"

  PageHeader title={{project.name}} subtitle={{project.description}} backButton=true backPath="/projects"
    Stack direction="horizontal" spacing=2
      Badge label={{project.status}} variant={{project.status=='active'?'success':'default'}}
      Button label="Edit" action=navigate:/projects/{{project.id}}/edit variant="outline" icon="Edit"

  Tabs defaultTab="overview"
    TabPanel id="overview" label="Overview"
      Grid cols=2 gap=6
        Card title="Project Details"
          DetailSection title="Basic Information"
            DetailRow label="Client" value={{project.client_name}}
            DetailRow label="Budget" value={{project.budget}} format=currency
            DetailRow label="Hourly Rate" value={{project.hourly_rate}} format=currency suffix="/hour"
            DetailRow label="Created" value={{project.created_at}} format=datetime

          Divider spacing=4

          DetailSection title="Progress"
            DetailRow label="Total Hours" value={{project.total_hours}} suffix=" hrs"
            DetailRow label="Completion" value={{project.completion_percent}} suffix="%" showProgressBar=true

        Card title="Quick Stats"
          Grid cols=2 gap=4
            StatCard title="Time Entries" value={{timeEntries.total}} icon="Clock"
            StatCard title="This Week" value={{timeEntries.thisWeek}} icon="Calendar"

    TabPanel id="time" label="Time Entries"
      Card title="Time Tracking"
        Button label="Add Time Entry" action=navigate:/projects/{{project.id}}/time-entries/new variant="primary" icon="Plus"

        Divider spacing=4

        DataTable data={{timeEntries.items}} searchable=true filterable=true
          col date "Date" format=date
          col description "Description"
          col hours "Hours" suffix=" hrs"
          col amount "Amount" format=currency
          col status "Status" badge
          col actions "Actions" action=navigate:/time-entries/{{row.id}}

    TabPanel id="edit" label="Edit Project"
      Card title="Edit Project Details"
        Form action=submit_form:updateProject method="PUT" submitLabel="Save Changes"
          TextField name="name" label="Project Name" valuePath="project.name" required=true
          TextArea name="description" label="Description" valuePath="project.description" rows=4
          TextField name="client_name" label="Client Name" valuePath="project.client_name" required=true
          TextField name="budget" label="Budget" type="number" valuePath="project.budget" min=0 prefix="$"
          TextField name="hourly_rate" label="Hourly Rate" type="number" valuePath="project.hourly_rate" min=0 max=1000 prefix="$" suffix="/hour"
          SelectField name="status" label="Status" valuePath="project.status" required=true
            option value="active" label="Active"
            option value="completed" label="Completed"
            option value="on_hold" label="On Hold"
          DateField name="start_date" label="Start Date" valuePath="project.start_date"
          DateField name="end_date" label="End Date" valuePath="project.end_date"
          TextField name="tags" label="Tags" valuePath="project.tags" helpText="Enter tags separated by commas" placeholder="web, mobile, design"
`.trim()
  }
];

// ============================================================================
// APPS DSL EXAMPLES
// ============================================================================

export const DSL_APPS_EXAMPLES = [
  // Example 1: Simple app with basic navigation
  {
    description: "Shows basic app structure with navigation categories and routes",
    dsl: `
app project-tracker
  name "Project Tracker"
  subtitle "Time & Budget Management"
  prefix "/"

  nav Overview
    item "Dashboard" "/" dashboard icon=LayoutDashboard

  nav Projects
    item "All Projects" "/projects" projects icon=Briefcase
    item "New Project" "/projects/new" new-project icon=Plus

  route "/" dashboard
  route "/projects" projects
  route "/projects/new" new-project
  route "/projects/:id" project-detail
  route "/projects/:id/edit" edit-project
  route "/projects/:id/time-entries/new" new-time-entry

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
`.trim()
  },

  // Example 2: Multi-app with auth and roles
  {
    description: "Shows multiple apps, auth requirements, role-based access, badges",
    dsl: `
app admin-panel
  name "Admin Panel"
  subtitle "System Administration"
  prefix "/admin"
  auth required

  nav Dashboard
    item "Overview" "/admin" admin-dashboard icon=LayoutDashboard

  nav Users
    item "All Users" "/admin/users" admin-users icon=Users role=admin
    item "Roles" "/admin/roles" admin-roles icon=Shield role=admin

  nav Settings
    item "System" "/admin/settings" admin-settings icon=Settings role=admin
    item "Integrations" "/admin/integrations" admin-integrations icon=Link role=admin badge="New" badgeVariant="info"

  route "/admin" admin-dashboard auth role=admin
  route "/admin/users" admin-users auth role=admin
  route "/admin/users/:id" admin-user-detail auth role=admin
  route "/admin/roles" admin-roles auth role=admin
  route "/admin/settings" admin-settings auth role=admin
  route "/admin/integrations" admin-integrations auth role=admin

  defaults
    table
      pageSize=50
      pageSizes=25,50,100,200
      showRowNumbers=true
      stickyHeader=true
      striped=false
    form
      validateOnBlur=true
      showRequiredIndicator=true
      resetOnSuccess=false
    notification
      position=bottom-right
      duration=4000
    dateTime
      dateFormat="yyyy-MM-dd"
      timeFormat="HH:mm:ss"
      dateTimeFormat="yyyy-MM-dd HH:mm:ss"
`.trim()
  }
];

// ============================================================================
// VALID TYPES REFERENCE (for AI guidance)
// ============================================================================

export const DSL_VALID_ACTION_TYPES = [
  "validate", "set", "calc",
  "query", "insert", "update", "delete", "bulkinsert",
  "if/else/endif", "loop/endloop",
  "tx begin/end", "parallel begin/end", "try begin/catch/try end",
  "http", "respond"
] as const;

export const DSL_VALID_COMPONENT_TYPES = [
  "PageHeader", "Card", "Grid", "Stack", "Tabs", "TabPanel", "Divider",
  "DataTable", "StatCard", "Badge", "DetailSection", "DetailRow",
  "Form", "TextField", "TextArea", "SelectField", "DateField", "Button",
  "Alert"
] as const;

export const DSL_SPECIAL_FUNCTIONS = {
  "uuid()": "Generates a new UUID",
  "now()": "Returns current timestamp",
  "sum(array, field)": "Sums a field across an array of objects",
  "len(array)": "Returns array length"
} as const;

export const DSL_TEMPLATE_PATTERNS = {
  "{{body.field}}": "Request body field",
  "{{params.id}}": "URL parameter",
  "{{query.filter}}": "Query string parameter",
  "{{user.id}}": "Authenticated user property",
  "{{varName}}": "Runtime variable from previous action",
  "{{row.id}}": "Table row data in DataTable",
  "{{env.VAR_NAME}}": "Environment variable"
} as const;
