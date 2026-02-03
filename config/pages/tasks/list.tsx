import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../../src/client/components/ui/card';
import { Button } from '../../../src/client/components/ui/button';
import { Input } from '../../../src/client/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../src/client/components/ui/select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../../src/client/components/ui/table';
import { Checkbox } from '../../../src/client/components/ui/checkbox';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '../../../src/client/components/ui/dialog';
import api from '../../../src/client/lib/api';

export default function TasksListPage() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId?: string }>();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);

  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    status: searchParams.get('status') || '',
    priority: searchParams.get('priority') || '',
    reporterUserId: searchParams.get('reporterUserId') || '',
    search: searchParams.get('search') || '',
  });
  const [bulkData, setBulkData] = useState({ status: '', priority: '' });
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    api.get('/tasks').then(res => {
      if (res.success) {
        setTasks(res.data || []);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.priority) params.set('priority', filters.priority);
    if (filters.reporterUserId) params.set('reporterUserId', filters.reporterUserId);
    if (filters.search) params.set('search', filters.search);
    navigate({ search: params.toString() }, { replace: true });
  }, [filters, navigate]);

  const filteredTasks = tasks.filter(task => {
    if (projectId && task.projectId !== projectId) return false;
    if (filters.status && task.status !== filters.status) return false;
    if (filters.priority && task.priority !== filters.priority) return false;
    if (filters.reporterUserId && task.reporterUserId !== filters.reporterUserId) return false;
    if (filters.search && !task.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const paginatedTasks = filteredTasks.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const handleSelectTask = (id: string, checked: boolean) => {
    setSelectedTasks(prev => checked ? [...prev, id] : prev.filter(i => i !== id));
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedTasks(checked ? paginatedTasks.map(t => t.id) : []);
  };

  const handleBulkUpdate = async () => {
    for (const id of selectedTasks) {
      const updateData: any = {};
      if (bulkData.status) updateData.status = bulkData.status;
      if (bulkData.priority) updateData.priority = bulkData.priority;
      if (Object.keys(updateData).length > 0) {
        await api.put(`/tasks/${id}`, updateData);
      }
    }
    setSelectedTasks([]);
    setBulkData({ status: '', priority: '' });
    // Refresh data
    api.get('/tasks').then(res => {
      if (res.success) {
        setTasks(res.data || []);
      }
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure?')) {
      const res = await api.delete(`/tasks/${id}`);
      if (res.success) {
        setTasks(prev => prev.filter(t => t.id !== id));
      }
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Tasks</h1>
        <Button onClick={() => navigate('/tasks/new')}>New Task</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Search by title"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
            <Select value={filters.status} onValueChange={(val) => setFilters({ ...filters, status: val })}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                <SelectItem value="Todo">Todo</SelectItem>
                <SelectItem value="InProgress">In Progress</SelectItem>
                <SelectItem value="Done">Done</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.priority} onValueChange={(val) => setFilters({ ...filters, priority: val })}>
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Reporter User ID"
              value={filters.reporterUserId}
              onChange={(e) => setFilters({ ...filters, reporterUserId: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedTasks.length > 0 && (
            <div className="mb-4 flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button>Bulk Update</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Bulk Update Tasks</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Select value={bulkData.status} onValueChange={(val) => setBulkData({ ...bulkData, status: val })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Todo">Todo</SelectItem>
                        <SelectItem value="InProgress">In Progress</SelectItem>
                        <SelectItem value="Done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={bulkData.priority} onValueChange={(val) => setBulkData({ ...bulkData, priority: val })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={handleBulkUpdate}>Update</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Checkbox
                    checked={paginatedTasks.length > 0 && selectedTasks.length === paginatedTasks.length}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Reporter</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTasks.map((task: any) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedTasks.includes(task.id)}
                      onCheckedChange={(checked) => handleSelectTask(task.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell>{task.title}</TableCell>
                  <TableCell>{task.status}</TableCell>
                  <TableCell>{task.priority}</TableCell>
                  <TableCell>{task.reporterUserId}</TableCell>
                  <TableCell className="flex gap-2">
                    <Button size="sm" onClick={() => navigate(`/tasks/${task.id}`)}>View</Button>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/tasks/${task.id}/edit`)}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(task.id)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-between mt-4">
            <Button disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <span>Page {page}</span>
            <Button disabled={page * itemsPerPage >= filteredTasks.length} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}