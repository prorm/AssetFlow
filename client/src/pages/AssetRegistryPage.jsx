import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Filter, Image as ImageIcon, X, History, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function AssetRegistryPage() {
  const { user } = useAuth();
  const [view, setView] = useState('inventory'); // inventory or register
  
  if (!['AssetManager', 'Admin'].includes(user?.role)) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="text-2xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Asset Registry</h1>
        <div className="flex gap-2 bg-muted p-1 rounded-lg">
          <Button
            variant={view === 'inventory' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('inventory')}
          >
            Inventory
          </Button>
          <Button
            variant={view === 'register' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('register')}
          >
            <Plus className="w-4 h-4 mr-2" /> Register Asset
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-card rounded-xl border shadow-sm relative overflow-hidden">
        {view === 'inventory' ? <InventoryView /> : <RegisterView onSuccess={() => setView('inventory')} />}
      </div>
    </div>
  );
}

function InventoryView() {
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({ search: '', categoryId: 'all', status: 'all', department: 'all' });
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchAssets();
    api.get('/categories').then(res => setCategories(res.data.data));
    api.get('/departments').then(res => setDepartments(res.data.data));
  }, [filters]);

  const fetchAssets = async () => {
    try {
      let query = [];
      if (filters.search) {
        query.push(`assetTag=${filters.search}`);
        query.push(`serialNumber=${filters.search}`);
      }
      if (filters.categoryId !== 'all') query.push(`categoryId=${filters.categoryId}`);
      if (filters.status !== 'all') query.push(`status=${filters.status}`);
      // if (filters.department !== 'all') query.push(`department=${filters.department}`); // Needs support in backend
      
      const qs = query.length ? '?' + query.join('&') : '';
      const res = await api.get('/assets' + qs);
      setAssets(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const openDrawer = async (asset) => {
    setSelectedAsset(asset);
    try {
      const res = await api.get(`/assets/${asset._id}/history`);
      setHistory(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Available': return 'bg-[#4ade80]/10 text-[#4ade80] border-[#4ade80]/20';
      case 'Allocated': return 'bg-[#60a5fa]/10 text-[#60a5fa] border-[#60a5fa]/20';
      case 'Reserved': return 'bg-[#fbbf24]/10 text-[#fbbf24] border-[#fbbf24]/20';
      case 'UnderMaintenance': return 'bg-[#fb923c]/10 text-[#fb923c] border-[#fb923c]/20';
      case 'Disposed': 
      case 'Lost': 
      case 'Retired': return 'bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Filters */}
      <div className="p-4 border-b flex flex-wrap gap-4 items-center bg-muted/20">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search by Tag or Serial..." 
            className="pl-9"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
        <Select value={filters.categoryId} onValueChange={v => setFilters({ ...filters, categoryId: v })}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.status} onValueChange={v => setFilters({ ...filters, status: v })}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Available">Available</SelectItem>
            <SelectItem value="Allocated">Allocated</SelectItem>
            <SelectItem value="Reserved">Reserved</SelectItem>
            <SelectItem value="UnderMaintenance">Maintenance</SelectItem>
            <SelectItem value="Retired">Retired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0 z-10 shadow-sm border-b">
            <tr>
              <th className="px-4 py-3 font-medium">Tag</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Condition</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {assets.map((asset) => (
              <tr 
                key={asset._id} 
                className="hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => openDrawer(asset)}
              >
                <td className="px-4 py-3 font-medium text-primary">{asset.assetTag}</td>
                <td className="px-4 py-3 font-medium">{asset.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{asset.categoryId?.name}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(asset.status)}`}>
                    {asset.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{asset.condition}</td>
              </tr>
            ))}
            {assets.length === 0 && (
              <tr><td colSpan="5" className="text-center py-12 text-muted-foreground">No assets found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Drawer */}
      <div className={`absolute inset-y-0 right-0 w-full sm:w-[450px] bg-background border-l shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col z-20 ${selectedAsset ? 'translate-x-0' : 'translate-x-full'}`}>
        {selectedAsset && (
          <>
            <div className="p-4 border-b flex items-center justify-between bg-muted/20">
              <div>
                <h3 className="font-semibold text-lg">{selectedAsset.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedAsset.assetTag}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedAsset(null)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {selectedAsset.photos?.[0] ? (
                <div className="aspect-video bg-muted rounded-lg overflow-hidden border">
                  <img src={selectedAsset.photos[0]} alt={selectedAsset.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="aspect-video bg-muted/30 rounded-lg border border-dashed flex flex-col items-center justify-center text-muted-foreground">
                  <ImageIcon className="w-10 h-10 mb-2 opacity-20" />
                  <span className="text-sm">No photo available</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Category</p>
                  <p className="font-medium">{selectedAsset.categoryId?.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Status</p>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border inline-block ${getStatusColor(selectedAsset.status)}`}>
                    {selectedAsset.status}
                  </span>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Serial Number</p>
                  <p className="font-medium">{selectedAsset.serialNumber || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Condition</p>
                  <p className="font-medium">{selectedAsset.condition}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Acquisition Cost</p>
                  <p className="font-medium">{selectedAsset.acquisitionCost ? `$${selectedAsset.acquisitionCost.toLocaleString()}` : '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Location</p>
                  <p className="font-medium">{selectedAsset.location || '—'}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-sm border-b pb-2 flex items-center gap-2">
                  <History className="w-4 h-4" /> History & Lifecycle
                </h4>
                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent pl-4">
                  {history.map((record, i) => (
                    <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-muted shrink-0 text-muted-foreground z-10 relative">
                        {record.recordType === 'Allocation' ? <CheckCircle className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border bg-card shadow-sm">
                        <div className="flex items-center justify-between space-x-2 mb-1">
                          <div className="font-semibold text-sm text-foreground">{record.recordType}</div>
                          <time className="font-mono text-xs text-muted-foreground">{new Date(record.createdAt).toLocaleDateString()}</time>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {record.recordType === 'Allocation' ? (
                            <>Allocated to <span className="font-medium text-foreground">{record.holderId?.name}</span></>
                          ) : (
                            <>Maintenance: <span className="font-medium text-foreground">{record.issue}</span> ({record.status})</>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {history.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4 relative z-10 bg-background">No history records found.</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Overlay for mobile drawer */}
      {selectedAsset && (
        <div className="absolute inset-0 bg-black/20 z-10 sm:hidden" onClick={() => setSelectedAsset(null)} />
      )}
    </div>
  );
}

function RegisterView({ onSuccess }) {
  const [formData, setFormData] = useState({
    name: '', categoryId: '', serialNumber: '', acquisitionDate: '', acquisitionCost: '', condition: 'New', location: '', isBookable: false
  });
  const [photo, setPhoto] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/categories').then(res => setCategories(res.data.data));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        data.append(key, formData[key]);
      });
      if (photo) {
        data.append('photo', photo);
      }
      
      const res = await api.post('/assets', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      alert(`Asset registered successfully! Tag: ${res.data.data.assetTag}`);
      onSuccess();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to register asset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto overflow-y-auto h-full">
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Register New Asset</h2>
        <p className="text-muted-foreground mt-1 text-sm">Enter the details below to add a new asset to the registry. The Asset Tag will be auto-generated.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Asset Name *</label>
            <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. MacBook Pro 16" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Category *</label>
            <Select required value={formData.categoryId} onValueChange={v => setFormData({ ...formData, categoryId: v })}>
              <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Serial Number</label>
            <Input value={formData.serialNumber} onChange={e => setFormData({ ...formData, serialNumber: e.target.value })} placeholder="Manufacturer SN" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Condition</label>
            <Select value={formData.condition} onValueChange={v => setFormData({ ...formData, condition: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="New">New</SelectItem>
                <SelectItem value="Good">Good</SelectItem>
                <SelectItem value="Fair">Fair</SelectItem>
                <SelectItem value="Poor">Poor</SelectItem>
                <SelectItem value="Damaged">Damaged</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Acquisition Cost ($)</label>
            <Input type="number" step="0.01" min="0" value={formData.acquisitionCost} onChange={e => setFormData({ ...formData, acquisitionCost: e.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Location</label>
            <Input value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="e.g. Server Room A" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Photo</label>
            <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center bg-muted/20 hover:bg-muted/40 transition-colors">
              <Input type="file" accept="image/*" className="max-w-xs" onChange={e => setPhoto(e.target.files[0])} />
            </div>
          </div>
        </div>

        <div className="pt-6 border-t flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onSuccess}>Cancel</Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Registering...' : 'Register Asset'}
          </Button>
        </div>
      </form>
    </div>
  );
}
