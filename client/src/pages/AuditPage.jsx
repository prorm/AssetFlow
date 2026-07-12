import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ClipboardCheck, Plus, Eye, Lock, AlertTriangle, CheckCircle, XCircle, FileWarning } from 'lucide-react';
import { format } from 'date-fns';

export default function AuditPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('list');
  const [cycles, setCycles] = useState([]);
  const [selectedCycle, setSelectedCycle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);

  const [formData, setFormData] = useState({
    department: '',
    location: '',
    startDate: '',
    endDate: '',
    auditors: [],
  });

  useEffect(() => {
    fetchCycles();
  }, []);

  useEffect(() => {
    if (activeTab === 'create') {
      fetchDepartments();
      fetchUsers();
    }
  }, [activeTab]);

  const fetchCycles = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/audits');
      setCycles(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data } = await api.get('/departments');
      setDepartments(data.data);
    } catch (err) { console.error(err); }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/users');
      setUsers(data.data);
    } catch (err) { console.error(err); }
  };

  const fetchCycleDetail = async (id) => {
    try {
      const { data } = await api.get(`/audits/${id}`);
      setSelectedCycle(data.data);
      setActiveTab('detail');
    } catch (err) { console.error(err); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/audits', {
        scope: {
          department: formData.department || undefined,
          location: formData.location || undefined,
        },
        dateRange: { start: formData.startDate, end: formData.endDate },
        auditors: formData.auditors,
      });
      setFormData({ department: '', location: '', startDate: '', endDate: '', auditors: [] });
      setActiveTab('list');
      fetchCycles();
    } catch (err) {
      alert(err.response?.data?.error || 'Error creating audit cycle');
    }
  };

  const handleMarkItem = async (assetId, result) => {
    try {
      const notes = result === 'Verified' ? '' : prompt('Add notes (optional):') || '';
      await api.patch(`/audits/${selectedCycle._id}/items/${assetId}`, { result, notes });
      fetchCycleDetail(selectedCycle._id);
    } catch (err) {
      alert(err.response?.data?.error || 'Error updating item');
    }
  };

  const handleClose = async () => {
    if (!confirm('Close this audit cycle? This will mark all Missing assets as Lost and cannot be undone.')) return;
    try {
      await api.patch(`/audits/${selectedCycle._id}/close`);
      fetchCycleDetail(selectedCycle._id);
      fetchCycles();
    } catch (err) {
      alert(err.response?.data?.error || 'Error closing audit');
    }
  };

  const toggleAuditor = (userId) => {
    setFormData((prev) => ({
      ...prev,
      auditors: prev.auditors.includes(userId)
        ? prev.auditors.filter((id) => id !== userId)
        : [...prev.auditors, userId],
    }));
  };

  const isAssignedAuditor = selectedCycle?.auditors?.some(
    (a) => (a._id || a) === user?._id
  );

  const statusColor = (status) => {
    switch (status) {
      case 'Planned': return 'secondary';
      case 'InProgress': return 'default';
      case 'Completed': case 'Closed': return 'outline';
      default: return 'secondary';
    }
  };

  const resultIcon = (result) => {
    switch (result) {
      case 'Verified': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'Missing': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'Damaged': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      default: return <span className="w-4 h-4 rounded-full border-2 border-dashed border-muted-foreground/40 inline-block" />;
    }
  };

  const canManage = ['AssetManager', 'Admin'].includes(user?.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Asset Audit</h1>
        <p className="text-muted-foreground mt-1">Run physical audits and reconcile asset records.</p>
      </div>

      <div className="flex gap-2">
        <Button variant={activeTab === 'list' ? 'default' : 'secondary'} onClick={() => setActiveTab('list')}>
          <ClipboardCheck className="w-4 h-4 mr-2" />Audit Cycles
        </Button>
        {canManage && (
          <Button variant={activeTab === 'create' ? 'default' : 'secondary'} onClick={() => setActiveTab('create')}>
            <Plus className="w-4 h-4 mr-2" />New Cycle
          </Button>
        )}
      </div>

      {/* ─── LIST VIEW ─── */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          {cycles.length === 0 && !loading ? (
            <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
              <ClipboardCheck className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No audit cycles yet</p>
              <p className="text-sm mt-1">Create your first audit cycle to begin reconciling assets.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {cycles.map((c) => (
                <div key={c._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-card">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant={statusColor(c.status)}>{c.status}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(c.dateRange.start), 'MMM d')} – {format(new Date(c.dateRange.end), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <p className="text-sm">
                        <span className="font-medium">Scope:</span>{' '}
                        {c.scope?.department?.name || 'All Departments'}
                        {c.scope?.location ? ` • ${c.scope.location}` : ''}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {c.items?.length || 0} assets • {c.auditors?.length || 0} auditors
                        {c.auditors?.map((a) => a.name).join(', ') ? ` (${c.auditors.map((a) => a.name).join(', ')})` : ''}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => fetchCycleDetail(c._id)}>
                      <Eye className="w-4 h-4 mr-1" /> View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── CREATE FORM ─── */}
      {activeTab === 'create' && (
        <form onSubmit={handleCreate} className="max-w-xl space-y-4 border p-6 rounded-md bg-card">
          <h3 className="text-lg font-semibold">Create Audit Cycle</h3>
          <div>
            <label className="block text-sm font-medium mb-1">Department (optional scope)</label>
            <select
              className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Location (optional scope)</label>
            <input
              type="text"
              placeholder="e.g. Building A, Floor 2"
              className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input
                required
                type="date"
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input
                required
                type="date"
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Assign Auditors</label>
            <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
              {users.map((u) => (
                <label key={u._id} className="flex items-center gap-2 cursor-pointer text-sm hover:bg-muted/50 rounded p-1">
                  <input
                    type="checkbox"
                    checked={formData.auditors.includes(u._id)}
                    onChange={() => toggleAuditor(u._id)}
                    className="rounded"
                  />
                  {u.name} <span className="text-muted-foreground">({u.role})</span>
                </label>
              ))}
              {users.length === 0 && (
                <p className="text-sm text-muted-foreground">No users available</p>
              )}
            </div>
            {formData.auditors.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">{formData.auditors.length} selected</p>
            )}
          </div>
          <Button type="submit" disabled={formData.auditors.length === 0}>
            <Plus className="w-4 h-4 mr-2" /> Create Cycle
          </Button>
        </form>
      )}

      {/* ─── DETAIL VIEW ─── */}
      {activeTab === 'detail' && selectedCycle && (
        <div className="space-y-6">
          {/* Header */}
          <div className="border rounded-lg p-5 bg-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Badge variant={statusColor(selectedCycle.status)}>{selectedCycle.status}</Badge>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(selectedCycle.dateRange.start), 'MMM d')} – {format(new Date(selectedCycle.dateRange.end), 'MMM d, yyyy')}
                </span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setActiveTab('list')}>← Back</Button>
                {canManage && selectedCycle.status !== 'Closed' && (
                  <Button size="sm" variant="destructive" onClick={handleClose}>
                    <Lock className="w-4 h-4 mr-1" /> Close Cycle
                  </Button>
                )}
              </div>
            </div>
            <p className="text-sm">
              <span className="font-medium">Scope:</span>{' '}
              {selectedCycle.scope?.department?.name || 'All Departments'}
              {selectedCycle.scope?.location ? ` • ${selectedCycle.scope.location}` : ''}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Auditors: {selectedCycle.auditors?.map((a) => a.name).join(', ') || 'None'}
            </p>

            {/* Progress bar */}
            {(() => {
              const total = selectedCycle.items?.length || 0;
              const done = selectedCycle.items?.filter((i) => i.result).length || 0;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              return (
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{done}/{total} items checked</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Checklist */}
          <div className="border rounded-md">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="p-3 font-medium">Asset</th>
                  <th className="p-3 font-medium">Tag</th>
                  <th className="p-3 font-medium">Location</th>
                  <th className="p-3 font-medium">Result</th>
                  <th className="p-3 font-medium">Notes</th>
                  {selectedCycle.status !== 'Closed' && isAssignedAuditor && <th className="p-3 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {selectedCycle.items?.map((item) => (
                  <tr key={item.assetId?._id || item.assetId} className={
                    item.result === 'Missing' ? 'bg-red-500/5' :
                    item.result === 'Damaged' ? 'bg-amber-500/5' : ''
                  }>
                    <td className="p-3">{item.assetId?.name || '—'}</td>
                    <td className="p-3 font-mono text-xs">{item.assetId?.assetTag || '—'}</td>
                    <td className="p-3">{item.assetId?.location || '—'}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        {resultIcon(item.result)}
                        <span>{item.result || 'Pending'}</span>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{item.notes || '—'}</td>
                    {selectedCycle.status !== 'Closed' && isAssignedAuditor && (
                      <td className="p-3">
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="text-xs h-7 px-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                            onClick={() => handleMarkItem(item.assetId?._id || item.assetId, 'Verified')}>
                            ✓ Verified
                          </Button>
                          <Button size="sm" variant="outline" className="text-xs h-7 px-2 text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => handleMarkItem(item.assetId?._id || item.assetId, 'Missing')}>
                            ✗ Missing
                          </Button>
                          <Button size="sm" variant="outline" className="text-xs h-7 px-2 text-amber-600 border-amber-200 hover:bg-amber-50"
                            onClick={() => handleMarkItem(item.assetId?._id || item.assetId, 'Damaged')}>
                            ⚠ Damaged
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {(!selectedCycle.items || selectedCycle.items.length === 0) && (
                  <tr><td colSpan="6" className="p-4 text-center text-muted-foreground">No assets in this cycle scope.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Discrepancy Report */}
          {selectedCycle.status === 'Closed' && selectedCycle.discrepancyReport?.length > 0 && (
            <div className="border border-red-200 rounded-lg p-5 bg-red-50/50 dark:bg-red-900/10">
              <div className="flex items-center gap-2 mb-3">
                <FileWarning className="w-5 h-5 text-red-600" />
                <h3 className="font-semibold text-red-700 dark:text-red-400">Discrepancy Report</h3>
                <Badge variant="destructive">{selectedCycle.discrepancyReport.length} issues</Badge>
              </div>
              <div className="space-y-2">
                {selectedCycle.discrepancyReport.map((d, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 bg-background rounded border">
                    {d.result === 'Missing' ? <XCircle className="w-4 h-4 text-red-500" /> : <AlertTriangle className="w-4 h-4 text-amber-500" />}
                    <div className="flex-1">
                      <span className="font-medium">{d.assetId?.name || 'Unknown'}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{d.assetId?.assetTag}</span>
                    </div>
                    <Badge variant={d.result === 'Missing' ? 'destructive' : 'secondary'}>{d.result}</Badge>
                    {d.notes && <span className="text-sm text-muted-foreground">{d.notes}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedCycle.status === 'Closed' && (!selectedCycle.discrepancyReport || selectedCycle.discrepancyReport.length === 0) && (
            <div className="border border-emerald-200 rounded-lg p-5 bg-emerald-50/50 dark:bg-emerald-900/10 text-center">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-600" />
              <p className="font-medium text-emerald-700 dark:text-emerald-400">All Clear</p>
              <p className="text-sm text-muted-foreground">No discrepancies found in this audit cycle.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
