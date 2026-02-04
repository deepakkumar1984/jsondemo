import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../../src/client/components/ui/card';
import { Button } from '../../../src/client/components/ui/button';
import { Input } from '../../../src/client/components/ui/input';
import { Textarea } from '../../../src/client/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../src/client/components/ui/select';
import api from '../../../src/client/lib/api';

interface ExpenseFormData {
  expense_date: string;
  amount: number;
  currency: string;
  category_id: string;
  vendor_id: string;
  payment_account_id: string;
  reimbursable: boolean;
  status: string;
  description: string;
  receipt_url: string;
}

export default function ExpenseEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [formData, setFormData] = useState<ExpenseFormData>({
    expense_date: '',
    amount: 0,
    currency: '',
    category_id: '',
    vendor_id: '',
    payment_account_id: '',
    reimbursable: false,
    status: '',
    description: '',
    receipt_url: '',
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  // Static options for selects (since no APIs provided)
  const currencyOptions = ['USD', 'EUR', 'GBP'];
  const categoryOptions = ['Travel', 'Office Supplies', 'Meals'];
  const vendorOptions = ['Vendor A', 'Vendor B', 'Vendor C'];
  const paymentAccountOptions = ['Account 1', 'Account 2', 'Account 3'];
  const statusOptions = ['Pending', 'Approved', 'Rejected'];

  useEffect(() => {
    const loadExpense = async () => {
      try {
        const res = await api.get(`/api/expenses/${id}`);
        if (res.success && res.data) {
          setFormData(res.data);
        } else {
          setError('Failed to load expense data');
        }
      } catch (err) {
        setError('An error occurred while loading data');
      } finally {
        setLoading(false);
      }
    };
    loadExpense();
  }, [id]);

  const handleInputChange = (field: keyof ExpenseFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};
    if (!formData.expense_date) errors.expense_date = 'Expense date is required';
    if (!formData.amount || formData.amount <= 0) errors.amount = 'Amount must be a positive number';
    if (!formData.category_id) errors.category_id = 'Category is required';
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.put(`/api/expenses/${id}`, formData);
      if (res.success) {
        navigate('/expenses');
      } else {
        setError(res.error?.message || 'Failed to update expense');
      }
    } catch (err) {
      setError('An error occurred while updating');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Edit Expense</h1>
        <Button variant="outline" onClick={() => navigate('/expenses')}>Back to List</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Expense Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Expense Date *</label>
              <Input
                type="date"
                value={formData.expense_date}
                onChange={(e) => handleInputChange('expense_date', e.target.value)}
                className={validationErrors.expense_date ? 'border-red-500' : ''}
              />
              {validationErrors.expense_date && <p className="text-red-500 text-sm">{validationErrors.expense_date}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium">Amount *</label>
              <Input
                type="number"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                className={validationErrors.amount ? 'border-red-500' : ''}
              />
              {validationErrors.amount && <p className="text-red-500 text-sm">{validationErrors.amount}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium">Currency</label>
              <Select value={formData.currency} onValueChange={(value) => handleInputChange('currency', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {currencyOptions.map(option => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium">Category *</label>
              <Select value={formData.category_id} onValueChange={(value) => handleInputChange('category_id', value)}>
                <SelectTrigger className={validationErrors.category_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map(option => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.category_id && <p className="text-red-500 text-sm">{validationErrors.category_id}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium">Vendor (Optional)</label>
              <Select value={formData.vendor_id} onValueChange={(value) => handleInputChange('vendor_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendorOptions.map(option => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium">Payment Account (Optional)</label>
              <Select value={formData.payment_account_id} onValueChange={(value) => handleInputChange('payment_account_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment account" />
                </SelectTrigger>
                <SelectContent>
                  {paymentAccountOptions.map(option => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.reimbursable}
                onChange={(e) => handleInputChange('reimbursable', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label className="text-sm font-medium">Reimbursable</label>
            </div>
            <div>
              <label className="block text-sm font-medium">Status</label>
              <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(option => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter description"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Receipt URL</label>
              <Input
                type="text"
                value={formData.receipt_url}
                onChange={(e) => handleInputChange('receipt_url', e.target.value)}
                placeholder="Enter receipt URL"
              />
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Updating...' : 'Update Expense'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}