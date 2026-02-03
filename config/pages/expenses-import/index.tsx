import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../../src/client/components/ui/card';
import { Button } from '../../../src/client/components/ui/button';
import { Input } from '../../../src/client/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../../src/client/components/ui/table';
import { Alert, AlertDescription } from '../../../src/client/components/ui/alert';
import api from '../../../src/client/lib/api';

export default function ExpensesImportPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [dryRunDone, setDryRunDone] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setPreview([]);
      setErrors([]);
      setDryRunDone(false);
    }
  };

  const handleDryRun = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('dryRun', 'true');

    const res = await api.post('/expenses/import', formData);
    if (res.success) {
      setPreview(res.data?.preview || []);
      setErrors(res.data?.errors || []);
      setDryRunDone(true);
    } else {
      setErrors([res.error?.message || 'Dry run failed']);
    }
    setLoading(false);
  };

  const handleConfirmImport = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    const res = await api.post('/expenses/import', formData);
    if (res.success) {
      navigate('/expenses');
    } else {
      setErrors([res.error?.message || 'Import failed']);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Import Expenses</h1>
      <Card>
        <CardHeader>
          <CardTitle>Upload CSV File</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Select CSV File</label>
            <Input type="file" accept=".csv" onChange={handleFileChange} />
          </div>
          <Button onClick={handleDryRun} disabled={!file || loading}>
            {loading ? 'Processing...' : 'Preview Import'}
          </Button>
        </CardContent>
      </Card>
      {dryRunDone && (
        <Card>
          <CardHeader>
            <CardTitle>Import Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {errors.length > 0 && (
              <Alert className="mb-4">
                <AlertDescription>
                  <ul>
                    {errors.map((error, idx) => <li key={idx}>{error}</li>)}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.map((item: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell>{item.date}</TableCell>
                    <TableCell>{item.amount}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{item.vendor}</TableCell>
                    <TableCell>{item.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleConfirmImport} disabled={loading || errors.length > 0}>
                {loading ? 'Importing...' : 'Confirm Import'}
              </Button>
              <Button variant="outline" onClick={() => navigate('/expenses')}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}