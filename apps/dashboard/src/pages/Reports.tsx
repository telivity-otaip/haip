import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Percent, DollarSign, TrendingUp } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { format, subDays } from 'date-fns';
import { api } from '../lib/api';
import { useProperty } from '../context/PropertyContext';
import KpiCard from '../components/ui/KpiCard';

type ReportType = 'financial-summary' | 'occupancy' | 'daily-revenue' | 'occupancy-trend';

const PIE_COLORS = ['#06bdb4', '#00a692', '#f2641b', '#eec517', '#bbbbc4', '#016491'];

export default function Reports() {
  const { propertyId } = useProperty();
  const [report, setReport] = useState<ReportType>('financial-summary');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data } = useQuery({
    queryKey: ['reports', report, propertyId, report === 'occupancy-trend' ? startDate : date, report === 'occupancy-trend' ? endDate : null],
    queryFn: () => {
      const params: Record<string, string> = { propertyId: propertyId! };
      if (report === 'occupancy-trend') {
        params.startDate = startDate;
        params.endDate = endDate;
      } else {
        params.date = date;
      }
      return api.get(`/v1/reports/${report}`, { params }).then((r) => r.data);
    },
    enabled: !!propertyId,
  });

  const reportData = data?.data ?? data ?? {};

  if (!propertyId) {
    return <div className="flex items-center justify-center h-64 text-telivity-mid-grey">Select a property</div>;
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 size={24} className="text-telivity-teal" />
        <h1 className="text-2xl font-semibold text-telivity-navy">Reports</h1>
      </div>

      {/* Report Selector + Date */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-telivity-mid-grey mb-1">Report</label>
          <select value={report} onChange={(e) => setReport(e.target.value as ReportType)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal">
            <option value="financial-summary">Financial Summary</option>
            <option value="occupancy">Occupancy</option>
            <option value="daily-revenue">Daily Revenue</option>
            <option value="occupancy-trend">Occupancy Trend</option>
          </select>
        </div>
        {report !== 'occupancy-trend' ? (
          <div>
            <label className="block text-xs font-medium text-telivity-mid-grey mb-1">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal" />
          </div>
        ) : (
          <>
            <div>
              <label className="block text-xs font-medium text-telivity-mid-grey mb-1">From</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal" />
            </div>
            <div>
              <label className="block text-xs font-medium text-telivity-mid-grey mb-1">To</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal" />
            </div>
          </>
        )}
      </div>

      {/* Financial Summary */}
      {report === 'financial-summary' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KpiCard title="ADR" value={reportData.adr != null ? `$${Number(reportData.adr).toFixed(2)}` : '—'} icon={DollarSign} />
            <KpiCard title="RevPAR" value={reportData.revpar != null ? `$${Number(reportData.revpar).toFixed(2)}` : '—'} icon={TrendingUp} />
            <KpiCard title="Occupancy" value={reportData.occupancyRate != null ? `${Number(reportData.occupancyRate).toFixed(1)}%` : '—'} icon={Percent} />
          </div>
          {reportData.revenueBreakdown && (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h3 className="text-sm font-semibold text-telivity-navy mb-3">Revenue Breakdown</h3>
              <div className="space-y-2">
                {Object.entries(reportData.revenueBreakdown as Record<string, number>).map(([k, v]) => (
                  <div key={k} className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-sm text-telivity-slate capitalize">{k.replace(/_/g, ' ')}</span>
                    <span className="text-sm font-medium">${Number(v).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Occupancy */}
      {report === 'occupancy' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard title="Occupied" value={reportData.roomsOccupied ?? 0} icon={Percent} />
            <KpiCard title="Available" value={reportData.roomsAvailable ?? 0} icon={Percent} />
            <KpiCard title="OOO" value={reportData.roomsOutOfOrder ?? 0} icon={Percent} />
            <KpiCard title="Occupancy %" value={reportData.occupancyRate != null ? `${Number(reportData.occupancyRate).toFixed(1)}%` : '—'} icon={Percent} />
          </div>
          {reportData.byStatus && (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h3 className="text-sm font-semibold text-telivity-navy mb-3">Room Status Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={Object.entries(reportData.byStatus as Record<string, number>).map(([k, v]) => ({ name: k.replace(/_/g, ' '), value: v }))} cx="50%" cy="50%" innerRadius={60} outerRadius={95} dataKey="value" nameKey="name" paddingAngle={2}>
                    {Object.keys(reportData.byStatus as Record<string, number>).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip /><Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Daily Revenue */}
      {report === 'daily-revenue' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KpiCard title="Room Revenue" value={reportData.roomRevenue != null ? `$${Number(reportData.roomRevenue).toFixed(2)}` : '—'} icon={DollarSign} />
            <KpiCard title="Other Revenue" value={reportData.otherRevenue != null ? `$${Number(reportData.otherRevenue).toFixed(2)}` : '—'} icon={DollarSign} />
            <KpiCard title="Total Revenue" value={reportData.totalRevenue != null ? `$${Number(reportData.totalRevenue).toFixed(2)}` : '—'} icon={DollarSign} />
          </div>
          {reportData.byMethod && (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h3 className="text-sm font-semibold text-telivity-navy mb-3">Revenue by Payment Method</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={Object.entries(reportData.byMethod as Record<string, number>).map(([k, v]) => ({ method: k, amount: v }))}>
                  <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="method" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip />
                  <Bar dataKey="amount" fill="#06bdb4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Occupancy Trend */}
      {report === 'occupancy-trend' && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-telivity-navy mb-3">Occupancy Trend</h3>
          {Array.isArray(reportData) || reportData.trend ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={reportData.trend ?? reportData}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 12 }} domain={[0, 100]} /><Tooltip />
                <Line type="monotone" dataKey="occupancyRate" stroke="#06bdb4" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-telivity-mid-grey">No trend data available</p>
          )}
        </div>
      )}
    </div>
  );
}
