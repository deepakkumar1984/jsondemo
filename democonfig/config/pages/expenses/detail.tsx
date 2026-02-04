import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../../src/client/components/ui/card';
import { Button } from '../../../src/client/components/ui/button';
import { Badge } from '../../../src/client/components/ui/badge';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '../../../src/client/components/ui/dialog';
import api from '../../../src/client/lib/api';

export default function ExpenseDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [expense, setExpense] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    const fetchExpense = async () => {
      try {
        const res = await api.get(`/api/expenses/${id}`);
        if (res.success) {
          setExpense(res.data);
        } else {
          setError(res.error?.message || 'Failed to load expense');
        }
      } catch (err) {
        setError('An error occurred while fetching the expense');
      } finally {
        setLoading(false);
      }
    };
    fetchExpense();
  }, [id]);

  const handleDelete = async () => {
    try {
      const res = await api.delete(`/api/expenses/${id}`);
      if (res.success) {
        navigate('/expenses');
      } else {
        setError(res.error?.message || 'Failed to delete expense');
      }
    } catch (err) {
      setError('An error occurred while deleting the expense');
    }
    setDeleteDialogOpen(false);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!expense) return <div>No expense found</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Expense Details</h1>
        <div className="space-x-2">
          <Button onClick={() => navigate('/expenses')}>Back to List</Button>
          <Button onClick={() => navigate(`/expenses/edit/${id}`)}>Edit</Button>
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">Delete</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Delete</DialogTitle>
              </DialogHeader>
              <p>Are you sure you want to delete this expense?</p>
              <div className="flex justify-end space-x-2">
                <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleDelete}>Delete</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{expense.amount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Date</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{expense.date}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Category</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{expense.category}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Vendor</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{expense.vendor}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge>{expense.status}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Reimbursable</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{expense.reimbursable ? 'Yes' : 'No'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Receipt</CardTitle>
          </CardHeader>
          <CardContent>
            <a href={expense.receiptLink} target="_blank" rel="noopener noreferrer">View Receipt</a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}