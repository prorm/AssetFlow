import { CalendarDays } from 'lucide-react';

export default function BookingPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Resource Booking</h1>
        <p className="text-muted-foreground mt-1">Book shared assets like meeting rooms and equipment.</p>
      </div>
      <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
        <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p className="text-lg font-medium">Coming in Round 2+</p>
        <p className="text-sm mt-1">This feature will be built in a future round.</p>
      </div>
    </div>
  );
}
