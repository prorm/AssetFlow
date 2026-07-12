import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { FileBarChart, Download, BarChart3, PieChart as PieIcon, Activity, Calendar, AlertTriangle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

const COLORS = ['#222c59', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

function exportCSV(data, filename) {
  if (!data || data.length === 0) return;
  const keys = Object.keys(data[0]).filter((k) => typeof data[0][k] !== 'object');
  const header = keys.join(',');
  const rows = data.map((row) => keys.map((k) => JSON.stringify(row[k] ?? '')).join(','));
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState('utilization');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const reports = [
    { key: 'utilization', label: 'Asset Utilization', icon: BarChart3, desc: 'Most-used vs idle assets' },
    { key: 'maintenance-frequency', label: 'Maintenance Frequency', icon: Activity, desc: 'By category' },
    { key: 'department-summary', label: 'Department Summary', icon: PieIcon, desc: 'Allocation breakdown' },
    { key: 'booking-heatmap', label: 'Booking Heatmap', icon: Calendar, desc: 'By hour/day' },
    { key: 'assets-due', label: 'Assets Due', icon: AlertTriangle, desc: 'Maintenance & retirement' },
  ];

  useEffect(() => {
    fetchReport(activeReport);
  }, [activeReport]);

  const fetchReport = async (key) => {
    setLoading(true);
    try {
      const { data: res } = await api.get(`/reports/${key}`);
      setData(res.data);
    } catch (err) {
      console.error(err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!data) return;
    let exportData = Array.isArray(data) ? data : [];
    if (activeReport === 'utilization') {
      exportData = data.map((d) => ({
        Asset: d.asset?.name,
        Tag: d.asset?.assetTag,
        Allocations: d.allocationCount,
        Bookings: d.bookingCount,
        TotalUsage: d.totalUsage,
      }));
    } else if (activeReport === 'maintenance-frequency') {
      exportData = data.map((d) => ({
        Category: d.categoryName || 'Uncategorized',
        Total: d.count,
        Critical: d.critical,
        High: d.high,
        Medium: d.medium,
        Low: d.low,
      }));
    } else if (activeReport === 'department-summary') {
      exportData = data.map((d) => ({
        Department: d.department,
        TotalAllocations: d.totalAllocations,
        Active: d.active,
        Returned: d.returned,
      }));
    } else if (activeReport === 'booking-heatmap') {
      exportData = data.map((d) => ({
        Day: d.day,
        Hour: d.hour,
        Bookings: d.count,
      }));
    } else if (activeReport === 'assets-due') {
      const poor = data.poorCondition || [];
      const maint = data.underMaintenance || [];
      exportData = [...poor, ...maint].map((d) => ({
        Asset: d.name,
        Tag: d.assetTag,
        Condition: d.condition,
        Status: d.status,
        Location: d.location,
      }));
    }
    exportCSV(exportData, `assetflow-${activeReport}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground mt-1">Generate reports and analytics across your asset portfolio.</p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={!data}>
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </div>

      {/* Report selector tabs */}
      <div className="flex gap-2 flex-wrap">
        {reports.map((r) => (
          <Button
            key={r.key}
            variant={activeReport === r.key ? 'default' : 'secondary'}
            onClick={() => setActiveReport(r.key)}
            className="gap-2"
          >
            <r.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{r.label}</span>
          </Button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center p-12">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {/* ─── UTILIZATION CHART ─── */}
      {!loading && activeReport === 'utilization' && data && (
        <div className="space-y-4">
          <div className="border rounded-lg p-5 bg-card">
            <h3 className="font-semibold mb-4">Asset Utilization — Most Used</h3>
            {data.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data.slice(0, 15).map((d) => ({
                  name: d.asset?.assetTag || 'N/A',
                  Allocations: d.allocationCount,
                  Bookings: d.bookingCount,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #e5e7eb)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--border, #e5e7eb)' }} />
                  <Legend />
                  <Bar dataKey="Allocations" fill="#222c59" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Bookings" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">No usage data available yet.</p>
            )}
          </div>
        </div>
      )}

      {/* ─── MAINTENANCE FREQUENCY ─── */}
      {!loading && activeReport === 'maintenance-frequency' && data && (
        <div className="border rounded-lg p-5 bg-card">
          <h3 className="font-semibold mb-4">Maintenance Requests by Category</h3>
          {data.length > 0 ? (
            <div className="grid lg:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={data.map((d) => ({ name: d.categoryName || 'Uncategorized', value: d.count }))}
                    cx="50%" cy="50%" outerRadius={120} innerRadius={60}
                    paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}
                  >
                    {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {data.map((d, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{d.categoryName || 'Uncategorized'}</p>
                      <p className="text-xs text-muted-foreground">{d.count} total requests</p>
                    </div>
                    <div className="flex gap-1">
                      {d.critical > 0 && <Badge variant="destructive" className="text-xs">C:{d.critical}</Badge>}
                      {d.high > 0 && <Badge className="text-xs bg-amber-500">H:{d.high}</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No maintenance data available yet.</p>
          )}
        </div>
      )}

      {/* ─── DEPARTMENT SUMMARY ─── */}
      {!loading && activeReport === 'department-summary' && data && (
        <div className="border rounded-lg p-5 bg-card">
          <h3 className="font-semibold mb-4">Department-wise Allocation Summary</h3>
          {data.length > 0 ? (
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={data.map((d) => ({
                  name: d.department || 'Direct',
                  Active: d.active + (d.userActive || 0),
                  Returned: d.returned || 0,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #e5e7eb)" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip contentStyle={{ borderRadius: 8 }} />
                  <Legend />
                  <Bar dataKey="Active" fill="#222c59" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Returned" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No department allocation data available yet.</p>
          )}
        </div>
      )}

      {/* ─── BOOKING HEATMAP ─── */}
      {!loading && activeReport === 'booking-heatmap' && data && (
        <div className="border rounded-lg p-5 bg-card">
          <h3 className="font-semibold mb-4">Booking Heatmap (Day × Hour)</h3>
          {data.length > 0 ? (
            <div className="overflow-x-auto">
              <div className="grid grid-cols-[auto_repeat(24,1fr)] gap-1 min-w-[700px]">
                <div className="text-xs font-medium text-muted-foreground p-1" />
                {Array.from({ length: 24 }, (_, i) => (
                  <div key={i} className="text-xs text-center text-muted-foreground p-1">{i}h</div>
                ))}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, di) => (
                  <>
                    <div key={day} className="text-xs font-medium text-muted-foreground p-1 flex items-center">{day}</div>
                    {Array.from({ length: 24 }, (_, hi) => {
                      const cell = data.find((d) => d.dayIndex === di + 1 && d.hour === hi);
                      const count = cell?.count || 0;
                      const max = Math.max(...data.map((d) => d.count), 1);
                      const opacity = count > 0 ? 0.2 + (count / max) * 0.8 : 0;
                      return (
                        <div
                          key={`${di}-${hi}`}
                          title={`${day} ${hi}:00 — ${count} bookings`}
                          className="aspect-square rounded-sm border"
                          style={{
                            backgroundColor: count > 0 ? `rgba(34, 44, 89, ${opacity})` : 'transparent',
                          }}
                        />
                      );
                    })}
                  </>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No booking data available yet.</p>
          )}
        </div>
      )}

      {/* ─── ASSETS DUE ─── */}
      {!loading && activeReport === 'assets-due' && data && (
        <div className="space-y-4">
          <div className="border rounded-lg p-5 bg-card">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Assets in Poor/Damaged Condition
            </h3>
            {data.poorCondition?.length > 0 ? (
              <div className="border rounded-md">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="p-3 font-medium">Asset</th>
                      <th className="p-3 font-medium">Tag</th>
                      <th className="p-3 font-medium">Category</th>
                      <th className="p-3 font-medium">Condition</th>
                      <th className="p-3 font-medium">Status</th>
                      <th className="p-3 font-medium">Location</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.poorCondition.map((a) => (
                      <tr key={a._id}>
                        <td className="p-3 font-medium">{a.name}</td>
                        <td className="p-3 font-mono text-xs">{a.assetTag}</td>
                        <td className="p-3">{a.categoryId?.name || '—'}</td>
                        <td className="p-3"><Badge variant={a.condition === 'Damaged' ? 'destructive' : 'secondary'}>{a.condition}</Badge></td>
                        <td className="p-3"><Badge variant="outline">{a.status}</Badge></td>
                        <td className="p-3">{a.location || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No assets in poor condition.</p>
            )}
          </div>

          <div className="border rounded-lg p-5 bg-card">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Assets Currently Under Maintenance
            </h3>
            {data.underMaintenance?.length > 0 ? (
              <div className="border rounded-md">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="p-3 font-medium">Asset</th>
                      <th className="p-3 font-medium">Tag</th>
                      <th className="p-3 font-medium">Category</th>
                      <th className="p-3 font-medium">Location</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.underMaintenance.map((a) => (
                      <tr key={a._id}>
                        <td className="p-3 font-medium">{a.name}</td>
                        <td className="p-3 font-mono text-xs">{a.assetTag}</td>
                        <td className="p-3">{a.categoryId?.name || '—'}</td>
                        <td className="p-3">{a.location || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No assets currently under maintenance.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
