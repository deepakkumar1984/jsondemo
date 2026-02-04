import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../../src/client/components/ui/card';
import { Button } from '../../../src/client/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../../src/client/components/ui/table';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '../../../src/client/components/ui/dialog';
import { Input } from '../../../src/client/components/ui/input';
import { Badge } from '../../../src/client/components/ui/badge';

interface Vendor {
  id: number;
  name: string;
  is_active: boolean;
}

export default function VendorsListPage() {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [formData, setFormData] = useState({ name: '' });

  useEffect(() => {
    // Placeholder: Since no APIs exist, use static data
    setVendors([
      { id: 1, name: 'Vendor A', is_active: true },
      { id: 2, name: 'Vendor B', is_active: false },
    ]);
    setLoading(false);
  }, []);

  const handleAdd = () => {
    setEditingVendor(null);
    setFormData({ name: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormData({ name: vendor.name });
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    setVendors(vendors.map(v => v.id === id ? { ...v, is_active: false } : v));
  };

  const handleSave = () => {
    if (!formData.name.trim()) return;
    if (editingVendor) {
      setVendors(vendors.map(v => v.id === editingVendor.id ? { ...v, name: formData.name } : v));
    } else {
      const newVendor: Vendor = { id: Date.now(), name: formData.name, is_active: true };
      setVendors([...vendors, newVendor]);
    }
    setIsModalOpen(false);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Vendors</h1>
        <Button onClick={handleAdd}>Add Vendor</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Vendor List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell>{vendor.id}</TableCell>
                  <TableCell>{vendor.name}</TableCell>
                  <TableCell>
                    <Badge variant={vendor.is_active ? 'default' : 'secondary'}>
                      {vendor.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(vendor)}>Edit</Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(vendor.id)} className="ml-2">Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingVendor ? 'Edit Vendor' : 'Add Vendor'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Vendor Name"
              value={formData.name}
              onChange={(e) => setFormData({ name: e.target.value })}
            />
            <div className="flex justify-end space-x-2">
              <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}