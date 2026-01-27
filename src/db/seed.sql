-- Seed data for HRM application
-- Password hash is SHA-256 of 'admin123'
-- SHA-256('admin123') = 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9

-- Users
INSERT INTO users (id, email, password_hash, name, role, active) VALUES
  ('usr-001', 'admin@hrm.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'System Admin', 'admin', 1),
  ('usr-002', 'hr@hrm.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'HR Manager', 'hr', 1),
  ('usr-003', 'manager@hrm.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Team Manager', 'manager', 1),
  ('usr-004', 'john@hrm.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'John Smith', 'employee', 1),
  ('usr-005', 'jane@hrm.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Jane Doe', 'employee', 1),
  ('usr-006', 'bob@hrm.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Bob Wilson', 'employee', 1),
  ('usr-007', 'alice@hrm.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Alice Brown', 'employee', 1),
  ('usr-008', 'charlie@hrm.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Charlie Davis', 'manager', 1);

-- Departments
INSERT INTO departments (id, name, code, description, head_id, parent_id, active) VALUES
  ('dept-001', 'Engineering', 'ENG', 'Software Engineering Department', 'usr-003', NULL, 1),
  ('dept-002', 'Human Resources', 'HR', 'Human Resources Department', 'usr-002', NULL, 1),
  ('dept-003', 'Marketing', 'MKT', 'Marketing and Communications', 'usr-008', NULL, 1),
  ('dept-004', 'Finance', 'FIN', 'Finance and Accounting', NULL, NULL, 1),
  ('dept-005', 'Frontend Team', 'ENG-FE', 'Frontend Engineering', NULL, 'dept-001', 1),
  ('dept-006', 'Backend Team', 'ENG-BE', 'Backend Engineering', NULL, 'dept-001', 1),
  ('dept-007', 'Sales', 'SLS', 'Sales Department', NULL, NULL, 1);

-- Positions
INSERT INTO positions (id, title, code, department_id, level, min_salary, max_salary, active) VALUES
  ('pos-001', 'Software Engineer', 'SE', 'dept-001', 2, 60000, 90000, 1),
  ('pos-002', 'Senior Software Engineer', 'SSE', 'dept-001', 3, 90000, 130000, 1),
  ('pos-003', 'Engineering Manager', 'EM', 'dept-001', 4, 120000, 160000, 1),
  ('pos-004', 'HR Specialist', 'HRS', 'dept-002', 2, 50000, 75000, 1),
  ('pos-005', 'HR Manager', 'HRM', 'dept-002', 4, 80000, 120000, 1),
  ('pos-006', 'Marketing Specialist', 'MKS', 'dept-003', 2, 50000, 80000, 1),
  ('pos-007', 'Marketing Manager', 'MKM', 'dept-003', 4, 85000, 125000, 1),
  ('pos-008', 'Financial Analyst', 'FA', 'dept-004', 2, 55000, 85000, 1),
  ('pos-009', 'Frontend Developer', 'FED', 'dept-005', 2, 65000, 95000, 1),
  ('pos-010', 'Backend Developer', 'BED', 'dept-006', 2, 65000, 95000, 1),
  ('pos-011', 'Sales Representative', 'SR', 'dept-007', 2, 45000, 70000, 1),
  ('pos-012', 'Junior Developer', 'JD', 'dept-001', 1, 45000, 60000, 1);

-- Employees
INSERT INTO employees (id, user_id, employee_code, first_name, last_name, email, phone, date_of_birth, gender, marital_status, nationality, address, city, state, country, postal_code, department_id, position_id, manager_id, date_of_joining, employment_type, status, emergency_contact_name, emergency_contact_phone, emergency_contact_relation, bank_name, bank_account, bank_ifsc) VALUES
  ('emp-001', 'usr-001', 'EMP-0001', 'System', 'Admin', 'admin@hrm.com', '+1-555-0101', '1985-03-15', 'Male', 'Married', 'American', '100 Admin Street', 'San Francisco', 'CA', 'USA', '94102', 'dept-001', 'pos-003', NULL, '2020-01-01', 'full_time', 'active', 'Sarah Admin', '+1-555-0102', 'Spouse', 'Chase Bank', '****1234', 'CHASUS33'),
  ('emp-002', 'usr-002', 'EMP-0002', 'HR', 'Manager', 'hr@hrm.com', '+1-555-0201', '1988-07-22', 'Female', 'Single', 'American', '200 HR Boulevard', 'San Francisco', 'CA', 'USA', '94103', 'dept-002', 'pos-005', 'emp-001', '2020-02-15', 'full_time', 'active', 'Mike Manager', '+1-555-0202', 'Brother', 'Bank of America', '****5678', 'BOFAUS3N'),
  ('emp-003', 'usr-003', 'EMP-0003', 'Team', 'Manager', 'manager@hrm.com', '+1-555-0301', '1987-11-10', 'Male', 'Married', 'American', '300 Manager Lane', 'San Francisco', 'CA', 'USA', '94104', 'dept-001', 'pos-003', 'emp-001', '2020-03-01', 'full_time', 'active', 'Lisa Manager', '+1-555-0302', 'Spouse', 'Wells Fargo', '****9012', 'WFBIUS6S'),
  ('emp-004', 'usr-004', 'EMP-0004', 'John', 'Smith', 'john@hrm.com', '+1-555-0401', '1992-05-20', 'Male', 'Single', 'American', '400 Developer Drive', 'San Francisco', 'CA', 'USA', '94105', 'dept-005', 'pos-009', 'emp-003', '2021-06-01', 'full_time', 'active', 'Mary Smith', '+1-555-0402', 'Mother', 'Chase Bank', '****3456', 'CHASUS33'),
  ('emp-005', 'usr-005', 'EMP-0005', 'Jane', 'Doe', 'jane@hrm.com', '+1-555-0501', '1993-09-14', 'Female', 'Married', 'American', '500 Engineer Way', 'San Francisco', 'CA', 'USA', '94106', 'dept-006', 'pos-010', 'emp-003', '2021-08-15', 'full_time', 'active', 'Tom Doe', '+1-555-0502', 'Spouse', 'Bank of America', '****7890', 'BOFAUS3N'),
  ('emp-006', 'usr-006', 'EMP-0006', 'Bob', 'Wilson', 'bob@hrm.com', '+1-555-0601', '1990-12-03', 'Male', 'Single', 'Canadian', '600 Marketing Road', 'San Francisco', 'CA', 'USA', '94107', 'dept-003', 'pos-006', 'emp-008', '2022-01-10', 'full_time', 'active', 'Janet Wilson', '+1-555-0602', 'Sister', 'Wells Fargo', '****2345', 'WFBIUS6S'),
  ('emp-007', 'usr-007', 'EMP-0007', 'Alice', 'Brown', 'alice@hrm.com', '+1-555-0701', '1995-02-28', 'Female', 'Single', 'British', '700 Finance Street', 'San Francisco', 'CA', 'USA', '94108', 'dept-004', 'pos-008', 'emp-001', '2022-04-01', 'full_time', 'active', 'Robert Brown', '+1-555-0702', 'Father', 'Chase Bank', '****6789', 'CHASUS33'),
  ('emp-008', 'usr-008', 'EMP-0008', 'Charlie', 'Davis', 'charlie@hrm.com', '+1-555-0801', '1986-08-17', 'Male', 'Married', 'American', '800 Sales Avenue', 'San Francisco', 'CA', 'USA', '94109', 'dept-003', 'pos-007', 'emp-001', '2020-05-01', 'full_time', 'active', 'Diana Davis', '+1-555-0802', 'Spouse', 'Bank of America', '****0123', 'BOFAUS3N'),
  ('emp-009', NULL, 'EMP-0009', 'David', 'Lee', 'david.lee@hrm.com', '+1-555-0901', '1994-04-12', 'Male', 'Single', 'Korean', '900 Tech Park', 'San Francisco', 'CA', 'USA', '94110', 'dept-001', 'pos-001', 'emp-003', '2023-01-15', 'full_time', 'active', 'Susan Lee', '+1-555-0902', 'Mother', 'Chase Bank', '****4567', 'CHASUS33'),
  ('emp-010', NULL, 'EMP-0010', 'Emily', 'Chen', 'emily.chen@hrm.com', '+1-555-1001', '1996-06-30', 'Female', 'Single', 'Chinese', '1000 Innovation Blvd', 'San Francisco', 'CA', 'USA', '94111', 'dept-005', 'pos-009', 'emp-003', '2023-03-20', 'full_time', 'active', 'Wei Chen', '+1-555-1002', 'Father', 'Wells Fargo', '****8901', 'WFBIUS6S'),
  ('emp-011', NULL, 'EMP-0011', 'Frank', 'Garcia', 'frank.garcia@hrm.com', '+1-555-1101', '1991-10-08', 'Male', 'Married', 'Mexican', '1100 Backend Lane', 'San Francisco', 'CA', 'USA', '94112', 'dept-006', 'pos-002', 'emp-003', '2022-09-01', 'full_time', 'active', 'Maria Garcia', '+1-555-1102', 'Spouse', 'Bank of America', '****2346', 'BOFAUS3N'),
  ('emp-012', NULL, 'EMP-0012', 'Grace', 'Kim', 'grace.kim@hrm.com', '+1-555-1201', '1997-01-25', 'Female', 'Single', 'Korean', '1200 Junior Way', 'San Francisco', 'CA', 'USA', '94113', 'dept-001', 'pos-012', 'emp-003', '2024-06-01', 'intern', 'active', 'Hyun Kim', '+1-555-1202', 'Mother', 'Chase Bank', '****5670', 'CHASUS33'),
  ('emp-013', NULL, 'EMP-0013', 'Henry', 'Patel', 'henry.patel@hrm.com', '+1-555-1301', '1989-07-19', 'Male', 'Married', 'Indian', '1300 Sales Drive', 'San Francisco', 'CA', 'USA', '94114', 'dept-007', 'pos-011', 'emp-001', '2023-07-10', 'full_time', 'active', 'Priya Patel', '+1-555-1302', 'Spouse', 'Wells Fargo', '****9013', 'WFBIUS6S'),
  ('emp-014', NULL, 'EMP-0014', 'Iris', 'Johnson', 'iris.johnson@hrm.com', '+1-555-1401', '1993-11-05', 'Female', 'Single', 'American', '1400 HR Circle', 'San Francisco', 'CA', 'USA', '94115', 'dept-002', 'pos-004', 'emp-002', '2023-09-15', 'full_time', 'active', 'Paul Johnson', '+1-555-1402', 'Brother', 'Bank of America', '****3457', 'BOFAUS3N'),
  ('emp-015', NULL, 'EMP-0015', 'Jack', 'Martinez', 'jack.martinez@hrm.com', '+1-555-1501', '1998-03-22', 'Male', 'Single', 'American', '1500 Contract Blvd', 'San Francisco', 'CA', 'USA', '94116', 'dept-001', 'pos-001', 'emp-003', '2024-11-01', 'contract', 'active', 'Rosa Martinez', '+1-555-1502', 'Mother', 'Chase Bank', '****7891', 'CHASUS33');

-- Employee Documents
INSERT INTO employee_documents (id, employee_id, name, type, file_url, uploaded_at) VALUES
  ('doc-001', 'emp-001', 'ID Proof', 'identity', '/documents/emp-001/id-proof.pdf', '2020-01-01T00:00:00Z'),
  ('doc-002', 'emp-001', 'Offer Letter', 'employment', '/documents/emp-001/offer-letter.pdf', '2020-01-01T00:00:00Z'),
  ('doc-003', 'emp-002', 'ID Proof', 'identity', '/documents/emp-002/id-proof.pdf', '2020-02-15T00:00:00Z'),
  ('doc-004', 'emp-004', 'Resume', 'resume', '/documents/emp-004/resume.pdf', '2021-06-01T00:00:00Z'),
  ('doc-005', 'emp-004', 'Education Certificate', 'education', '/documents/emp-004/degree.pdf', '2021-06-01T00:00:00Z'),
  ('doc-006', 'emp-005', 'ID Proof', 'identity', '/documents/emp-005/id-proof.pdf', '2021-08-15T00:00:00Z');

-- Leave Types
INSERT INTO leave_types (id, name, days_per_year, carry_forward, active) VALUES
  ('lt-001', 'Casual Leave', 12, 0, 1),
  ('lt-002', 'Sick Leave', 10, 1, 1),
  ('lt-003', 'Earned Leave', 15, 1, 1),
  ('lt-004', 'Maternity Leave', 180, 0, 1),
  ('lt-005', 'Paternity Leave', 15, 0, 1);

-- Salary Structures
INSERT INTO salary_structures (id, name, description, active) VALUES
  ('ss-001', 'Standard Full-Time', 'Standard salary structure for full-time employees', 1),
  ('ss-002', 'Contract Basis', 'Salary structure for contract employees', 1),
  ('ss-003', 'Intern Stipend', 'Stipend structure for interns', 1);

-- Pay Components
INSERT INTO pay_components (id, structure_id, name, type, calc_type, amount, percentage_of, taxable, active) VALUES
  ('pc-001', 'ss-001', 'Basic Salary', 'earning', 'percentage', 0, 'gross', 1, 1),
  ('pc-002', 'ss-001', 'HRA', 'earning', 'percentage', 0, 'basic', 1, 1),
  ('pc-003', 'ss-001', 'Transport Allowance', 'earning', 'fixed', 1600, NULL, 0, 1),
  ('pc-004', 'ss-001', 'Tax Deduction', 'deduction', 'percentage', 0, 'gross', 1, 1),
  ('pc-005', 'ss-001', 'Health Insurance', 'deduction', 'fixed', 500, NULL, 0, 1);

-- Job Postings (scaffold data)
INSERT INTO job_postings (id, title, department_id, position_id, description, requirements, status, posted_date, closing_date) VALUES
  ('job-001', 'Senior Frontend Developer', 'dept-005', 'pos-009', 'We are looking for an experienced frontend developer to join our team.', 'React, TypeScript, 5+ years experience', 'open', '2025-01-01', '2025-03-01'),
  ('job-002', 'Backend Engineer', 'dept-006', 'pos-010', 'Join our backend team to build scalable APIs.', 'Node.js, PostgreSQL, 3+ years', 'open', '2025-01-15', '2025-03-15'),
  ('job-003', 'Marketing Intern', 'dept-003', 'pos-006', 'Marketing internship position available.', 'Marketing degree, social media skills', 'closed', '2024-10-01', '2024-12-01');
