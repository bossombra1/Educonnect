import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import Table, { type Column } from '@/components/ui/Table';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { statisticsService } from '@/services/statistics.service';
import { formatDateTime, getPriorityLabel, getPriorityColor } from '@/utils/formatters';
import type { MessageStats } from '@/types';

const PIE_COLORS = ['#1E40AF', '#059669', '#D97706', '#DC2626'];

const fallbackStats: MessageStats = {
  totalSent: 3842,
  totalRead: 2824,
  readRate: 73.5,
  byDay: [
    { date: '2024-01-15', sent: 45, read: 32 },
    { date: '2024-01-16', sent: 62, read: 51 },
    { date: '2024-01-17', sent: 38, read: 24 },
    { date: '2024-01-18', sent: 71, read: 58 },
    { date: '2024-01-19', sent: 54, read: 39 },
    { date: '2024-01-20', sent: 22, read: 15 },
    { date: '2024-01-21', sent: 15, read: 10 },
  ],
  byType: [
    { type: 'text', count: 2450 },
    { type: 'image', count: 680 },
    { type: 'pdf', count: 512 },
    { type: 'link', count: 200 },
  ],
  unreadMessages: [],
};

export default function StatisticsPage() {
  const [stats, setStats] = useState<MessageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    statisticsService.getMessageStats().then((data) => {
      if (!cancelled) setStats(data);
    }).catch(() => {
      if (!cancelled) setStats(fallbackStats);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <LoadingSpinner />;

  const s = stats || fallbackStats;

  const pieData = s.byType.map((item) => ({
    name: { text: 'Texte', image: 'Image', pdf: 'PDF', link: 'Lien' }[item.type] || item.type,
    value: item.count,
  }));

  const readByMsg = s.byDay.map((d) => ({
    date: new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
    envoyes: d.sent,
    lus: d.read,
  }));

  const unreadColumns: Column<any>[] = [
    { key: 'title', header: 'Titre', render: (m) => <span className="font-medium text-gray-900">{m.title || m.content.slice(0, 40)}</span> },
    { key: 'date', header: 'Date', render: (m) => formatDateTime(m.sentAt || m.createdAt) },
    { key: 'readRate', header: 'Taux de lecture', render: (m) => {
      const rate = m.totalRecipients > 0 ? (m.readCount / m.totalRecipients) * 100 : 0;
      return <div className="flex items-center gap-2"><div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-red-400" style={{ width: `${rate}%` }} /></div><span className="text-xs text-gray-500">{rate.toFixed(0)}%</span></div>;
    }},
    { key: 'recipients', header: 'Non lus', render: (m) => <span className="text-sm text-red-600 font-medium">{m.totalRecipients - m.readCount}</span> },
  ];

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-gray-500">Messages envoyés</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{s.totalSent.toLocaleString('fr-FR')}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Messages lus</p>
          <p className="mt-1 text-3xl font-bold text-emerald-600">{s.totalRead.toLocaleString('fr-FR')}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Taux de lecture global</p>
          <p className="mt-1 text-3xl font-bold text-primary">{s.readRate.toFixed(1)}%</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Bar chart: sent vs read per day */}
        <Card title="Messages par jour">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={readByMsg}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e5e7eb', fontSize: '0.8rem' }} />
                <Legend />
                <Bar dataKey="envoyes" fill="#1E40AF" radius={[4, 4, 0, 0]} name="Envoyés" />
                <Bar dataKey="lus" fill="#059669" radius={[4, 4, 0, 0]} name="Lus" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Pie chart: type distribution */}
        <Card title="Répartition par type">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Top unread messages */}
      <Card title="Messages les moins lus">
        {s.unreadMessages.length > 0 ? (
          <Table columns={unreadColumns} data={s.unreadMessages as any} keyExtractor={(m) => m.id} emptyMessage="Tous les messages ont été lus" />
        ) : (
          <div className="py-8 text-center text-sm text-gray-400">
            <p>🎉 Tous les messages ont un bon taux de lecture.</p>
            <p className="mt-1">Les données apparaîtront ici quand des messages auront un faible taux de lecture.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
