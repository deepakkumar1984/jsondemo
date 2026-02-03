/**
 * Schema Exporter
 *
 * Exports the current Drizzle schema to JSON config files.
 * This helps bootstrap a new project by converting existing TypeScript schema to config format.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import * as schema from '../../src/db/schema';
import type { TableConfig, ColumnConfig } from './generator';

/**
 * Export all tables to JSON config files.
 */
export function exportSchemaToJson(outputDir: string) {
  console.log('Exporting schema to JSON configs...');

  // Create output directory
  mkdirSync(outputDir, { recursive: true });

  // Define manual mappings for all tables
  // This is necessary because we can't easily introspect Drizzle table definitions at runtime
  const tableConfigs = generateTableConfigs();

  // Write each table to its own JSON file
  for (const config of tableConfigs) {
    const filename = join(outputDir, `${config.table}.json`);
    const content = JSON.stringify(config, null, 2);
    writeFileSync(filename, content, 'utf-8');
    console.log(`  ✓ Exported ${config.table} to ${filename}`);
  }

  console.log(`\nExported ${tableConfigs.length} tables successfully!`);
}

/**
 * Generate table configs by manually mapping the existing schema.
 * This is a bootstrap function - once configs exist, they become the source of truth.
 */
function generateTableConfigs(): TableConfig[] {
  return [
    {
      table: 'users',
      description: 'User accounts with authentication',
      columns: [
        { name: 'id', type: 'text', primaryKey: true, defaultFn: 'uuid' },
        { name: 'email', type: 'text', unique: true, notNull: true },
        { name: 'passwordHash', type: 'text', notNull: true },
        { name: 'name', type: 'text', notNull: true },
        {
          name: 'role',
          type: 'text',
          enum: ['admin', 'hr', 'manager', 'employee'],
          notNull: true,
        },
        { name: 'active', type: 'integer', default: 1 },
        { name: 'createdAt', type: 'text', default: 'CURRENT_TIMESTAMP' },
        { name: 'updatedAt', type: 'text', default: 'CURRENT_TIMESTAMP' },
      ],
    },
    {
      table: 'departments',
      description: 'Organizational departments',
      columns: [
        { name: 'id', type: 'text', primaryKey: true, defaultFn: 'uuid' },
        { name: 'name', type: 'text', notNull: true },
        { name: 'code', type: 'text', unique: true, notNull: true },
        { name: 'description', type: 'text' },
        {
          name: 'headId',
          type: 'text',
          references: { table: 'users', column: 'id' },
        },
        {
          name: 'parentId',
          type: 'text',
          references: { table: 'departments', column: 'id' },
        },
        { name: 'active', type: 'integer', default: 1 },
        { name: 'createdAt', type: 'text', default: 'CURRENT_TIMESTAMP' },
      ],
    },
    {
      table: 'positions',
      description: 'Job positions within the organization',
      columns: [
        { name: 'id', type: 'text', primaryKey: true, defaultFn: 'uuid' },
        { name: 'title', type: 'text', notNull: true },
        { name: 'code', type: 'text', unique: true, notNull: true },
        {
          name: 'departmentId',
          type: 'text',
          references: { table: 'departments', column: 'id' },
        },
        { name: 'level', type: 'integer' },
        { name: 'minSalary', type: 'real' },
        { name: 'maxSalary', type: 'real' },
        { name: 'active', type: 'integer', default: 1 },
        { name: 'createdAt', type: 'text', default: 'CURRENT_TIMESTAMP' },
      ],
    },
    {
      table: 'employees',
      description: 'Employee records with personal and employment information',
      columns: [
        { name: 'id', type: 'text', primaryKey: true, defaultFn: 'uuid' },
        {
          name: 'userId',
          type: 'text',
          references: { table: 'users', column: 'id' },
        },
        { name: 'employeeCode', type: 'text', unique: true, notNull: true },
        { name: 'firstName', type: 'text', notNull: true },
        { name: 'lastName', type: 'text', notNull: true },
        { name: 'email', type: 'text', notNull: true },
        { name: 'phone', type: 'text' },
        { name: 'dateOfBirth', type: 'text' },
        { name: 'gender', type: 'text' },
        { name: 'maritalStatus', type: 'text' },
        { name: 'nationality', type: 'text' },
        { name: 'address', type: 'text' },
        { name: 'city', type: 'text' },
        { name: 'state', type: 'text' },
        { name: 'country', type: 'text' },
        { name: 'postalCode', type: 'text' },
        {
          name: 'departmentId',
          type: 'text',
          references: { table: 'departments', column: 'id' },
        },
        {
          name: 'positionId',
          type: 'text',
          references: { table: 'positions', column: 'id' },
        },
        {
          name: 'managerId',
          type: 'text',
          references: { table: 'employees', column: 'id' },
        },
        { name: 'dateOfJoining', type: 'text', notNull: true },
        {
          name: 'employmentType',
          type: 'text',
          enum: ['full_time', 'part_time', 'contract', 'intern'],
          notNull: true,
        },
        {
          name: 'status',
          type: 'text',
          enum: ['active', 'on_leave', 'terminated', 'resigned'],
          default: 'active',
        },
        { name: 'emergencyContactName', type: 'text' },
        { name: 'emergencyContactPhone', type: 'text' },
        { name: 'emergencyContactRelation', type: 'text' },
        { name: 'bankName', type: 'text' },
        { name: 'bankAccount', type: 'text' },
        { name: 'bankIfsc', type: 'text' },
        { name: 'createdAt', type: 'text', default: 'CURRENT_TIMESTAMP' },
        { name: 'updatedAt', type: 'text', default: 'CURRENT_TIMESTAMP' },
      ],
    },
    {
      table: 'employee_documents',
      description: 'Documents uploaded for employees',
      columns: [
        { name: 'id', type: 'text', primaryKey: true, defaultFn: 'uuid' },
        {
          name: 'employeeId',
          type: 'text',
          references: { table: 'employees', column: 'id' },
          notNull: true,
        },
        { name: 'name', type: 'text', notNull: true },
        { name: 'type', type: 'text', notNull: true },
        { name: 'fileUrl', type: 'text', notNull: true },
        { name: 'uploadedAt', type: 'text', default: 'CURRENT_TIMESTAMP' },
      ],
    },
    {
      table: 'salary_structures',
      description: 'Salary structure templates',
      columns: [
        { name: 'id', type: 'text', primaryKey: true, defaultFn: 'uuid' },
        { name: 'name', type: 'text', notNull: true },
        { name: 'description', type: 'text' },
        { name: 'active', type: 'integer', default: 1 },
        { name: 'createdAt', type: 'text', default: 'CURRENT_TIMESTAMP' },
      ],
    },
    {
      table: 'pay_components',
      description: 'Pay components within salary structures',
      columns: [
        { name: 'id', type: 'text', primaryKey: true, defaultFn: 'uuid' },
        {
          name: 'structureId',
          type: 'text',
          references: { table: 'salary_structures', column: 'id' },
          notNull: true,
        },
        { name: 'name', type: 'text', notNull: true },
        {
          name: 'type',
          type: 'text',
          enum: ['earning', 'deduction'],
          notNull: true,
        },
        {
          name: 'calcType',
          type: 'text',
          enum: ['fixed', 'percentage'],
          notNull: true,
        },
        { name: 'amount', type: 'real' },
        { name: 'percentageOf', type: 'text' },
        { name: 'taxable', type: 'integer', default: 1 },
        { name: 'active', type: 'integer', default: 1 },
      ],
    },
    {
      table: 'employee_salaries',
      description: 'Employee salary assignments',
      columns: [
        { name: 'id', type: 'text', primaryKey: true, defaultFn: 'uuid' },
        {
          name: 'employeeId',
          type: 'text',
          references: { table: 'employees', column: 'id' },
          notNull: true,
        },
        {
          name: 'structureId',
          type: 'text',
          references: { table: 'salary_structures', column: 'id' },
          notNull: true,
        },
        { name: 'baseSalary', type: 'real', notNull: true },
        { name: 'effectiveFrom', type: 'text', notNull: true },
        { name: 'active', type: 'integer', default: 1 },
      ],
    },
    {
      table: 'payroll_runs',
      description: 'Payroll processing runs',
      columns: [
        { name: 'id', type: 'text', primaryKey: true, defaultFn: 'uuid' },
        { name: 'periodMonth', type: 'integer', notNull: true },
        { name: 'periodYear', type: 'integer', notNull: true },
        {
          name: 'status',
          type: 'text',
          enum: ['draft', 'processing', 'completed', 'cancelled'],
          default: 'draft',
        },
        { name: 'runDate', type: 'text' },
        {
          name: 'approvedBy',
          type: 'text',
          references: { table: 'users', column: 'id' },
        },
        { name: 'totalAmount', type: 'real' },
      ],
    },
    {
      table: 'payslips',
      description: 'Individual employee payslips',
      columns: [
        { name: 'id', type: 'text', primaryKey: true, defaultFn: 'uuid' },
        {
          name: 'runId',
          type: 'text',
          references: { table: 'payroll_runs', column: 'id' },
          notNull: true,
        },
        {
          name: 'employeeId',
          type: 'text',
          references: { table: 'employees', column: 'id' },
          notNull: true,
        },
        { name: 'gross', type: 'real', notNull: true },
        { name: 'deductions', type: 'real', notNull: true },
        { name: 'net', type: 'real', notNull: true },
        { name: 'status', type: 'text' },
        { name: 'generatedAt', type: 'text', default: 'CURRENT_TIMESTAMP' },
      ],
    },
    {
      table: 'job_postings',
      description: 'Job postings for recruitment',
      columns: [
        { name: 'id', type: 'text', primaryKey: true, defaultFn: 'uuid' },
        { name: 'title', type: 'text', notNull: true },
        {
          name: 'departmentId',
          type: 'text',
          references: { table: 'departments', column: 'id' },
        },
        {
          name: 'positionId',
          type: 'text',
          references: { table: 'positions', column: 'id' },
        },
        { name: 'description', type: 'text' },
        { name: 'requirements', type: 'text' },
        {
          name: 'status',
          type: 'text',
          enum: ['draft', 'open', 'closed'],
          default: 'draft',
        },
        { name: 'postedDate', type: 'text' },
        { name: 'closingDate', type: 'text' },
      ],
    },
    {
      table: 'applicants',
      description: 'Job applicants',
      columns: [
        { name: 'id', type: 'text', primaryKey: true, defaultFn: 'uuid' },
        {
          name: 'jobId',
          type: 'text',
          references: { table: 'job_postings', column: 'id' },
          notNull: true,
        },
        { name: 'name', type: 'text', notNull: true },
        { name: 'email', type: 'text', notNull: true },
        { name: 'phone', type: 'text' },
        { name: 'resumeUrl', type: 'text' },
        {
          name: 'status',
          type: 'text',
          enum: ['applied', 'screening', 'interview', 'offered', 'rejected', 'hired'],
          default: 'applied',
        },
        { name: 'appliedDate', type: 'text', default: 'CURRENT_TIMESTAMP' },
      ],
    },
    {
      table: 'performance_reviews',
      description: 'Employee performance reviews',
      columns: [
        { name: 'id', type: 'text', primaryKey: true, defaultFn: 'uuid' },
        {
          name: 'employeeId',
          type: 'text',
          references: { table: 'employees', column: 'id' },
          notNull: true,
        },
        {
          name: 'reviewerId',
          type: 'text',
          references: { table: 'employees', column: 'id' },
          notNull: true,
        },
        { name: 'period', type: 'text', notNull: true },
        { name: 'rating', type: 'integer' },
        { name: 'comments', type: 'text' },
        {
          name: 'status',
          type: 'text',
          enum: ['draft', 'submitted', 'acknowledged'],
          default: 'draft',
        },
        { name: 'reviewDate', type: 'text' },
      ],
    },
    {
      table: 'leave_types',
      description: 'Types of leave available',
      columns: [
        { name: 'id', type: 'text', primaryKey: true, defaultFn: 'uuid' },
        { name: 'name', type: 'text', notNull: true },
        { name: 'daysPerYear', type: 'integer', notNull: true },
        { name: 'carryForward', type: 'integer', default: 0 },
        { name: 'active', type: 'integer', default: 1 },
      ],
    },
    {
      table: 'leave_balances',
      description: 'Employee leave balances by type and year',
      columns: [
        { name: 'id', type: 'text', primaryKey: true, defaultFn: 'uuid' },
        {
          name: 'employeeId',
          type: 'text',
          references: { table: 'employees', column: 'id' },
          notNull: true,
        },
        {
          name: 'leaveTypeId',
          type: 'text',
          references: { table: 'leave_types', column: 'id' },
          notNull: true,
        },
        { name: 'year', type: 'integer', notNull: true },
        { name: 'total', type: 'integer', notNull: true },
        { name: 'used', type: 'integer', default: 0 },
        { name: 'balance', type: 'integer', notNull: true },
      ],
    },
    {
      table: 'leave_requests',
      description: 'Employee leave requests',
      columns: [
        { name: 'id', type: 'text', primaryKey: true, defaultFn: 'uuid' },
        {
          name: 'employeeId',
          type: 'text',
          references: { table: 'employees', column: 'id' },
          notNull: true,
        },
        {
          name: 'leaveTypeId',
          type: 'text',
          references: { table: 'leave_types', column: 'id' },
          notNull: true,
        },
        { name: 'fromDate', type: 'text', notNull: true },
        { name: 'toDate', type: 'text', notNull: true },
        { name: 'days', type: 'integer', notNull: true },
        { name: 'reason', type: 'text' },
        {
          name: 'status',
          type: 'text',
          enum: ['pending', 'approved', 'rejected'],
          default: 'pending',
        },
        {
          name: 'approvedBy',
          type: 'text',
          references: { table: 'users', column: 'id' },
        },
      ],
    },
    {
      table: 'attendance',
      description: 'Employee attendance records',
      columns: [
        { name: 'id', type: 'text', primaryKey: true, defaultFn: 'uuid' },
        {
          name: 'employeeId',
          type: 'text',
          references: { table: 'employees', column: 'id' },
          notNull: true,
        },
        { name: 'date', type: 'text', notNull: true },
        { name: 'checkIn', type: 'text' },
        { name: 'checkOut', type: 'text' },
        {
          name: 'status',
          type: 'text',
          enum: ['present', 'absent', 'half_day', 'holiday'],
          default: 'present',
        },
        { name: 'hoursWorked', type: 'real' },
      ],
    },
  ];
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const outputDir = process.argv[2] || join(process.cwd(), 'config/schema');
  exportSchemaToJson(outputDir);
}
