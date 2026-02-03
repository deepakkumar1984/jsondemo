import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../../src/client/components/ui/card';
import { Button } from '../../../src/client/components/ui/button';
import { Input } from '../../../src/client/components/ui/input';
import { Textarea } from '../../../src/client/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../src/client/components/ui/select';
import { Badge } from '../../../src/client/components/ui/badge';
import api from '../../../src/client/lib/api';

export default function TaskDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const taskRes = await api.get(`/tasks/${id}`);
      if (taskRes.success) {
        setTask(taskRes.data);
        setFormData(taskRes.data);
      }
      // Assuming GET /comments returns all comments, filter by taskId client-side
      const commentsRes = await api.get('/comments');
      if (commentsRes.success) {
        setComments((commentsRes.data || []).filter((c: any) => c.taskId === id));
      }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const handleSave = async () => {
    setSubmitting(true);
    const res = await api.put(`/tasks/${id}`, formData);
    if (res.success) {
      setTask(formData);
      setEditing(false);
    } else {
      alert(res.error?.message || 'Failed to update task');
    }
    setSubmitting(false);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    const res = await api.post('/comments', { taskId: id, authorUserId: 1, body: newComment }); // Assuming authorUserId is 1 for demo
    if (res.success) {
      setComments([...comments, res.data]);
      setNewComment('');
    } else {
      alert(res.error?.message || 'Failed to add comment');
    }
    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (confirm('Are you sure?')) {
      const res = await api.delete(`/tasks/${id}`);
      if (res.success) {
        navigate('/tasks');
      }
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!task) return <div>Task not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{task.title}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditing(!editing)}>
            {editing ? 'Cancel' : 'Edit'}
          </Button>
          <Button variant="destructive" onClick={handleDelete}>Delete</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Task Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                {editing ? (
                  <Input
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                ) : (
                  <p>{task.title}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                {editing ? (
                  <Textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                ) : (
                  <p>{task.description}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Status</label>
                  {editing ? (
                    <Select value={formData.status || ''} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Todo">Todo</SelectItem>
                        <SelectItem value="InProgress">In Progress</SelectItem>
                        <SelectItem value="Done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge>{task.status}</Badge>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Priority</label>
                  {editing ? (
                    <Select value={formData.priority || ''} onValueChange={(val) => setFormData({ ...formData, priority: val })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge>{task.priority}</Badge>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Assignee User ID</label>
                {editing ? (
                  <Input
                    type="number"
                    value={formData.assigneeUserId || ''}
                    onChange={(e) => setFormData({ ...formData, assigneeUserId: e.target.value })}
                  />
                ) : (
                  <p>{task.assigneeUserId}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Due Date</label>
                  {editing ? (
                    <Input
                      type="date"
                      value={formData.dueDate || ''}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    />
                  ) : (
                    <p>{task.dueDate}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Start Date</label>
                  {editing ? (
                    <Input
                      type="date"
                      value={formData.startDate || ''}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    />
                  ) : (
                    <p>{task.startDate}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Estimate Points</label>
                {editing ? (
                  <Input
                    type="number"
                    value={formData.estimatePoints || ''}
                    onChange={(e) => setFormData({ ...formData, estimatePoints: e.target.value })}
                  />
                ) : (
                  <p>{task.estimatePoints}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Tags</label>
                {editing ? (
                  <Input
                    value={formData.tags || ''}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  />
                ) : (
                  <p>{task.tags}</p>
                )}
              </div>
              {editing && (
                <Button onClick={handleSave} disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save'}
                </Button>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Comments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {comments.map((comment: any) => (
                <div key={comment.id} className="border-b pb-2">
                  <p className="text-sm">{comment.body}</p>
                  <small className="text-gray-500">By {comment.authorUserId}</small>
                </div>
              ))}
              <Textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <Button onClick={handleAddComment} disabled={submitting}>
                Add Comment
              </Button>
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <p>No activities available.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}