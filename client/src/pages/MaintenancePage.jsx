import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { format } from 'date-fns';

export default function MaintenancePage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [techModal, setTechModal] = useState({ open: false, id: null, technicianId: '' });
  const [resolveModal, setResolveModal] = useState({ open: false, id: null, resolution: '' });

  const [formData, setFormData] = useState({
    assetId: '',
    issue: '',
    priority: 'Low',
    photo: null
  });

  useEffect(() => {
    fetchRequests();
    fetchAssets();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/maintenance');
      setRequests(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssets = async () => {
    try {
      const { data } = await api.get('/assets');
      setAssets(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      fd.append('assetId', formData.assetId);
      fd.append('issue', formData.issue);
      fd.append('priority', formData.priority);
      if (formData.photo) fd.append('photo', formData.photo);

      await api.post('/maintenance', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setNewModalOpen(false);
      setFormData({ assetId: '', issue: '', priority: 'Low', photo: null });
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.error || 'Error creating request');
    }
  };

  const handleStatusChange = async (id, action) => {
    try {
      await api.patch(`/maintenance/${id}/${action}`);
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.error || `Error performing ${action}`);
    }
  };

  const handleAssignTech = async () => {
    try {
      await api.patch(`/maintenance/${techModal.id}/assign-technician`, {
        technicianId: techModal.technicianId
      });
      setTechModal({ open: false, id: null, technicianId: '' });
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.error || 'Error assigning technician');
    }
  };

  const handleResolve = async () => {
    try {
      await api.patch(`/maintenance/${resolveModal.id}/resolve`, {
        resolution: resolveModal.resolution
      });
      setResolveModal({ open: false, id: null, resolution: '' });
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.error || 'Error resolving request');
    }
  };

  const canManage = ['AssetManager', 'Admin'].includes(user?.role);

  const getPriorityVariant = (p) => {
    switch (p) {
      case 'Low': return 'secondary';
      case 'Medium': return 'default';
      case 'High': return 'destructive'; // amber typically, but standard variant fits
      case 'Critical': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusVariant = (s) => {
    switch (s) {
      case 'Pending': return 'secondary';
      case 'Approved': return 'default';
      case 'Rejected': return 'destructive';
      case 'TechAssigned': return 'outline';
      case 'InProgress': return 'default';
      case 'Resolved': return 'outline'; // green typically
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Maintenance</h1>
          <p className="text-muted-foreground mt-1">Track and manage maintenance requests for your assets.</p>
        </div>
        <Button onClick={() => setNewModalOpen(true)}>+ New Request</Button>
      </div>

      <div className="border rounded-md">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="p-3 font-medium">Asset</th>
              <th className="p-3 font-medium">Issue</th>
              <th className="p-3 font-medium">Priority</th>
              <th className="p-3 font-medium">Raised By</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Created</th>
              <th className="p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {requests.map(r => (
              <tr key={r._id}>
                <td className="p-3">{r.assetId?.assetTag} - {r.assetId?.name}</td>
                <td className="p-3 max-w-[200px] truncate" title={r.issue}>{r.issue}</td>
                <td className="p-3">
                  <Badge variant={getPriorityVariant(r.priority)}>{r.priority}</Badge>
                </td>
                <td className="p-3">{r.raisedBy?.name}</td>
                <td className="p-3">
                  <Badge variant={getStatusVariant(r.status)}>{r.status}</Badge>
                </td>
                <td className="p-3">{format(new Date(r.createdAt), 'MMM d, yyyy')}</td>
                <td className="p-3 flex gap-2 flex-wrap">
                  {canManage && r.status === 'Pending' && (
                    <>
                      <Button size="sm" onClick={() => handleStatusChange(r._id, 'approve')}>Approve</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleStatusChange(r._id, 'reject')}>Reject</Button>
                    </>
                  )}
                  {canManage && r.status === 'Approved' && (
                    <Button size="sm" onClick={() => setTechModal({ open: true, id: r._id, technicianId: '' })}>
                      Assign Tech
                    </Button>
                  )}
                  {canManage && r.status === 'TechAssigned' && (
                    <>
                      <Button size="sm" onClick={() => handleStatusChange(r._id, 'start')}>Start Work</Button>
                      <Button size="sm" variant="outline" onClick={() => setResolveModal({ open: true, id: r._id, resolution: '' })}>Resolve</Button>
                    </>
                  )}
                  {canManage && r.status === 'InProgress' && (
                    <Button size="sm" variant="outline" onClick={() => setResolveModal({ open: true, id: r._id, resolution: '' })}>Resolve</Button>
                  )}
                </td>
              </tr>
            ))}
            {requests.length === 0 && !loading && (
              <tr><td colSpan="7" className="p-4 text-center text-muted-foreground">No maintenance requests found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={newModalOpen} onOpenChange={setNewModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Maintenance Request</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-1">Asset</label>
              <select
                required
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.assetId}
                onChange={e => setFormData({ ...formData, assetId: e.target.value })}
              >
                <option value="">Select Asset...</option>
                {assets.map(a => (
                  <option key={a._id} value={a._id}>{a.assetTag} - {a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Issue</label>
              <textarea
                required
                className="w-full flex min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.issue}
                onChange={e => setFormData({ ...formData, issue: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <select
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.priority}
                onChange={e => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Photo (Optional)</label>
              <input
                type="file"
                accept="image/*"
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                onChange={e => setFormData({ ...formData, photo: e.target.files[0] })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewModalOpen(false)}>Cancel</Button>
              <Button type="submit">Submit Request</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={techModal.open} onOpenChange={(open) => !open && setTechModal({ ...techModal, open: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Technician</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-1">Technician Name/ID</label>
              <input
                type="text"
                required
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={techModal.technicianId}
                onChange={e => setTechModal({ ...techModal, technicianId: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTechModal({ ...techModal, open: false })}>Cancel</Button>
            <Button onClick={handleAssignTech}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resolveModal.open} onOpenChange={(open) => !open && setResolveModal({ ...resolveModal, open: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Maintenance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-1">Resolution Notes</label>
              <textarea
                className="w-full flex min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={resolveModal.resolution}
                onChange={e => setResolveModal({ ...resolveModal, resolution: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveModal({ ...resolveModal, open: false })}>Cancel</Button>
            <Button onClick={handleResolve}>Mark Resolved</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
