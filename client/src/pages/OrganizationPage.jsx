import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, Pencil, ShieldAlert } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function OrganizationPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('departments');
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (activeTab === 'departments') fetchDepartments();
    if (activeTab === 'categories') fetchCategories();
    if (activeTab === 'employees') {
      fetchUsers();
      fetchDepartments();
    }
  }, [activeTab]);

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/departments');
      setDepartments(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  if (user?.role !== 'Admin') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="text-2xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground">You must be an Admin to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Organization</h1>
      </div>

      <div className="border-b border-border">
        <nav className="flex space-x-8" aria-label="Tabs">
          {['departments', 'categories', 'employees'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      <div className="bg-card rounded-xl border shadow-sm">
        {activeTab === 'departments' && (
          <DepartmentsTab
            departments={departments}
            refresh={fetchDepartments}
          />
        )}
        {activeTab === 'categories' && (
          <CategoriesTab
            categories={categories}
            refresh={fetchCategories}
          />
        )}
        {activeTab === 'employees' && (
          <EmployeesTab
            users={users}
            departments={departments}
            refresh={fetchUsers}
          />
        )}
      </div>
    </div>
  );
}

function DepartmentsTab({ departments, refresh }) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', headUserId: '', parentDepartmentId: '', status: 'Active' });
  const [editId, setEditId] = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    api.get('/users').then(res => setUsers(res.data.data)).catch(console.error);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (!payload.headUserId || payload.headUserId === 'none') delete payload.headUserId;
      if (!payload.parentDepartmentId || payload.parentDepartmentId === 'none') delete payload.parentDepartmentId;

      if (editId) {
        await api.put(`/departments/${editId}`, payload);
      } else {
        await api.post('/departments', payload);
      }
      setIsOpen(false);
      setFormData({ name: '', headUserId: '', parentDepartmentId: '', status: 'Active' });
      setEditId(null);
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error saving department');
    }
  };

  const openEdit = (dept) => {
    setFormData({
      name: dept.name,
      headUserId: dept.headUserId?._id || '',
      parentDepartmentId: dept.parentDepartmentId?._id || '',
      status: dept.status
    });
    setEditId(dept._id);
    setIsOpen(true);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Departments</h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditId(null); setFormData({ name: '', headUserId: '', parentDepartmentId: '', status: 'Active' }); }}>
              <Plus className="w-4 h-4 mr-2" /> Add Department
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? 'Edit Department' : 'New Department'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Name</label>
                <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Department Head</label>
                <Select value={formData.headUserId} onValueChange={v => setFormData({ ...formData, headUserId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select head (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {users.map(u => <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Parent Department</label>
                <Select value={formData.parentDepartmentId} onValueChange={v => setFormData({ ...formData, parentDepartmentId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select parent (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {departments.filter(d => d._id !== editId).map(d => <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {editId && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Status</label>
                  <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button type="submit" className="w-full">Save</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-y">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Head</th>
              <th className="px-4 py-3 font-medium">Parent</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y border-b">
            {departments.map((dept) => (
              <tr key={dept._id} className="hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3 font-medium">{dept.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{dept.headUserId?.name || '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{dept.parentDepartmentId?.name || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${dept.status === 'Active' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                    {dept.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(dept)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {departments.length === 0 && (
              <tr><td colSpan="5" className="text-center py-6 text-muted-foreground">No departments found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CategoriesTab({ categories, refresh }) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', customFields: [] });
  const [editId, setEditId] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await api.put(`/categories/${editId}`, formData);
      } else {
        await api.post('/categories', formData);
      }
      setIsOpen(false);
      setFormData({ name: '', customFields: [] });
      setEditId(null);
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error saving category');
    }
  };

  const openEdit = (cat) => {
    setFormData({ name: cat.name, customFields: [...cat.customFields] });
    setEditId(cat._id);
    setIsOpen(true);
  };

  const addCustomField = () => {
    setFormData({
      ...formData,
      customFields: [...formData.customFields, { key: '', label: '', type: 'Text' }]
    });
  };

  const removeCustomField = (index) => {
    const newFields = [...formData.customFields];
    newFields.splice(index, 1);
    setFormData({ ...formData, customFields: newFields });
  };

  const updateCustomField = (index, field, value) => {
    const newFields = [...formData.customFields];
    newFields[index][field] = value;
    if (field === 'label') {
      newFields[index].key = value.toLowerCase().replace(/[^a-z0-9]/g, '_');
    }
    setFormData({ ...formData, customFields: newFields });
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Asset Categories</h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditId(null); setFormData({ name: '', customFields: [] }); }}>
              <Plus className="w-4 h-4 mr-2" /> Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editId ? 'Edit Category' : 'New Category'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Name</label>
                <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Custom Fields</label>
                  <Button type="button" variant="outline" size="sm" onClick={addCustomField}>
                    <Plus className="w-4 h-4 mr-2" /> Add Field
                  </Button>
                </div>
                {formData.customFields.map((cf, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-muted/30 p-2 rounded-lg border">
                    <div className="flex-1">
                      <Input placeholder="Label (e.g. Warranty Period)" value={cf.label} onChange={e => updateCustomField(idx, 'label', e.target.value)} required />
                    </div>
                    <div className="flex-1">
                      <Input placeholder="Key" value={cf.key} disabled className="bg-muted/50" />
                    </div>
                    <div className="w-32">
                      <Select value={cf.type} onValueChange={v => updateCustomField(idx, 'type', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Text">Text</SelectItem>
                          <SelectItem value="Number">Number</SelectItem>
                          <SelectItem value="Date">Date</SelectItem>
                          <SelectItem value="Boolean">Boolean</SelectItem>
                          <SelectItem value="Select">Select</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => removeCustomField(idx)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button type="submit" className="w-full">Save</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-y">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Custom Fields</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y border-b">
            {categories.map((cat) => (
              <tr key={cat._id} className="hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3 font-medium">{cat.name}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                    {cat.customFields.length} fields
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(cat)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr><td colSpan="3" className="text-center py-6 text-muted-foreground">No categories found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmployeesTab({ users, departments, refresh }) {
  const [filterDept, setFilterDept] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [promoteId, setPromoteId] = useState(null);
  const [newRole, setNewRole] = useState('DeptHead');
  const { user: currentUser } = useAuth();

  const handlePromote = async () => {
    try {
      await api.patch(`/users/${promoteId}/role`, { role: newRole });
      setPromoteId(null);
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error promoting user');
    }
  };

  const filteredUsers = users.filter(u => {
    if (filterDept !== 'all' && u.department?._id !== filterDept) return false;
    if (filterRole !== 'all' && u.role !== filterRole) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <h2 className="text-xl font-semibold">Employee Directory</h2>
        <div className="flex gap-2">
          <Select value={filterDept} onValueChange={setFilterDept}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map(d => <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="Employee">Employee</SelectItem>
              <SelectItem value="DeptHead">Dept Head</SelectItem>
              <SelectItem value="AssetManager">Asset Manager</SelectItem>
              <SelectItem value="Admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Department</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredUsers.map((u) => (
              <tr key={u._id} className="hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.department?.name || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    u.role === 'Admin' ? 'bg-destructive/10 text-destructive' :
                    u.role === 'AssetManager' ? 'bg-primary/10 text-primary' :
                    u.role === 'DeptHead' ? 'bg-warning/10 text-warning-foreground' :
                    'bg-secondary text-secondary-foreground'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.status === 'Active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                    {u.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {u.role !== 'Admin' && u._id !== currentUser._id && (
                    <Dialog open={promoteId === u._id} onOpenChange={(open) => !open && setPromoteId(null)}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setPromoteId(u._id)}>Promote</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Promote {u.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <p className="text-sm text-muted-foreground">Select a new role for this user.</p>
                          <Select value={newRole} onValueChange={setNewRole}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="DeptHead">Department Head</SelectItem>
                              <SelectItem value="AssetManager">Asset Manager</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button onClick={handlePromote} className="w-full">Confirm Promotion</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr><td colSpan="6" className="text-center py-6 text-muted-foreground">No employees found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
