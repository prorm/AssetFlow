import { Package } from 'lucide-react';

export default function AssetRegistryPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Asset Registry</h1>
        <p className="text-muted-foreground mt-1">Browse, search, and manage all organizational assets.</p>
      </div>
      <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
        <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p className="text-lg font-medium">Coming in Round 2+</p>
        <p className="text-sm mt-1">This feature will be built in a future round.</p>
      </div>
    </div>
  );
}
