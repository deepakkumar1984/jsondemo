import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../../src/client/components/ui/card';
import { Button } from '../../../src/client/components/ui/button';
import { Input } from '../../../src/client/components/ui/input';
import { Textarea } from '../../../src/client/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../src/client/components/ui/select';
import api from '../../../src/client/lib/api';

export default function ExpenseCreatePage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    expense_date: '',
    amount: '',
    currency: '',
    category_id: '',
    vendor_id: '',
    payment_account_id: '',
    reimbursable: '',
    status: '',
    description: '',
    receipt_url: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.expense_date) newErrors.expense_date = 'Expense date is required';
    if (!formData.amount) newErrors.amount = 'Amount is required';
    if (!formData.currency) newErrors.currency = 'Currency is required';
    if (!formData.category_id) newErrors.category_id = 'Category is required';
    if (!formData.status) newErrors.status = 'Status is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    const res = await api.post('/api/expenses', formData);
    setLoading(false);
    if (res.success) {
      navigate('/expenses');
    } else {
      alert(res.error?.message || 'Failed to create expense');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Create Expense</h1>
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
                className={errors.expense_date ? 'border-red-500' : ''}
              />
              {errors.expense_date && <p className="text-red-500 text-sm">{errors.expense_date}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium">Amount *</label>
              <Input
                type="number"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                className={errors.amount ? 'border-red-500' : ''}
              />
              {errors.amount && <p className="text-red-500 text-sm">{errors.amount}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium">Currency *</label>
              <Select value={formData.currency} onValueChange={(value) => handleInputChange('currency', value)}>
                <SelectTrigger className={errors.currency ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
              {errors.currency && <p className="text-red-500 text-sm">{errors.currency}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium">Category *</label>
              <Select value={formData.category_id} onValueChange={(value) => handleInputChange('category_id', value)}>
                <SelectTrigger className={errors.category_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Office Supplies</SelectItem>
                  <SelectItem value="2">Travel</SelectItem>
                  <SelectItem value="3">Meals</SelectItem>
                </SelectContent>
              </Select>
              {errors.category_id && <p className="text-red-500 text-sm">{errors.category_id}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium">Vendor</label>
              <Select value={formData.vendor_id} onValueChange={(value) => handleInputChange('vendor_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Vendor A</SelectItem>
                  <SelectItem value="2">Vendor B</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium">Payment Account</label>
              <Select value={formData.payment_account_id} onValueChange={(value) => handleInputChange('payment_account_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment account (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Account 1</SelectItem>
                  <SelectItem value="2">Account 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium">Reimbursable</label>
              <Select value={formData.reimbursable} onValueChange={(value) => handleInputChange('reimbursable', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium">Status *</label>
              <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                <SelectTrigger className={errors.status ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              {errors.status && <p className="text-red-500 text-sm">{errors.status}</p>}
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
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Expense'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}