import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../../src/client/components/ui/card';
import { Button } from '../../../src/client/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../../src/client/components/ui/table';
import { Badge } from '../../../src/client/components/ui/badge';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '../../../src/client/components/ui/dialog';
import { Input } from '../../../src/client/components/ui/input';
import { Textarea } from '../../../src/client/components/ui/textarea';

interface PaymentAccount {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
}

export default function PaymentAccountsListPage() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAccount, setEditingAccount] = useState<PaymentAccount | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });

  useEffect(() => {
    // Placeholder: Since no APIs exist, use static data
    setTimeout(() => {
      setAccounts([
        { id: 1, name: 'Account 1', description: 'Description 1', is_active: true },
        { id: 2, name: 'Account 2', description: 'Description 2', is_active: true },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const handleAdd = () => {
    // Placeholder: Simulate add
    const newAccount: PaymentAccount = {
      id: accounts.length + 1,
      name: formData.name,
      description: formData.description,
      is_active: true,
    };
    setAccounts([...accounts, newAccount]);
    setFormData({ name: '', description: '' });
    setIsAddModalOpen(false);
  };

  const handleEdit = () => {
    if (editingAccount) {
      setAccounts(accounts.map(acc => acc.id === editingAccount.id ? { ...acc, name: formData.name, description: formData.description } : acc));
      setFormData({ name: '', description: '' });
      setIsEditModalOpen(false);
      setEditingAccount(null);
    }
  };

  const handleDelete = (id: number) => {
    // Soft delete: set is_active to false
    setAccounts(accounts.map(acc => acc.id === id ? { ...acc, is_active: false } : acc));
  };

  const openEditModal = (account: PaymentAccount) => {
    setEditingAccount(account);
    setFormData({ name: account.name, description: account.description });
    setIsEditModalOpen(true);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Payment Accounts</h1>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsAddModalOpen(true)}>Add Account</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Payment Account</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <Textarea
                placeholder="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
              <Button onClick={handleAdd}>Add</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Accounts List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.filter(acc => acc.is_active).map((account) => (
                <TableRow key={account.id}>
                  <TableCell>{account.id}</TableCell>
                  <TableCell>{account.name}</TableCell>
                  <TableCell>{account.description}</TableCell>
                  <TableCell>
                    <Badge variant={account.is_active ? 'default' : 'secondary'}>
                      {account.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => openEditModal(account)}>Edit</Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(account.id)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Payment Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <Textarea
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <Button onClick={handleEdit}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}