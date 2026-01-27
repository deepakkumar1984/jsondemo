import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Helper: default timestamp columns
// ---------------------------------------------------------------------------
const timestamps = {
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
};

// ===========================================================================
//  CORE TABLES
// ===========================================================================

// ---- Users ----------------------------------------------------------------
export const users = sqliteTable('users', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: text('role', { enum: ['admin', 'hr', 'manager', 'employee'] }).notNull(),
  active: integer('active').default(1),
  ...timestamps,
});

// ---- Departments ----------------------------------------------------------
export const departments = sqliteTable('departments', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  code: text('code').unique().notNull(),
  description: text('description'),
  headId: text('head_id').references(() => users.id),
  parentId: text('parent_id').references((): any => departments.id),
  active: integer('active').default(1),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// ---- Positions ------------------------------------------------------------
export const positions = sqliteTable('positions', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  code: text('code').unique().notNull(),
  departmentId: text('department_id').references(() => departments.id),
  level: integer('level'),
  minSalary: real('min_salary'),
  maxSalary: real('max_salary'),
  active: integer('active').default(1),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// ---- Employees ------------------------------------------------------------
export const employees = sqliteTable('employees', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id),
  employeeCode: text('employee_code').unique().notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  dateOfBirth: text('date_of_birth'),
  gender: text('gender'),
  maritalStatus: text('marital_status'),
  nationality: text('nationality'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  country: text('country'),
  postalCode: text('postal_code'),
  departmentId: text('department_id').references(() => departments.id),
  positionId: text('position_id').references(() => positions.id),
  managerId: text('manager_id').references((): any => employees.id),
  dateOfJoining: text('date_of_joining').notNull(),
  employmentType: text('employment_type', {
    enum: ['full_time', 'part_time', 'contract', 'intern'],
  }).notNull(),
  status: text('status', {
    enum: ['active', 'on_leave', 'terminated', 'resigned'],
  }).default('active'),
  emergencyContactName: text('emergency_contact_name'),
  emergencyContactPhone: text('emergency_contact_phone'),
  emergencyContactRelation: text('emergency_contact_relation'),
  bankName: text('bank_name'),
  bankAccount: text('bank_account'),
  bankIfsc: text('bank_ifsc'),
  ...timestamps,
});

// ---- Employee Documents ---------------------------------------------------
export const employeeDocuments = sqliteTable('employee_documents', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  employeeId: text('employee_id')
    .references(() => employees.id)
    .notNull(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  fileUrl: text('file_url').notNull(),
  uploadedAt: text('uploaded_at').default(sql`CURRENT_TIMESTAMP`),
});

// ===========================================================================
//  PAYROLL TABLES (Scaffolded)
// ===========================================================================

// ---- Salary Structures ----------------------------------------------------
export const salaryStructures = sqliteTable('salary_structures', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  description: text('description'),
  active: integer('active').default(1),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// ---- Pay Components -------------------------------------------------------
export const payComponents = sqliteTable('pay_components', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  structureId: text('structure_id')
    .references(() => salaryStructures.id)
    .notNull(),
  name: text('name').notNull(),
  type: text('type', { enum: ['earning', 'deduction'] }).notNull(),
  calcType: text('calc_type', { enum: ['fixed', 'percentage'] }).notNull(),
  amount: real('amount'),
  percentageOf: text('percentage_of'),
  taxable: integer('taxable').default(1),
  active: integer('active').default(1),
});

// ---- Employee Salaries ----------------------------------------------------
export const employeeSalaries = sqliteTable('employee_salaries', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  employeeId: text('employee_id')
    .references(() => employees.id)
    .notNull(),
  structureId: text('structure_id')
    .references(() => salaryStructures.id)
    .notNull(),
  baseSalary: real('base_salary').notNull(),
  effectiveFrom: text('effective_from').notNull(),
  active: integer('active').default(1),
});

// ---- Payroll Runs ---------------------------------------------------------
export const payrollRuns = sqliteTable('payroll_runs', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  periodMonth: integer('period_month').notNull(),
  periodYear: integer('period_year').notNull(),
  status: text('status', {
    enum: ['draft', 'processing', 'completed', 'cancelled'],
  }).default('draft'),
  runDate: text('run_date'),
  approvedBy: text('approved_by').references(() => users.id),
  totalAmount: real('total_amount'),
});

// ---- Payslips -------------------------------------------------------------
export const payslips = sqliteTable('payslips', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  runId: text('run_id')
    .references(() => payrollRuns.id)
    .notNull(),
  employeeId: text('employee_id')
    .references(() => employees.id)
    .notNull(),
  gross: real('gross').notNull(),
  deductions: real('deductions').notNull(),
  net: real('net').notNull(),
  status: text('status'),
  generatedAt: text('generated_at').default(sql`CURRENT_TIMESTAMP`),
});

// ===========================================================================
//  TALENT TABLES (Scaffolded)
// ===========================================================================

// ---- Job Postings ---------------------------------------------------------
export const jobPostings = sqliteTable('job_postings', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  departmentId: text('department_id').references(() => departments.id),
  positionId: text('position_id').references(() => positions.id),
  description: text('description'),
  requirements: text('requirements'),
  status: text('status', { enum: ['draft', 'open', 'closed'] }).default('draft'),
  postedDate: text('posted_date'),
  closingDate: text('closing_date'),
});

// ---- Applicants -----------------------------------------------------------
export const applicants = sqliteTable('applicants', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  jobId: text('job_id')
    .references(() => jobPostings.id)
    .notNull(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  resumeUrl: text('resume_url'),
  status: text('status', {
    enum: ['applied', 'screening', 'interview', 'offered', 'rejected', 'hired'],
  }).default('applied'),
  appliedDate: text('applied_date').default(sql`CURRENT_TIMESTAMP`),
});

// ---- Performance Reviews --------------------------------------------------
export const performanceReviews = sqliteTable('performance_reviews', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  employeeId: text('employee_id')
    .references(() => employees.id)
    .notNull(),
  reviewerId: text('reviewer_id')
    .references(() => employees.id)
    .notNull(),
  period: text('period').notNull(),
  rating: integer('rating'),
  comments: text('comments'),
  status: text('status', {
    enum: ['draft', 'submitted', 'acknowledged'],
  }).default('draft'),
  reviewDate: text('review_date'),
});

// ===========================================================================
//  WORKFORCE TABLES (Scaffolded)
// ===========================================================================

// ---- Leave Types ----------------------------------------------------------
export const leaveTypes = sqliteTable('leave_types', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  daysPerYear: integer('days_per_year').notNull(),
  carryForward: integer('carry_forward').default(0),
  active: integer('active').default(1),
});

// ---- Leave Balances -------------------------------------------------------
export const leaveBalances = sqliteTable('leave_balances', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  employeeId: text('employee_id')
    .references(() => employees.id)
    .notNull(),
  leaveTypeId: text('leave_type_id')
    .references(() => leaveTypes.id)
    .notNull(),
  year: integer('year').notNull(),
  total: integer('total').notNull(),
  used: integer('used').default(0),
  balance: integer('balance').notNull(),
});

// ---- Leave Requests -------------------------------------------------------
export const leaveRequests = sqliteTable('leave_requests', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  employeeId: text('employee_id')
    .references(() => employees.id)
    .notNull(),
  leaveTypeId: text('leave_type_id')
    .references(() => leaveTypes.id)
    .notNull(),
  fromDate: text('from_date').notNull(),
  toDate: text('to_date').notNull(),
  days: integer('days').notNull(),
  reason: text('reason'),
  status: text('status', {
    enum: ['pending', 'approved', 'rejected'],
  }).default('pending'),
  approvedBy: text('approved_by').references(() => users.id),
});

// ---- Attendance -----------------------------------------------------------
export const attendance = sqliteTable('attendance', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  employeeId: text('employee_id')
    .references(() => employees.id)
    .notNull(),
  date: text('date').notNull(),
  checkIn: text('check_in'),
  checkOut: text('check_out'),
  status: text('status', {
    enum: ['present', 'absent', 'half_day', 'holiday'],
  }).default('present'),
  hoursWorked: real('hours_worked'),
});

// ===========================================================================
//  TYPE INFERENCES
// ===========================================================================

// ---- Users ----------------------------------------------------------------
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// ---- Departments ----------------------------------------------------------
export type Department = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;

// ---- Positions ------------------------------------------------------------
export type Position = typeof positions.$inferSelect;
export type NewPosition = typeof positions.$inferInsert;

// ---- Employees ------------------------------------------------------------
export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;

// ---- Employee Documents ---------------------------------------------------
export type EmployeeDocument = typeof employeeDocuments.$inferSelect;
export type NewEmployeeDocument = typeof employeeDocuments.$inferInsert;
