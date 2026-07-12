import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Package, Users, ArrowLeftRight, CalendarDays, Wrench,
  AlertTriangle, Undo2, CheckCircle2, Plus, BookOpen, ChevronRight, Sparkles
} from 'lucide-react';
import { format } from 'date-fns';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [askQuery, setAskQuery] = useState('');
  const [askLoading, setAskLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [overdue, setOverdue] = useState(null);
  const [upcoming, setUpcoming] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const [statsRes, overdueRes, upcomingRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/overdue'),
        api.get('/dashboard/upcoming'),
      ]);
      setStats(statsRes.data.data);
      setOverdue(overdueRes.data.data);
      setUpcoming(upcomingRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const kpiCards = stats
    ? [
        { label: 'Assets Available', value: stats.availableCount, icon: Package, color: 'bg-emerald-500/10 text-emerald-600', border: 'border-emerald-500/20' },
        { label: 'Assets Allocated', value: stats.allocatedCount, icon: Users, color: 'bg-primary/10 text-primary', border: 'border-primary/20' },
        { label: 'Maintenance Active', value: stats.maintenanceTodayCount, icon: Wrench, color: 'bg-amber-500/10 text-amber-600', border: 'border-amber-500/20' },
        { label: 'Active Bookings', value: stats.activeBookingsCount, icon: CalendarDays, color: 'bg-purple-500/10 text-purple-600', border: 'border-purple-500/20' },
        { label: 'Pending Transfers', value: stats.pendingTransfersCount, icon: ArrowLeftRight, color: 'bg-indigo-500/10 text-indigo-600', border: 'border-indigo-500/20' },
        { label: 'Upcoming Returns', value: stats.upcomingReturnsCount, icon: Undo2, color: 'bg-cyan-500/10 text-cyan-600', border: 'border-cyan-500/20' },
      ]
    : [];

  const canRegisterAsset = ['AssetManager', 'Admin'].includes(user?.role);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {user?.name}. Here's your asset management overview.
          </p>
        </div>
        <Badge variant="outline" className="text-xs">{user?.role}</Badge>
      </div>

      {/* Ask AssetFlow Command Bar */}
      <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 p-1 rounded-2xl shadow-sm border border-indigo-500/20">
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!askQuery.trim()) return;
          setAskLoading(true);
          try {
            const res = await api.post('/ai/smart-search', { query: askQuery });
            const filters = res.data.data;
            const params = new URLSearchParams();
            if (filters.categoryId) params.append('categoryId', filters.categoryId);
            if (filters.status) params.append('status', filters.status);
            if (filters.search) params.append('search', filters.search);
            if (filters.departmentId) params.append('departmentId', filters.departmentId);
            if (filters.overdue) params.append('overdue', 'true');
            if (filters.condition) params.append('condition', filters.condition);
            if (filters.location) params.append('search', filters.location);
            
            navigate(`/assets?${params.toString()}`);
          } catch (err) {
            toast.error('Could not process request');
          } finally {
            setAskLoading(false);
            setAskQuery('');
          }
        }} className="relative flex items-center bg-card rounded-xl overflow-hidden">
          <div className="pl-4 text-indigo-500">
            <Sparkles className="w-5 h-5" />
          </div>
          <input
            type="text"
            placeholder='Ask AssetFlow (e.g. "show overdue laptops in engineering")'
            className="w-full flex-1 h-12 bg-transparent border-none focus:ring-0 px-4 text-sm outline-none"
            value={askQuery}
            onChange={(e) => setAskQuery(e.target.value)}
            disabled={askLoading}
          />
          <Button type="submit" disabled={askLoading} className="h-full rounded-none px-6 bg-indigo-600 hover:bg-indigo-700 text-primary-foreground">
            {askLoading ? 'Thinking...' : 'Search'}
          </Button>
        </form>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-5 animate-pulse">
              <div className="h-4 w-20 bg-muted rounded mb-3" />
              <div className="h-8 w-12 bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {kpiCards.map((kpi) => (
            <div
              key={kpi.label}
              className={`rounded-xl border ${kpi.border} bg-card p-5 hover:shadow-md transition-shadow`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${kpi.color}`}>
                  <kpi.icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex gap-3 flex-wrap">
        {canRegisterAsset && (
          <Link to="/assets">
            <Button className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-primary-foreground shadow-md">
              <Plus className="w-4 h-4" /> Register Asset
            </Button>
          </Link>
        )}
        <Link to="/bookings">
          <Button variant="outline" className="gap-2">
            <BookOpen className="w-4 h-4" /> Book Resource
          </Button>
        </Link>
        <Link to="/maintenance">
          <Button variant="outline" className="gap-2">
            <Wrench className="w-4 h-4" /> Raise Maintenance
          </Button>
        </Link>
      </div>

      {/* Overdue & Upcoming sections */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* OVERDUE — visually separated with red styling */}
        <div className="border border-red-200 dark:border-red-900/50 rounded-xl overflow-hidden">
          <div className="bg-red-50 dark:bg-red-900/20 px-5 py-3 flex items-center gap-2 border-b border-red-200 dark:border-red-900/50">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="font-semibold text-red-700 dark:text-red-400">Overdue</h3>
            <Badge variant="destructive" className="ml-auto">
              {overdue?.overdueAllocations?.length || 0}
            </Badge>
          </div>
          <div className="p-4 space-y-3 bg-card max-h-[420px] overflow-y-auto">
            {overdue?.overdueAllocations?.length > 0 ? (
              overdue.overdueAllocations.map((a) => (
                <div key={a._id} className="flex items-start gap-3 p-4 bg-red-50/50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/30">
                  <div className="w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-snug">{a.assetId?.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.assetId?.assetTag}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Held by <span className="font-medium text-foreground">{a.holderName}</span> • Due {format(new Date(a.expectedReturnDate), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <Badge variant="destructive" className="text-xs flex-shrink-0 whitespace-nowrap">
                    {Math.ceil((new Date() - new Date(a.expectedReturnDate)) / (1000 * 60 * 60 * 24))}d late
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No overdue items</p>
              </div>
            )}
          </div>
        </div>

        {/* UPCOMING returns */}
        <div className="border rounded-xl overflow-hidden">
          <div className="bg-muted/30 px-5 py-3 flex items-center gap-2 border-b">
            <Undo2 className="w-5 h-5 text-cyan-600" />
            <h3 className="font-semibold">Upcoming Returns</h3>
            <Badge variant="outline" className="ml-auto">
              {upcoming?.upcomingReturns?.length || 0}
            </Badge>
          </div>
          <div className="p-4 space-y-3 bg-card max-h-[420px] overflow-y-auto">
            {upcoming?.upcomingReturns?.length > 0 ? (
              upcoming.upcomingReturns.map((a) => (
                <div key={a._id} className="flex items-start gap-3 p-4 rounded-lg border hover:bg-muted/30 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-cyan-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Undo2 className="w-4 h-4 text-cyan-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-snug">{a.assetId?.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.assetId?.assetTag}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Held by <span className="font-medium text-foreground">{a.holderName}</span> • Due {format(new Date(a.expectedReturnDate), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No upcoming returns this week</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Total assets summary */}
      {stats && (
        <div className="text-xs text-muted-foreground text-center">
          Total assets in system: {stats.totalAssets}
        </div>
      )}
    </div>
  );
}
