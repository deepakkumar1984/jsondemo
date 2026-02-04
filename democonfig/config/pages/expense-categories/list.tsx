import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../../src/client/components/ui/card';
import { Button } from '../../../src/client/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../../src/client/components/ui/table';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '../../../src/client/components/ui/dialog';
import { Input } from '../../../src/client/components/ui/input';
import { Badge } from '../../../src/client/components/ui/badge';

interface ExpenseCategory {
  id: number;
  name: string;
  is_active: boolean;
}

export default function ExpenseCategoriesListPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [formName, setFormName] = useState('');

  useEffect(() => {
    // Placeholder: Since no APIs exist, use static mock data
    const mockData: ExpenseCategory[] = [
      { id: 1, name: 'Office Supplies', is_active: true },
      { id: 2, name: 'Travel', is_active: true },
      { id: 3, name: 'Meals', is_active: false },
    ];
    setCategories(mockData);
    setLoading(false);
  }, []);

  const handleAdd = () => {
    if (formName.trim()) {
      const newCategory: ExpenseCategory = {
        id: Math.max(...categories.map(c => c.id)) + 1,
        name: formName,
        is_active: true,
      };
      setCategories([...categories, newCategory]);
      setFormName('');
      setIsAddModalOpen(false);
    }
  };

  const handleEdit = () => {
    if (editingCategory && formName.trim()) {
      setCategories(categories.map(cat =>
        cat.id === editingCategory.id ? { ...cat, name: formName } : cat
      ));
      setFormName('');
      setEditingCategory(null);
      setIsEditModalOpen(false);
    }
  };

  const handleDelete = (id: number) => {
    setCategories(categories.map(cat =>
      cat.id === id ? { ...cat, is_active: false } : cat
    ));
  };

  const openEditModal = (category: ExpenseCategory) => {
    setEditingCategory(category);
    setFormName(category.name);
    setIsEditModalOpen(true);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Expense Categories</h1>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button>Add Category</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Expense Category</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Category Name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
              <Button onClick={handleAdd}>Add</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>{category.name}</TableCell>
                  <TableCell>
                    <Badge variant={category.is_active ? 'default' : 'secondary'}>
                      {category.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => openEditModal(category)}>
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(category.id)} className="ml-2">
                      Delete
                    </Button>
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
            <DialogTitle>Edit Expense Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Category Name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
            <Button onClick={handleEdit}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}