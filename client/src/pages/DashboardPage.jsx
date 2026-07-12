import { BarChart3, Package, Users, TrendingUp } from 'lucide-react';

const stats = [
  { label: 'Total Assets', value: '—', icon: Package, color: 'bg-blue-500/10 text-blue-600' },
  { label: 'Active Users', value: '—', icon: Users, color: 'bg-emerald-500/10 text-emerald-600' },
  { label: 'Allocations', value: '—', icon: TrendingUp, color: 'bg-amber-500/10 text-amber-600' },
  { label: 'Pending Requests', value: '—', icon: BarChart3, color: 'bg-purple-500/10 text-purple-600' },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your asset management system.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
        <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p className="text-lg font-medium">Dashboard widgets will be populated in Round 2+</p>
        <p className="text-sm mt-1">Connect your data sources to see real-time statistics here.</p>
      </div>
    </div>
  );
}
