import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../../src/client/components/ui/card';
import { Button } from '../../../src/client/components/ui/button';
import { Input } from '../../../src/client/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../src/client/components/ui/select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../../src/client/components/ui/table';
import { Badge } from '../../../src/client/components/ui/badge';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '../../../src/client/components/ui/dialog';

export default function ExpensesListPage() {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<any[]>([
    { id: 1, expense_date: '2023-10-01', description: 'Office supplies', category: 'Office', vendor: 'Amazon', amount: 150.00, status: 'Approved', reimbursable: true },
    { id: 2, expense_date: '2023-10-02', description: 'Travel', category: 'Travel', vendor: 'Uber', amount: 50.00, status: 'Pending', reimbursable: false },
  ]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    category: '',
    vendor: '',
    status: '',
    reimbursable: '',
    q: '',
  });
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Placeholder for fetching data - since no API, use static data
  useEffect(() => {
    // No API call, static data loaded
  }, []);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleDelete = (id: number) => {
    setExpenses(prev => prev.filter(exp => exp.id !== id));
    setDeleteId(null);
  };

  const filteredExpenses = expenses.filter(exp => {
    // Simple filtering logic
    return (
      (!filters.startDate || exp.expense_date >= filters.startDate) &&
      (!filters.endDate || exp.expense_date <= filters.endDate) &&
      (!filters.category || exp.category === filters.category) &&
      (!filters.vendor || exp.vendor === filters.vendor) &&
      (!filters.status || exp.status === filters.status) &&
      (!filters.reimbursable || exp.reimbursable.toString() === filters.reimbursable) &&
      (!filters.q || exp.description.toLowerCase().includes(filters.q.toLowerCase()))
    );
  });

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Expenses</h1>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => navigate('/expenses/import')}>Import CSV</Button>
          <Button variant="outline" onClick={() => window.open(`/api/expenses/export.csv?${new URLSearchParams(filters).toString()}`, '_blank')}>Export CSV</Button>
          <Button onClick={() => navigate('/expenses/new')}>Add Expense</Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              type="date"
              placeholder="Start Date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />
            <Input
              type="date"
              placeholder="End Date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
            />
            <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Office">Office</SelectItem>
                <SelectItem value="Travel">Travel</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.vendor} onValueChange={(value) => handleFilterChange('vendor', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Vendor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Amazon">Amazon</SelectItem>
                <SelectItem value="Uber">Uber</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.reimbursable} onValueChange={(value) => handleFilterChange('reimbursable', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Reimbursable" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Yes</SelectItem>
                <SelectItem value="false">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input
            placeholder="Search..."
            value={filters.q}
            onChange={(e) => handleFilterChange('q', e.target.value)}
          />
        </CardContent>
      </Card>
      <Card>
        <CardContent>
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
              {filteredExpenses.map((exp) => (
                <TableRow key={exp.id}>
                  <TableCell>{exp.expense_date}</TableCell>
                  <TableCell>{exp.description}</TableCell>
                  <TableCell>{exp.category}</TableCell>
                  <TableCell>{exp.vendor}</TableCell>
                  <TableCell>${exp.amount.toFixed(2)}</TableCell>
                  <TableCell><Badge variant={exp.status === 'Approved' ? 'default' : 'secondary'}>{exp.status}</Badge></TableCell>
                  <TableCell>{exp.reimbursable ? 'Yes' : 'No'}</TableCell>
                  <TableCell className="space-x-2">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/expenses/${exp.id}`)}>View</Button>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/expenses/${exp.id}/edit`)}>Edit</Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setDeleteId(exp.id)}>Delete</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Confirm Delete</DialogTitle>
                        </DialogHeader>
                        <p>Are you sure you want to delete this expense?</p>
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
                          <Button onClick={() => handleDelete(exp.id)}>Delete</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}