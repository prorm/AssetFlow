import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Bell, ScrollText, Check, CheckCheck, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';

export default function ActivityLogsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(user?.role === 'Admin' ? 'activity' : 'notifications');
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters for activity logs
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (activeTab === 'notifications') fetchNotifications();
    if (activeTab === 'activity') fetchLogs();
  }, [activeTab]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.data);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (entityTypeFilter) params.entityType = entityTypeFilter;
      const { data } = await api.get('/activity-logs', { params });
      setLogs(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const typeIcon = (type) => {
    const colors = {
      allocation: 'bg-blue-500/10 text-blue-600',
      transfer: 'bg-purple-500/10 text-purple-600',
      booking: 'bg-emerald-500/10 text-emerald-600',
      maintenance: 'bg-amber-500/10 text-amber-600',
      audit: 'bg-red-500/10 text-red-600',
    };
    return colors[type] || 'bg-muted text-muted-foreground';
  };

  const filteredLogs = searchQuery
    ? logs.filter(
        (l) =>
          l.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.entityType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.userId?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : logs;

  const entityTypes = ['Allocation', 'TransferRequest', 'Booking', 'MaintenanceRequest', 'AuditCycle', 'Department', 'AssetCategory', 'User', 'Asset'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Activity & Notifications</h1>
        <p className="text-muted-foreground mt-1">View notifications and a complete audit trail of all system actions.</p>
      </div>

      <div className="flex gap-2">
        <Button
          variant={activeTab === 'notifications' ? 'default' : 'secondary'}
          onClick={() => setActiveTab('notifications')}
        >
          <Bell className="w-4 h-4 mr-2" />
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
        {user?.role === 'Admin' && (
          <Button
            variant={activeTab === 'activity' ? 'default' : 'secondary'}
            onClick={() => setActiveTab('activity')}
          >
            <ScrollText className="w-4 h-4 mr-2" />Activity Log
          </Button>
        )}
      </div>

      {/* ─── NOTIFICATIONS TAB ─── */}
      {activeTab === 'notifications' && (
        <div className="space-y-4">
          {notifications.length > 0 && unreadCount > 0 && (
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={markAllRead}>
                <CheckCheck className="w-4 h-4 mr-1" /> Mark All Read
              </Button>
            </div>
          )}

          {notifications.length === 0 && !loading ? (
            <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No notifications yet</p>
              <p className="text-sm mt-1">You'll see notifications here when actions are taken on your assets.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => (
                <div
                  key={n._id}
                  className={`border rounded-lg p-4 flex items-start gap-4 transition-colors ${
                    n.read ? 'bg-card opacity-70' : 'bg-card border-primary/20 shadow-sm'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${typeIcon(n.type)}`}>
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${n.read ? '' : 'font-medium'}`}>{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(n.createdAt), 'MMM d, yyyy h:mm a')}
                      <Badge variant="outline" className="ml-2 text-xs">{n.type}</Badge>
                    </p>
                  </div>
                  {!n.read && (
                    <Button size="sm" variant="ghost" className="flex-shrink-0" onClick={() => markAsRead(n._id)}>
                      <Check className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── ACTIVITY LOG TAB ─── */}
      {activeTab === 'activity' && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search logs..."
                className="w-full h-10 rounded-md border border-input bg-background pl-9 pr-3 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm min-w-[180px]"
              value={entityTypeFilter}
              onChange={(e) => { setEntityTypeFilter(e.target.value); setTimeout(fetchLogs, 0); }}
            >
              <option value="">All Entity Types</option>
              {entityTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <Button variant="outline" onClick={fetchLogs}>
              <Filter className="w-4 h-4 mr-1" /> Apply
            </Button>
          </div>

          {filteredLogs.length === 0 && !loading ? (
            <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
              <ScrollText className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No activity logs found</p>
              <p className="text-sm mt-1">Activity will appear here as actions are performed in the system.</p>
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="p-3 font-medium">Timestamp</th>
                    <th className="p-3 font-medium">User</th>
                    <th className="p-3 font-medium">Action</th>
                    <th className="p-3 font-medium">Entity Type</th>
                    <th className="p-3 font-medium">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-muted/30">
                      <td className="p-3 whitespace-nowrap">
                        {format(new Date(log.timestamp), 'MMM d, yyyy h:mm:ss a')}
                      </td>
                      <td className="p-3">{log.userId?.name || 'System'}</td>
                      <td className="p-3 font-medium">{log.action}</td>
                      <td className="p-3">
                        <Badge variant="outline">{log.entityType}</Badge>
                      </td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{log.ipAddress || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
