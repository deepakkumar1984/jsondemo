import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../../src/client/components/ui/card';
import { Button } from '../../../src/client/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../../src/client/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../src/client/components/ui/select';
import api from '../../../src/client/lib/api';

export default function ProjectsListPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentProjectId, setCurrentProjectId] = useState<string>('');

  useEffect(() => {
    api.get('/projects').then(res => {
      if (res.success) {
        setProjects(res.data || []);
      }
      setLoading(false);
    });
  }, []);

  const handleArchive = async (id: string) => {
    if (confirm('Are you sure you want to archive this project?')) {
      const res = await api.put(`/projects/${id}/archive`);
      if (res.success) {
        setProjects(projects.filter(p => p.id !== id));
      } else {
        alert(res.error?.message || 'Failed to archive project');
      }
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Projects</h1>
        <Button onClick={() => navigate('/projects/new')}>Create Project</Button>
      </div>
      <div className="flex items-center space-x-4">
        <label className="text-sm font-medium">Current Project:</label>
        <Select value={currentProjectId} onValueChange={setCurrentProjectId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select a project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((project: any) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Projects List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Updated At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project: any) => (
                <TableRow key={project.id}>
                  <TableCell>{project.name}</TableCell>
                  <TableCell>{project.status}</TableCell>
                  <TableCell>{project.owner}</TableCell>
                  <TableCell>{project.updatedAt}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/projects/${project.id}/edit`)}>
                        Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleArchive(project.id)}>
                        Archive
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