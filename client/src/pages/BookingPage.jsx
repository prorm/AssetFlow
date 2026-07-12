import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export default function BookingPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [assets, setAssets] = useState([]);
  const [assetBookings, setAssetBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [conflictInfo, setConflictInfo] = useState(null);
  
  const [formData, setFormData] = useState({
    assetId: '',
    startTime: '',
    endTime: ''
  });

  const [rescheduleModal, setRescheduleModal] = useState({ open: false, id: null, startTime: '', endTime: '' });

  useEffect(() => {
    fetchBookings();
    fetchAssets();
  }, []);

  useEffect(() => {
    if (formData.assetId) {
      fetchAssetBookings(formData.assetId);
    } else {
      setAssetBookings([]);
    }
  }, [formData.assetId]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/bookings');
      setBookings(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssets = async () => {
    try {
      const { data } = await api.get('/assets');
      setAssets(data.data.filter(a => a.isBookable));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAssetBookings = async (assetId) => {
    try {
      const { data } = await api.get(`/bookings?assetId=${assetId}`);
      setAssetBookings(data.data.filter(b => b.status !== 'Cancelled'));
    } catch (err) {
      console.error(err);
    }
  };

  const handleBook = async (e) => {
    e.preventDefault();
    setConflictInfo(null);
    try {
      await api.post('/bookings', formData);
      setFormData({ assetId: '', startTime: '', endTime: '' });
      fetchBookings();
      if (formData.assetId) fetchAssetBookings(formData.assetId);
    } catch (err) {
      if (err.response?.status === 409) {
        setConflictInfo(err.response.data.conflictingSlot);
      } else {
        alert(err.response?.data?.error || 'Error creating booking');
      }
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    try {
      await api.patch(`/bookings/${id}/cancel`);
      fetchBookings();
    } catch (err) {
      alert(err.response?.data?.error || 'Error cancelling booking');
    }
  };

  const handleReschedule = async () => {
    setConflictInfo(null);
    try {
      await api.patch(`/bookings/${rescheduleModal.id}/reschedule`, {
        startTime: rescheduleModal.startTime,
        endTime: rescheduleModal.endTime
      });
      setRescheduleModal({ open: false, id: null, startTime: '', endTime: '' });
      fetchBookings();
    } catch (err) {
      if (err.response?.status === 409) {
        setConflictInfo(err.response.data.conflictingSlot);
      } else {
        alert(err.response?.data?.error || 'Error rescheduling booking');
      }
    }
  };

  const canEdit = (booking) => {
    return user?._id === booking.bookedBy?._id || ['AssetManager', 'Admin'].includes(user?.role);
  };

  const statusVariant = (status) => {
    switch (status) {
      case 'Upcoming': return 'default';
      case 'Ongoing': return 'secondary';
      case 'Completed': return 'outline';
      case 'Cancelled': return 'destructive';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Resource Booking</h1>
        <p className="text-muted-foreground mt-1">Book shared assets like meeting rooms and equipment.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <div className="border rounded-md">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="p-3 font-medium">Asset</th>
                  <th className="p-3 font-medium">Booked By</th>
                  <th className="p-3 font-medium">Start</th>
                  <th className="p-3 font-medium">End</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {bookings.map(b => (
                  <tr key={b._id}>
                    <td className="p-3">{b.assetId?.assetTag} - {b.assetId?.name}</td>
                    <td className="p-3">{b.bookedBy?.name}</td>
                    <td className="p-3">{format(new Date(b.startTime), 'MMM d, yyyy h:mm a')}</td>
                    <td className="p-3">{format(new Date(b.endTime), 'MMM d, yyyy h:mm a')}</td>
                    <td className="p-3">
                      <Badge variant={statusVariant(b.status)}>{b.status}</Badge>
                    </td>
                    <td className="p-3 flex gap-2">
                      {b.status === 'Upcoming' && canEdit(b) && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => setRescheduleModal({
                            open: true,
                            id: b._id,
                            startTime: new Date(b.startTime).toISOString().slice(0, 16),
                            endTime: new Date(b.endTime).toISOString().slice(0, 16)
                          })}>
                            Reschedule
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleCancel(b._id)}>
                            Cancel
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {bookings.length === 0 && !loading && (
                  <tr><td colSpan="6" className="p-4 text-center text-muted-foreground">No bookings found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <form onSubmit={handleBook} className="border p-6 rounded-md space-y-4 bg-card">
            <h3 className="font-semibold text-lg">New Booking</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Asset</label>
              <select
                required
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.assetId}
                onChange={e => setFormData({ ...formData, assetId: e.target.value })}
              >
                <option value="">Select Bookable Asset...</option>
                {assets.map(a => (
                  <option key={a._id} value={a._id}>{a.assetTag} - {a.name}</option>
                ))}
              </select>
            </div>

            {formData.assetId && assetBookings.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                <h4 className="text-sm font-medium text-muted-foreground">Existing Bookings</h4>
                {assetBookings.map(b => (
                  <div key={b._id} className="text-xs p-2 rounded bg-muted/50 border flex justify-between items-center">
                    <span>{format(new Date(b.startTime), 'MMM d, h:mm a')} → {format(new Date(b.endTime), 'MMM d, h:mm a')}</span>
                    <Badge variant={statusVariant(b.status)}>{b.status}</Badge>
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Start Time</label>
              <input
                type="datetime-local"
                required
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.startTime}
                onChange={e => setFormData({ ...formData, startTime: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Time</label>
              <input
                type="datetime-local"
                required
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.endTime}
                onChange={e => setFormData({ ...formData, endTime: e.target.value })}
              />
            </div>
            <Button type="submit" className="w-full">Book Asset</Button>

            {conflictInfo && (
              <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4 mt-4">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-semibold">Booking Conflict</span>
                </div>
                <p className="mt-1 text-sm">Conflicts with: {format(new Date(conflictInfo.startTime), 'MMM d, h:mm a')} → {format(new Date(conflictInfo.endTime), 'MMM d, h:mm a')}</p>
                <p className="text-xs text-muted-foreground mt-1">Booked by {conflictInfo.bookedBy?.name}</p>
              </div>
            )}
          </form>
        </div>
      </div>

      <Dialog open={rescheduleModal.open} onOpenChange={(open) => {
        if (!open) {
          setRescheduleModal({ open: false, id: null, startTime: '', endTime: '' });
          setConflictInfo(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Booking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Time</label>
              <input
                type="datetime-local"
                required
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={rescheduleModal.startTime}
                onChange={e => setRescheduleModal({ ...rescheduleModal, startTime: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Time</label>
              <input
                type="datetime-local"
                required
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={rescheduleModal.endTime}
                onChange={e => setRescheduleModal({ ...rescheduleModal, endTime: e.target.value })}
              />
            </div>
            {conflictInfo && (
              <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-semibold">Booking Conflict</span>
                </div>
                <p className="mt-1 text-sm">Conflicts with: {format(new Date(conflictInfo.startTime), 'MMM d, h:mm a')} → {format(new Date(conflictInfo.endTime), 'MMM d, h:mm a')}</p>
                <p className="text-xs text-muted-foreground mt-1">Booked by {conflictInfo.bookedBy?.name}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setRescheduleModal({ open: false, id: null, startTime: '', endTime: '' });
              setConflictInfo(null);
            }}>Cancel</Button>
            <Button onClick={handleReschedule}>Confirm Reschedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
