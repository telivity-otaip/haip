import { useState } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Radio, Plus, ChevronLeft, RefreshCw, Zap } from 'lucide-react';
import { api } from '../lib/api';
import { useProperty } from '../context/PropertyContext';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';

interface Connection {
  id: string;
  channelCode: string;
  channelName?: string;
  status: string;
  syncDirection?: string;
  lastSyncAt?: string;
  config?: Record<string, unknown>;
}

// ---- Connection List ----
function ConnectionList() {
  const { propertyId } = useProperty();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [channelCode, setChannelCode] = useState('booking_com');
  const [channelName, setChannelName] = useState('');

  const { data } = useQuery({
    queryKey: ['channels', propertyId],
    queryFn: () => api.get('/v1/channels/connections', { params: { propertyId } }).then((r) => r.data),
    enabled: !!propertyId,
  });

  const connections: Connection[] = data?.data ?? data ?? [];

  const createMutation = useMutation({
    mutationFn: () => api.post('/v1/channels/connections', { propertyId, channelCode, channelName: channelName || channelCode, config: {} }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['channels'] }); setCreateOpen(false); },
  });

  if (!propertyId) return <div className="flex items-center justify-center h-64 text-telivity-mid-grey">Select a property</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Radio size={24} className="text-telivity-teal" />
        <h1 className="text-2xl font-semibold text-telivity-navy">Channels</h1>
        <div className="ml-auto flex gap-2">
          <button onClick={() => navigate('/channels/rate-parity')} className="border border-gray-200 text-telivity-slate rounded-lg px-4 py-2 text-sm font-semibold hover:bg-telivity-light-grey">Rate Parity</button>
          <button onClick={() => setCreateOpen(true)} className="flex items-center gap-2 bg-telivity-teal text-white rounded-lg px-4 py-2 text-sm font-semibold"><Plus size={16} /> Add Connection</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-telivity-teal/5 border-b border-gray-100">
              <th className="px-4 py-3 text-left text-xs font-semibold text-telivity-slate uppercase">Channel</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-telivity-slate uppercase">Code</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-telivity-slate uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-telivity-slate uppercase">Direction</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-telivity-slate uppercase">Last Sync</th>
            </tr>
          </thead>
          <tbody>
            {connections.map((c, i) => (
              <tr key={c.id} onClick={() => navigate(`/channels/${c.id}`)} className={`border-b border-gray-50 cursor-pointer hover:bg-telivity-light-grey/50 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                <td className="px-4 py-3 text-sm font-medium text-telivity-navy">{c.channelName ?? c.channelCode}</td>
                <td className="px-4 py-3 text-sm text-telivity-slate">{c.channelCode}</td>
                <td className="px-4 py-3"><StatusBadge status={c.status === 'active' ? 'success' : c.status} label={c.status} /></td>
                <td className="px-4 py-3 text-sm text-telivity-slate">{c.syncDirection ?? 'both'}</td>
                <td className="px-4 py-3 text-sm text-telivity-slate">{c.lastSyncAt ?? '—'}</td>
              </tr>
            ))}
            {connections.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-telivity-mid-grey">No channel connections</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add Channel Connection">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-telivity-mid-grey mb-1">Channel</label>
            <select value={channelCode} onChange={(e) => setChannelCode(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal">
              <option value="booking_com">Booking.com</option><option value="expedia">Expedia</option><option value="airbnb">Airbnb</option><option value="agoda">Agoda</option><option value="hrs">HRS</option><option value="direct">Direct Website</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-telivity-mid-grey mb-1">Display Name</label>
            <input type="text" value={channelName} onChange={(e) => setChannelName(e.target.value)} placeholder="Optional" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal" />
          </div>
          <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="w-full bg-telivity-teal text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50">Create Connection</button>
        </div>
      </Modal>
    </div>
  );
}

// ---- Connection Detail ----
function ConnectionDetail() {
  const { id } = useParams<{ id: string }>();
  const { propertyId } = useProperty();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['channels', id],
    queryFn: () => api.get(`/v1/channels/connections/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const conn: Connection | null = data?.data ?? data ?? null;

  const syncMutation = useMutation({
    mutationFn: (action: string) => api.post(`/v1/channels/push/${action}`, { propertyId, connectionId: id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['channels'] }),
  });

  const testMutation = useMutation({
    mutationFn: () => api.post(`/v1/channels/connections/${id}/test`),
  });

  if (!conn) return <div className="flex items-center justify-center h-64 text-telivity-mid-grey">Loading...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/channels')} className="p-1.5 rounded hover:bg-telivity-light-grey"><ChevronLeft size={20} /></button>
        <Radio size={24} className="text-telivity-teal" />
        <h1 className="text-2xl font-semibold text-telivity-navy">{conn.channelName ?? conn.channelCode}</h1>
        <StatusBadge status={conn.status === 'active' ? 'success' : conn.status} label={conn.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-telivity-navy">Connection Info</h2>
          <div className="grid grid-cols-2 gap-3">
            <div><p className="text-xs text-telivity-mid-grey">Channel Code</p><p className="text-sm font-medium">{conn.channelCode}</p></div>
            <div><p className="text-xs text-telivity-mid-grey">Direction</p><p className="text-sm font-medium">{conn.syncDirection ?? 'both'}</p></div>
            <div><p className="text-xs text-telivity-mid-grey">Last Sync</p><p className="text-sm font-medium">{conn.lastSyncAt ?? 'Never'}</p></div>
          </div>
          <button onClick={() => testMutation.mutate()} disabled={testMutation.isPending} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm font-semibold hover:bg-telivity-light-grey disabled:opacity-50">
            {testMutation.isPending ? 'Testing...' : 'Test Connection'}
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-sm font-semibold text-telivity-navy mb-4">Sync Actions</h2>
          <div className="space-y-2">
            {[
              { action: 'availability', label: 'Push Availability', icon: RefreshCw },
              { action: 'rates', label: 'Push Rates', icon: RefreshCw },
              { action: 'full', label: 'Push Full ARI', icon: Zap },
            ].map(({ action, label, icon: Icon }) => (
              <button
                key={action}
                onClick={() => syncMutation.mutate(action)}
                disabled={syncMutation.isPending}
                className="w-full flex items-center gap-2 border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-medium hover:border-telivity-teal hover:bg-telivity-teal/5 transition-colors disabled:opacity-50"
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Rate Parity ----
function RateParity() {
  const { propertyId } = useProperty();
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ['channels', 'rate-parity', propertyId],
    queryFn: () => api.get('/v1/channels/rate-parity', { params: { propertyId } }).then((r) => r.data),
    enabled: !!propertyId,
  });

  const parity = data?.data ?? data ?? [];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/channels')} className="p-1.5 rounded hover:bg-telivity-light-grey"><ChevronLeft size={20} /></button>
        <Radio size={24} className="text-telivity-teal" />
        <h1 className="text-2xl font-semibold text-telivity-navy">Rate Parity</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        {Array.isArray(parity) && parity.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-telivity-slate">Rate Plan</th>
                  {/* Dynamic channel columns would go here */}
                  <th className="px-4 py-3 text-right text-xs font-semibold text-telivity-slate">PMS Rate</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-telivity-slate">Status</th>
                </tr>
              </thead>
              <tbody>
                {(parity as { ratePlanName: string; pmsRate: number; inParity: boolean }[]).map((p, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-telivity-navy">{p.ratePlanName}</td>
                    <td className="px-4 py-3 text-sm text-right">${Number(p.pmsRate).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.inParity ? 'success' : 'warning'} label={p.inParity ? 'In Parity' : 'Violation'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-telivity-mid-grey text-center py-8">No rate parity data available</p>
        )}
      </div>
    </div>
  );
}

export default function Channels() {
  return (
    <Routes>
      <Route index element={<ConnectionList />} />
      <Route path="rate-parity" element={<RateParity />} />
      <Route path=":id" element={<ConnectionDetail />} />
    </Routes>
  );
}
