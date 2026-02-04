import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../../src/client/components/ui/card';
import { Button } from '../../../src/client/components/ui/button';

export default function BudgetsListPage() {
  const navigate = useNavigate();
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Placeholder: No API endpoints available, using static data
    setBudgets([
      { id: 1, name: 'Marketing Budget', amount: 50000 },
      { id: 2, name: 'Development Budget', amount: 100000 },
    ]);
    setLoading(false);
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Budgets</h1>
        <Button onClick={() => navigate('/budgets/new')}>New Budget</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {budgets.map((budget: any) => (
          <Card key={budget.id} className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/budgets/${budget.id}`)}>
            <CardHeader>
              <CardTitle>{budget.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Amount: ${budget.amount}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}