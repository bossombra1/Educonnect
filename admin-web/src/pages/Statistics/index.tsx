import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import Table, { type Column } from '@/components/ui/Table';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { statisticsService } from '@/services/statistics.service';
import { formatDateTime } from '@/utils/formatters';
import type { MessageStats } from '@/types';

const PIE_COLORS = ['#1E40AF', '#059669', '#D97706', '#DC2626'];

export default function StatisticsPage() {
  const [stats, setStats] = useState<MessageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      setStats(await statisticsService.getMessageStats());
    } catch (err) {
      setStats(null);
      setError(err instanceof Error ? err.message : 'Impossible de charger les statistiques.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadStats(); }, []);

  if (loading) return <LoadingSpinner />;

  if (error || !stats) {
    return (
      <Card title="Statistiques">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-red-600">{error ?? 'Aucune donnée statistique disponible.'}</p>
          <button type="button" onClick={() => void loadStats()} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white">
            Réessayer
          </button>
        </div>
      </Card>
    );
  }

  const pieData = stats.byType.map((item) => ({
    name: { text: 'Texte', image: 'Image', pdf: 'PDF', link: 'Lien', circular: 'Circulaire' }[item.type] || item.type,
    value: item.count,
  }));

  const readByMsg = stats.byDay.map((d) => ({
    date: new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
    envoyes: d.sent,
    lus: d.read,
  }));

  const unreadColumns: Column<any>[] = [
    { key: 'title', header: 'Titre', render: (m) => <span className="font-medium text-gray-900">{m.title || m.content.slice(0, 40)}</span> },
    { key: 'date', header: 'Date', render: (m) => formatDateTime(m.sentAt || m.createdAt) },
    { key: 'readRate', header: 'Taux de lecture', render: (m) => {
      const total = Number(m.totalRecipients) || 0;
      const read = Number(m.readCount) || 0;
      const rate = total > 0 ? Math.min(100, (read / total) * 100) : 0;
      return <div className="flex items-center gap-2"><div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-red-400" style={{ width: `${rate}%` }} /></div><span className="text-xs text-gray-500">{rate.toFixed(0)}%</span></div>;
    }},
    { key: 'recipients', header: 'Non lus', render: (m) => <span className="text-sm font-medium text-red-600">{Math.max(0, (Number(m.totalRecipients) || 0) - (Number(m.readCount) || 0))}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card><p className="text-sm text-gray-500">Messages envoyés</p><p className="mt-1 text-3xl font-bold text-gray-900">{stats.totalSent.toLocaleString('fr-FR')}</p></Card>
        <Card><p className="text-sm text-gray-500">Messages lus</p><p className="mt-1 text-3xl font-bold text-emerald-600">{stats.totalRead.toLocaleString('fr-FR')}</p></Card>
        <Card><p className="text-sm text-gray-500">Taux de lecture global</p><p className="mt-1 text-3xl font-bold text-primary">{stats.readRate.toFixed(1)}%</p></Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Messages par jour">
          {readByMsg.length > 0 ? (
            <div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={readByMsg}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e5e7eb', fontSize: '0.8rem' }} /><Legend /><Bar dataKey="envoyes" fill="#1E40AF" radius={[4, 4, 0, 0]} name="Envoyés" /><Bar dataKey="lus" fill="#059669" radius={[4, 4, 0, 0]} name="Lus" /></BarChart></ResponsiveContainer></div>
          ) : <div className="flex h-72 items-center justify-center text-sm text-gray-400">Aucune donnée pour cette période.</div>}
        </Card>

        <Card title="Répartition par type">
          {pieData.length > 0 ? (
            <div className="h-72"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>{pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
          ) : <div className="flex h-72 items-center justify-center text-sm text-gray-400">Aucun message envoyé à analyser.</div>}
        </Card>
      </div>

      <Card title="Messages les moins lus">
        {stats.unreadMessages.length > 0 ? <Table columns={unreadColumns} data={stats.unreadMessages} keyExtractor={(m) => m.id} emptyMessage="Aucun message non lu à signaler" /> : <div className="py-8 text-center text-sm text-gray-400">Aucun message non lu à signaler.</div>}
      </Card>
    </div>
  );
}
