import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../src/client/components/ui/card';
import { Button } from '../../../src/client/components/ui/button';
import { Input } from '../../../src/client/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../../src/client/components/ui/table';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '../../../src/client/components/ui/dialog';
import api from '../../../src/client/lib/api';

export default function ExpenseCategoriesListPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', sortOrder: 0 });
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    const res = await api.get('/expensecategoryvendorpaymentaccounts');
    if (res.success) {
      setCategories(res.data || []);
    } else {
      setError(res.error?.message || 'Failed to load categories');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenModal = (category?: any) => {
    if (category) {
      setEditingId(category.id);
      setFormData({ name: category.name, sortOrder: category.sortOrder });
    } else {
      setEditingId(null);
      setFormData({ name: '', sortOrder: 0 });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setFormData({ name: '', sortOrder: 0 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setSubmitting(true);
    const url = editingId ? `/expensecategoryvendorpaymentaccounts/${editingId}` : '/expensecategoryvendorpaymentaccounts';
    const method = editingId ? api.put : api.post;
    const res = await method(url, formData);
    if (res.success) {
      handleCloseModal();
      fetchCategories();
    } else {
      alert(res.error?.message || 'Failed to save category');
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this category?')) {
      const res = await api.delete(`/expensecategoryvendorpaymentaccounts/${id}`);
      if (res.success) {
        fetchCategories();
      } else {
        alert(res.error?.message || 'Failed to delete category');
      }
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Expense Categories</h1>
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenModal()}>Add Category</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Category' : 'Add Category'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Sort Order</label>
                <Input
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save'}
                </Button>
                <Button type="button" variant="outline" onClick={handleCloseModal}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Sort Order</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category: any) => (
                <TableRow key={category.id}>
                  <TableCell>{category.name}</TableCell>
                  <TableCell>{category.sortOrder}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleOpenModal(category)}>
                        Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(category.id)}>
                        Delete
                      </Button>
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