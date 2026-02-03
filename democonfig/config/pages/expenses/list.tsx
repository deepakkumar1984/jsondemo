import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../../src/client/components/ui/card';
import { Button } from '../../../src/client/components/ui/button';
import { Input } from '../../../src/client/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../src/client/components/ui/select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../../src/client/components/ui/table';
import { Badge } from '../../../src/client/components/ui/badge';
import { Checkbox } from '../../../src/client/components/ui/checkbox';
import api from '../../../src/client/lib/api';

export default function ExpensesListPage() {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    categoryId: '',
    vendorId: '',
    status: '',
    reimbursable: false,
    q: '',
    page: 1,
    limit: 10
  });
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchReferenceData();
    fetchExpenses();
  }, [filters]);

  const fetchReferenceData = async () => {
    const res = await api.get('/expensecategoryvendorpaymentaccounts');
    if (res.success) {
      // Assuming the response is an array of objects with id, name, and perhaps type
      // For simplicity, treat all as categories/vendors; in reality, might need to filter by type
      setCategories(res.data || []);
      setVendors(res.data || []);
    }
  };

  const fetchExpenses = async () => {
    setLoading(true);
    const query = new URLSearchParams({
      ...filters,
      reimbursable: filters.reimbursable.toString()
    }).toString();
    const res = await api.get(`/expenses?${query}`);
    if (res.success) {
      setExpenses(res.data?.expenses || []);
      setTotal(res.data?.total || 0);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      const res = await api.delete(`/expenses/${id}`);
      if (res.success) {
        fetchExpenses();
      } else {
        alert(res.error?.message || 'Failed to delete expense');
      }
    }
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters({ ...filters, [key]: value, page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    setFilters({ ...filters, page: newPage });
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Expenses</h1>
        <Button onClick={() => navigate('/expenses/new')}>Add Expense</Button>
      </div>
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 mb-4">
            <div>
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              <Select value={filters.categoryId} onValueChange={(val) => handleFilterChange('categoryId', val)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  {categories.map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Vendor</label>
              <Select value={filters.vendorId} onValueChange={(val) => handleFilterChange('vendorId', val)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  {vendors.map((ven: any) => (
                    <SelectItem key={ven.id} value={ven.id}>{ven.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={filters.status} onValueChange={(val) => handleFilterChange('status', val)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={filters.reimbursable}
                onCheckedChange={(checked) => handleFilterChange('reimbursable', checked)}
              />
              <label className="text-sm font-medium">Reimbursable</label>
            </div>
            <div>
              <label className="text-sm font-medium">Search</label>
              <Input
                placeholder="Search..."
                value={filters.q}
                onChange={(e) => handleFilterChange('q', e.target.value)}
              />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Expense Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reimbursable</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense: any) => (
                <TableRow key={expense.id}>
                  <TableCell>{expense.expenseDate}</TableCell>
                  <TableCell>{expense.description}</TableCell>
                  <TableCell>{expense.category?.name || expense.categoryId}</TableCell>
                  <TableCell>{expense.vendor?.name || expense.vendorId}</TableCell>
                  <TableCell>{expense.amount} {expense.currency}</TableCell>
                  <TableCell><Badge>{expense.status}</Badge></TableCell>
                  <TableCell>{expense.reimbursable ? 'Yes' : 'No'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/expenses/${expense.id}`)}>View</Button>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/expenses/${expense.id}/edit`)}>Edit</Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(expense.id)}>Delete</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-between items-center mt-4">
            <div>
              Showing {expenses.length} of {total} expenses
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={filters.page <= 1}
                onClick={() => handlePageChange(filters.page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={filters.page * filters.limit >= total}
                onClick={() => handlePageChange(filters.page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}