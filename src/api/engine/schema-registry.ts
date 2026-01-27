import * as schema from '../../db/schema';

export const schemaRegistry: Record<string, any> = {
  users: schema.users,
  departments: schema.departments,
  positions: schema.positions,
  employees: schema.employees,
  employeeDocuments: schema.employeeDocuments,
  salaryStructures: schema.salaryStructures,
  payComponents: schema.payComponents,
  employeeSalaries: schema.employeeSalaries,
  payrollRuns: schema.payrollRuns,
  payslips: schema.payslips,
  jobPostings: schema.jobPostings,
  applicants: schema.applicants,
  performanceReviews: schema.performanceReviews,
  leaveTypes: schema.leaveTypes,
  leaveBalances: schema.leaveBalances,
  leaveRequests: schema.leaveRequests,
  attendance: schema.attendance,
};
