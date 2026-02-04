import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../../src/client/components/ui/card';
import { Button } from '../../../src/client/components/ui/button';
import { Input } from '../../../src/client/components/ui/input';
import { Textarea } from '../../../src/client/components/ui/textarea';

export default function BudgetsEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [budget, setBudget] = useState<any>({ name: '', amount: '', description: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Placeholder: No API available, simulate loading
    setTimeout(() => {
      setBudget({ name: 'Sample Budget', amount: '1000', description: 'Sample description' });
      setLoading(false);
    }, 500);
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    // Placeholder: No API available, simulate save
    setTimeout(() => {
      setSaving(false);
      navigate('/budgets');
    }, 500);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Edit Budget</h1>
        <Button variant="outline" onClick={() => navigate('/budgets')}>Back</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Budget Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <Input
              value={budget.name}
              onChange={(e) => setBudget({ ...budget, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Amount</label>
            <Input
              type="number"
              value={budget.amount}
              onChange={(e) => setBudget({ ...budget, amount: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <Textarea
              value={budget.description}
              onChange={(e) => setBudget({ ...budget, description: e.target.value })}
            />
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}