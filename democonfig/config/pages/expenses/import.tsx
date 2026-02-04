import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../src/client/components/ui/card';
import { Button } from '../../../src/client/components/ui/button';
import { Input } from '../../../src/client/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../../src/client/components/ui/table';
import { Badge } from '../../../src/client/components/ui/badge';

export default function ExpenseCsvImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Mock CSV parsing for preview
      const mockData = [
        { id: 1, description: 'Office Supplies', amount: 150.00, date: '2023-10-01', error: null },
        { id: 2, description: 'Travel', amount: 500.00, date: '2023-10-02', error: 'Invalid date format' },
        { id: 3, description: 'Lunch', amount: 25.00, date: '2023-10-03', error: null },
      ];
      setPreviewData(mockData);
      setError(null);
    }
  };

  const handleConfirmImport = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    // Placeholder for API call - since no APIs exist, just simulate
    setTimeout(() => {
      setLoading(false);
      // Mock success
      alert('Import completed successfully');
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Expense CSV Import</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Upload CSV File</CardTitle>
        </CardHeader>
        <CardContent>
          <Input type="file" accept=".csv" onChange={handleFileChange} />
          {error && <p className="text-red-500 mt-2">{error}</p>}
        </CardContent>
      </Card>
      {previewData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Dry Run Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Validation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((row: any) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.description}</TableCell>
                    <TableCell>${row.amount}</TableCell>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>
                      {row.error ? <Badge variant="destructive">{row.error}</Badge> : <Badge variant="secondary">Valid</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4">
              <Button onClick={handleConfirmImport} disabled={loading}>
                {loading ? 'Importing...' : 'Confirm Import'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}