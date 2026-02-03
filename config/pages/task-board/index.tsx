import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../../src/client/components/ui/card';
import { Button } from '../../../src/client/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../src/client/components/ui/select';
import { Alert, AlertDescription } from '../../../src/client/components/ui/alert';
import api from '../../../src/client/lib/api';

export default function TaskBoardPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, [projectId]);

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    const res = await api.get('/tasks');
    if (res.success) {
      const filteredTasks = res.data ? res.data.filter((task: any) => task.projectId === projectId) : [];
      setTasks(filteredTasks);
    } else {
      setError(res.error?.message || 'Failed to load tasks');
    }
    setLoading(false);
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    const res = await api.put(`/tasks/${taskId}`, { status: newStatus });
    if (res.success) {
      fetchTasks(); // Refetch to update the board
    } else {
      setError(res.error?.message || 'Failed to update task status');
    }
  };

  const statuses = ['Todo', 'InProgress', 'Done'];

  const groupedTasks = statuses.reduce((acc, status) => {
    acc[status] = tasks.filter((task: any) => task.status === status);
    return acc;
  }, {} as Record<string, any[]>);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Task Board</h1>
        <Button onClick={() => navigate(`/projects/${projectId}/tasks/new`)}>New Task</Button>
      </div>
      {error && (
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex gap-4 overflow-x-auto">
        {statuses.map((status) => (
          <div key={status} className="flex-1 min-w-80">
            <h2 className="text-xl font-semibold mb-4">{status}</h2>
            <div className="space-y-4">
              {groupedTasks[status].map((task: any) => (
                <Card key={task.id}>
                  <CardHeader>
                    <CardTitle>{task.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4">{task.description}</p>
                    <Select value={task.status} onValueChange={(val) => handleStatusChange(task.id, val)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Todo">Todo</SelectItem>
                        <SelectItem value="InProgress">In Progress</SelectItem>
                        <SelectItem value="Done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}