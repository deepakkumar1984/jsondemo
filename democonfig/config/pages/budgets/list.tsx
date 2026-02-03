import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../../src/client/components/ui/card';
import { Button } from '../../../src/client/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../../src/client/components/ui/table';
import api from '../../../src/client/lib/api';

export default function BudgetsListPage() {
  const navigate = useNavigate();
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBudgets = async () => {
    const res = await api.get('/budgets');
    if (res.success) {
      setBudgets(res.data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBudgets();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this budget?')) {
      const res = await api.delete(`/budgets/${id}`);
      if (res.success) {
        fetchBudgets();
      } else {
        alert(res.error?.message || 'Failed to delete budget');
      }
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Budgets</h1>
        <Button onClick={() => navigate('/budgets/create')}>Add Budget</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Budget List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period Start</TableHead>
                <TableHead>Period End</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {budgets.map((budget: any) => (
                <TableRow key={budget.id}>
                  <TableCell>{budget.periodStart}</TableCell>
                  <TableCell>{budget.periodEnd}</TableCell>
                  <TableCell>{budget.category || 'N/A'}</TableCell>
                  <TableCell>{budget.amount}</TableCell>
                  <TableCell>{budget.currency}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/budgets/edit/${budget.id}`)}>Edit</Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(budget.id)}>Delete</Button>
                    </div>
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