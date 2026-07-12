import { ScrollText } from 'lucide-react';

export default function ActivityLogsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Activity Logs</h1>
        <p className="text-muted-foreground mt-1">View a complete audit trail of all system actions.</p>
      </div>
      <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
        <ScrollText className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p className="text-lg font-medium">Coming in Round 2+</p>
        <p className="text-sm mt-1">This feature will be built in a future round.</p>
      </div>
    </div>
  );
}
