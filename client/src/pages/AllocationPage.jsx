import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { AlertTriangle, ArrowLeftRight } from 'lucide-react';
import { format } from 'date-fns';

export default function AllocationPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('allocations');
  const [allocations, setAllocations] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [assets, setAssets] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [conflictInfo, setConflictInfo] = useState(null);
  
  const [formData, setFormData] = useState({
    assetId: '',
    holderType: 'User',
    holderId: '',
    expectedReturnDate: ''
  });

  const [returnModal, setReturnModal] = useState({ open: false, id: null, assetTag: '', assetName: '', condition: 'Good', notes: '' });

  useEffect(() => {
    if (activeTab === 'allocations') fetchAllocations();
    else if (activeTab === 'transfers') fetchTransfers();
    else if (activeTab === 'new') {
      fetchAssets();
      fetchUsers();
      fetchDepartments();
    }
  }, [activeTab]);

  const fetchAllocations = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/allocations');
      setAllocations(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/transfers');
      setTransfers(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssets = async () => {
    try {
      const { data } = await api.get('/assets?status=Available');
      setAssets(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/users');
      setUsers(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data } = await api.get('/departments');
      setDepartments(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAllocate = async (e) => {
    e.preventDefault();
    setConflictInfo(null);
    try {
      await api.post('/allocations', formData);
      setActiveTab('allocations');
      setFormData({ assetId: '', holderType: 'User', holderId: '', expectedReturnDate: '' });
    } catch (err) {
      if (err.response?.status === 409) {
        setConflictInfo(err.response.data.currentHolder);
      } else {
        alert(err.response?.data?.error || 'Error allocating asset');
      }
    }
  };

  const handleRequestTransfer = async () => {
    try {
      await api.post('/transfers', {
        assetId: formData.assetId,
        toHolder: { type: formData.holderType, id: formData.holderId }
      });
      setActiveTab('transfers');
      setConflictInfo(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Error requesting transfer');
    }
  };

  const handleReturn = async () => {
    try {
      await api.patch(`/allocations/${returnModal.id}/return`, {
        condition: returnModal.condition,
        notes: returnModal.notes
      });
      setReturnModal({ open: false, id: null, assetTag: '', assetName: '', condition: 'Good', notes: '' });
      fetchAllocations();
    } catch (err) {
      alert(err.response?.data?.error || 'Error returning asset');
    }
  };

  const handleApproveTransfer = async (id) => {
    try {
      await api.patch(`/transfers/${id}/approve`);
      fetchTransfers();
    } catch (err) {
      alert(err.response?.data?.error || 'Error approving transfer');
    }
  };

  const handleRejectTransfer = async (id) => {
    try {
      await api.patch(`/transfers/${id}/reject`, { reason: 'Rejected by admin' });
      fetchTransfers();
    } catch (err) {
      alert(err.response?.data?.error || 'Error rejecting transfer');
    }
  };

  const canManage = ['AssetManager', 'Admin'].includes(user?.role);
  const canManageTransfers = ['AssetManager', 'Admin', 'DeptHead'].includes(user?.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Allocation & Transfer</h1>
        <p className="text-muted-foreground mt-1">Allocate assets to users or departments, manage transfers, and track returns.</p>
      </div>

      <div className="flex gap-2">
        <Button variant={activeTab === 'allocations' ? 'default' : 'secondary'} onClick={() => setActiveTab('allocations')}>Allocations</Button>
        {canManage && <Button variant={activeTab === 'new' ? 'default' : 'secondary'} onClick={() => setActiveTab('new')}>New Allocation</Button>}
        <Button variant={activeTab === 'transfers' ? 'default' : 'secondary'} onClick={() => setActiveTab('transfers')}>Transfers</Button>
      </div>

      {activeTab === 'allocations' && (
        <div className="border rounded-md">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="p-3 font-medium">Asset</th>
                <th className="p-3 font-medium">Holder</th>
                <th className="p-3 font-medium">Type</th>
                <th className="p-3 font-medium">Allocated</th>
                <th className="p-3 font-medium">Expected Return</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {allocations.map(a => (
                <tr key={a._id} className={a.isOverdue ? 'bg-red-500/10 border-l-4 border-l-red-500' : ''}>
                  <td className="p-3">{a.assetId?.assetTag} - {a.assetId?.name}</td>
                  <td className="p-3">{a.holderId?.name}</td>
                  <td className="p-3">{a.holderType}</td>
                  <td className="p-3">{format(new Date(a.allocatedAt), 'MMM d, yyyy')}</td>
                  <td className="p-3">{a.expectedReturnDate ? format(new Date(a.expectedReturnDate), 'MMM d, yyyy') : 'N/A'}</td>
                  <td className="p-3 flex items-center gap-2">
                    <Badge variant={a.status === 'Active' ? (a.isOverdue ? 'destructive' : 'default') : 'secondary'}>
                      {a.status}
                    </Badge>
                    {a.isOverdue && <Badge variant="destructive">OVERDUE</Badge>}
                  </td>
                  <td className="p-3">
                    {a.status === 'Active' && canManage && (
                      <Button size="sm" onClick={() => setReturnModal({
                        open: true,
                        id: a._id,
                        assetTag: a.assetId?.assetTag,
                        assetName: a.assetId?.name,
                        condition: 'Good',
                        notes: ''
                      })}>
                        Mark Returned
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {allocations.length === 0 && !loading && (
                <tr><td colSpan="7" className="p-4 text-center text-muted-foreground">No allocations found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'new' && (
        <form onSubmit={handleAllocate} className="max-w-xl space-y-4 border p-6 rounded-md">
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
            <label className="block text-sm font-medium mb-1">Holder Type</label>
            <select
              className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={formData.holderType}
              onChange={e => setFormData({ ...formData, holderType: e.target.value, holderId: '' })}
            >
              <option value="User">User</option>
              <option value="Department">Department</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Holder</label>
            <select
              required
              className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={formData.holderId}
              onChange={e => setFormData({ ...formData, holderId: e.target.value })}
            >
              <option value="">Select {formData.holderType}...</option>
              {formData.holderType === 'User' ? (
                users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)
              ) : (
                departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Expected Return Date</label>
            <input
              type="date"
              className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={formData.expectedReturnDate}
              onChange={e => setFormData({ ...formData, expectedReturnDate: e.target.value })}
            />
          </div>
          <Button type="submit">Allocate Asset</Button>

          {conflictInfo && (
            <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 mt-4">
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-semibold">Asset Unavailable</span>
              </div>
              <p className="mt-1 text-sm">Currently held by {conflictInfo.name} ({conflictInfo.type})</p>
              <Button variant="outline" size="sm" className="mt-3 bg-background" onClick={handleRequestTransfer}>
                <ArrowLeftRight className="w-4 h-4 mr-2" /> Request Transfer
              </Button>
            </div>
          )}
        </form>
      )}

      {activeTab === 'transfers' && (
        <div className="border rounded-md">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="p-3 font-medium">Asset</th>
                <th className="p-3 font-medium">From</th>
                <th className="p-3 font-medium">To</th>
                <th className="p-3 font-medium">Requested By</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {transfers.map(t => (
                <tr key={t._id}>
                  <td className="p-3">{t.assetId?.assetTag} - {t.assetId?.name}</td>
                  <td className="p-3">{t.fromHolder?.name} ({t.fromHolder?.type})</td>
                  <td className="p-3">{t.toHolder?.name} ({t.toHolder?.type})</td>
                  <td className="p-3">{t.requestedBy?.name}</td>
                  <td className="p-3">
                    <Badge variant={t.status === 'Requested' ? 'secondary' : (t.status === 'Approved' ? 'default' : 'destructive')}>
                      {t.status}
                    </Badge>
                  </td>
                  <td className="p-3 flex gap-2">
                    {t.status === 'Requested' && canManageTransfers && (
                      <>
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleApproveTransfer(t._id)}>Approve</Button>
                        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleRejectTransfer(t._id)}>Reject</Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {transfers.length === 0 && !loading && (
                <tr><td colSpan="6" className="p-4 text-center text-muted-foreground">No transfers found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={returnModal.open} onOpenChange={(open) => !open && setReturnModal({ ...returnModal, open: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return Asset</DialogTitle>
            <DialogDescription>
              Record the return and condition of {returnModal.assetTag} - {returnModal.assetName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-1">Condition</label>
              <select
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={returnModal.condition}
                onChange={e => setReturnModal({ ...returnModal, condition: e.target.value })}
              >
                <option value="New">New</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Poor">Poor</option>
                <option value="Damaged">Damaged</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                className="w-full flex min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Any notes about the return..."
                value={returnModal.notes}
                onChange={e => setReturnModal({ ...returnModal, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnModal({ ...returnModal, open: false })}>Cancel</Button>
            <Button onClick={handleReturn}>Confirm Return</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
