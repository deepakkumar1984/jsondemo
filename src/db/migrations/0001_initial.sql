-- Migration: Initial schema
-- Created: 2025-01-20

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee',
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  head_id TEXT REFERENCES users(id),
  parent_id TEXT REFERENCES departments(id),
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Positions table
CREATE TABLE IF NOT EXISTS positions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  department_id TEXT REFERENCES departments(id),
  level INTEGER,
  min_salary REAL,
  max_salary REAL,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  employee_code TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  date_of_birth TEXT,
  gender TEXT,
  marital_status TEXT,
  nationality TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  postal_code TEXT,
  department_id TEXT REFERENCES departments(id),
  position_id TEXT REFERENCES positions(id),
  manager_id TEXT REFERENCES employees(id),
  date_of_joining TEXT NOT NULL,
  employment_type TEXT NOT NULL DEFAULT 'full_time',
  status TEXT DEFAULT 'active',
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relation TEXT,
  bank_name TEXT,
  bank_account TEXT,
  bank_ifsc TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Employee documents table
CREATE TABLE IF NOT EXISTS employee_documents (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES employees(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_at TEXT DEFAULT (datetime('now'))
);

-- Salary structures table
CREATE TABLE IF NOT EXISTS salary_structures (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Pay components table
CREATE TABLE IF NOT EXISTS pay_components (
  id TEXT PRIMARY KEY,
  structure_id TEXT REFERENCES salary_structures(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  calc_type TEXT NOT NULL,
  amount REAL DEFAULT 0,
  percentage_of TEXT,
  taxable INTEGER DEFAULT 1,
  active INTEGER DEFAULT 1
);

-- Employee salaries table
CREATE TABLE IF NOT EXISTS employee_salaries (
  id TEXT PRIMARY KEY,
  employee_id TEXT REFERENCES employees(id),
  structure_id TEXT REFERENCES salary_structures(id),
  base_salary REAL NOT NULL,
  effective_from TEXT NOT NULL,
  active INTEGER DEFAULT 1
);

-- Payroll runs table
CREATE TABLE IF NOT EXISTS payroll_runs (
  id TEXT PRIMARY KEY,
  period_month INTEGER NOT NULL,
  period_year INTEGER NOT NULL,
  status TEXT DEFAULT 'draft',
  run_date TEXT,
  approved_by TEXT REFERENCES users(id),
  total_amount REAL DEFAULT 0
);

-- Payslips table
CREATE TABLE IF NOT EXISTS payslips (
  id TEXT PRIMARY KEY,
  run_id TEXT REFERENCES payroll_runs(id),
  employee_id TEXT REFERENCES employees(id),
  gross REAL DEFAULT 0,
  deductions REAL DEFAULT 0,
  net REAL DEFAULT 0,
  status TEXT DEFAULT 'draft',
  generated_at TEXT DEFAULT (datetime('now'))
);

-- Job postings table
CREATE TABLE IF NOT EXISTS job_postings (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  department_id TEXT REFERENCES departments(id),
  position_id TEXT REFERENCES positions(id),
  description TEXT,
  requirements TEXT,
  status TEXT DEFAULT 'draft',
  posted_date TEXT,
  closing_date TEXT
);

-- Applicants table
CREATE TABLE IF NOT EXISTS applicants (
  id TEXT PRIMARY KEY,
  job_id TEXT REFERENCES job_postings(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  resume_url TEXT,
  status TEXT DEFAULT 'applied',
  applied_date TEXT DEFAULT (datetime('now'))
);

-- Performance reviews table
CREATE TABLE IF NOT EXISTS performance_reviews (
  id TEXT PRIMARY KEY,
  employee_id TEXT REFERENCES employees(id),
  reviewer_id TEXT REFERENCES employees(id),
  period TEXT NOT NULL,
  rating INTEGER,
  comments TEXT,
  status TEXT DEFAULT 'draft',
  review_date TEXT
);

-- Leave types table
CREATE TABLE IF NOT EXISTS leave_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  days_per_year INTEGER NOT NULL,
  carry_forward INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1
);

-- Leave balances table
CREATE TABLE IF NOT EXISTS leave_balances (
  id TEXT PRIMARY KEY,
  employee_id TEXT REFERENCES employees(id),
  leave_type_id TEXT REFERENCES leave_types(id),
  year INTEGER NOT NULL,
  total INTEGER NOT NULL,
  used INTEGER DEFAULT 0,
  balance INTEGER NOT NULL
);

-- Leave requests table
CREATE TABLE IF NOT EXISTS leave_requests (
  id TEXT PRIMARY KEY,
  employee_id TEXT REFERENCES employees(id),
  leave_type_id TEXT REFERENCES leave_types(id),
  from_date TEXT NOT NULL,
  to_date TEXT NOT NULL,
  days INTEGER NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  approved_by TEXT REFERENCES users(id)
);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  employee_id TEXT REFERENCES employees(id),
  date TEXT NOT NULL,
  check_in TEXT,
  check_out TEXT,
  status TEXT DEFAULT 'present',
  hours_worked REAL DEFAULT 0
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_position ON employees(position_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_code ON employees(employee_code);
CREATE INDEX IF NOT EXISTS idx_employee_documents_employee ON employee_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_positions_department ON positions(department_id);
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_payslips_run ON payslips(run_id);
CREATE INDEX IF NOT EXISTS idx_payslips_employee ON payslips(employee_id);
