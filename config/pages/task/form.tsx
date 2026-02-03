import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../../src/client/components/ui/card';
import { Button } from '../../../src/client/components/ui/button';
import { Input } from '../../../src/client/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../src/client/components/ui/select';
import api from '../../../src/client/lib/api';

export default function TaskFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    status: 'Todo',
    priority: 'Medium',
    projectId: '',
    reporterUserId: 1
  });
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!id;

  useEffect(() => {
    const fetchData = async () => {
      const projectsRes = await api.get('/projects');
      if (projectsRes.success) {
        setProjects(projectsRes.data || []);
      }
      if (isEdit) {
        const taskRes = await api.get(`/tasks/${id}`);
        if (taskRes.success && taskRes.data) {
          setFormData({
            title: taskRes.data.title || '',
            status: taskRes.data.status || 'Todo',
            priority: taskRes.data.priority || 'Medium',
            projectId: taskRes.data.projectId || '',
            reporterUserId: taskRes.data.reporterUserId || 1
          });
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Title is required');
      return;
    }
    setSubmitting(true);

    const data = isEdit
      ? { title: formData.title, status: formData.status, priority: formData.priority }
      : { projectId: formData.projectId, title: formData.title, status: formData.status, priority: formData.priority, reporterUserId: formData.reporterUserId };

    const res = isEdit
      ? await api.put(`/tasks/${id}`, data)
      : await api.post('/tasks', data);

    if (res.success) {
      navigate('/tasks');
    } else {
      alert(res.error?.message || `Failed to ${isEdit ? 'update' : 'create'} task`);
      setSubmitting(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">{isEdit ? 'Edit Task' : 'Create Task'}</h1>
      <Card>
        <CardHeader>
          <CardTitle>Task Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todo">Todo</SelectItem>
                  <SelectItem value="InProgress">In Progress</SelectItem>
                  <SelectItem value="Done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Priority</label>
              <Select value={formData.priority} onValueChange={(val) => setFormData({ ...formData, priority: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!isEdit && (
              <>
                <div>
                  <label className="text-sm font-medium">Project</label>
                  <Select value={formData.projectId} onValueChange={(val) => setFormData({ ...formData, projectId: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project: any) => (
                        <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Reporter User ID</label>
                  <Input
                    type="number"
                    value={formData.reporterUserId}
                    onChange={(e) => setFormData({ ...formData, reporterUserId: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? `${isEdit ? 'Updating' : 'Creating'}...` : `${isEdit ? 'Update' : 'Create'} Task`}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/tasks')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}