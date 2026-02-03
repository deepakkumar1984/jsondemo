import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../../src/client/components/ui/card';
import { Button } from '../../../src/client/components/ui/button';
import { Badge } from '../../../src/client/components/ui/badge';
import api from '../../../src/client/lib/api';

export default function ExpenseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [expense, setExpense] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/expenses/${id}`).then(res => {
      if (res.success) {
        setExpense(res.data);
      }
      setLoading(false);
    });
  }, [id]);

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this expense?')) {
      const res = await api.delete(`/expenses/${id}`);
      if (res.success) {
        navigate('/expenses');
      } else {
        alert(res.error?.message || 'Failed to delete expense');
      }
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!expense) return <div>Expense not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Expense Details</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/expenses')}>
            Back to List
          </Button>
          <Button variant="outline" onClick={() => navigate(`/expenses/${id}/edit`)}>
            Edit
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{expense.amount} {expense.currency}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Date</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{new Date(expense.expenseDate).toLocaleDateString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Category</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{expense.category || 'N/A'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Vendor</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{expense.vendor || 'N/A'}</p>
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
            <Badge variant={expense.reimbursable ? 'default' : 'secondary'}>
              {expense.reimbursable ? 'Yes' : 'No'}
            </Badge>
          </CardContent>
        </Card>
      </div>
      {expense.receiptLink && (
        <Card>
          <CardHeader>
            <CardTitle>Receipt</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <a href={expense.receiptLink} target="_blank" rel="noopener noreferrer">
                View Receipt
              </a>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}