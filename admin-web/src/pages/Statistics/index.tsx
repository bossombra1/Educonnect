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
          <button type="button" onClick={() => void loadStats()} className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
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
    { key: 'title', header: 'Titre', render: (m) => <span className="font-medium text-slate-900">{m.title || m.content.slice(0, 40)}</span> },
    { key: 'date', header: 'Date', render: (m) => <span className="text-sm text-muted">{formatDateTime(m.sentAt || m.createdAt)}</span> },
    { key: 'readRate', header: 'Taux de lecture', render: (m) => {
      const total = Number(m.totalRecipients) || 0;
      const read = Number(m.readCount) || 0;
      const rate = total > 0 ? Math.min(100, (read / total) * 100) : 0;
      return <div className="flex min-w-[130px] items-center gap-2"><div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-primary" style={{ width: `${rate}%` }} /></div><span className="text-xs font-medium text-muted">{rate.toFixed(0)}%</span></div>;
    }},
    { key: 'recipients', header: 'Non lus', render: (m) => <span className="text-sm font-medium text-red-600">{Math.max(0, (Number(m.totalRecipients) || 0) - (Number(m.readCount) || 0))}</span> },
  ];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Statistiques</h1>
        <p className="mt-1 text-sm text-muted">Suivi des envois, de la lecture et de la répartition des messages.</p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card><p className="text-xs font-medium text-muted">Messages envoyés</p><p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{stats.totalSent.toLocaleString('fr-FR')}</p></Card>
        <Card><p className="text-xs font-medium text-muted">Messages lus</p><p className="mt-1 text-2xl font-semibold tracking-tight text-emerald-700">{stats.totalRead.toLocaleString('fr-FR')}</p></Card>
        <Card><p className="text-xs font-medium text-muted">Taux de lecture global</p><p className="mt-1 text-2xl font-semibold tracking-tight text-primary">{stats.readRate.toFixed(1)}%</p></Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Messages par jour">
          {readByMsg.length > 0 ? (
            <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={readByMsg} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" /><XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} allowDecimals={false} /><Tooltip contentStyle={{ borderRadius: '0.5rem', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)', fontSize: '0.8rem' }} /><Legend wrapperStyle={{ fontSize: '0.75rem' }} /><Bar dataKey="envoyes" fill="#1E40AF" radius={[3, 3, 0, 0]} name="Envoyés" /><Bar dataKey="lus" fill="#059669" radius={[3, 3, 0, 0]} name="Lus" /></BarChart></ResponsiveContainer></div>
          ) : <div className="flex h-64 items-center justify-center text-sm text-muted">Aucune donnée pour cette période.</div>}
        </Card>

        <Card title="Répartition par type">
          {pieData.length > 0 ? (
            <div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={52} outerRadius={88} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>{pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
          ) : <div className="flex h-64 items-center justify-center text-sm text-muted">Aucun message envoyé à analyser.</div>}
        </Card>
      </div>

      <Card title="Messages les moins lus">
        {stats.unreadMessages.length > 0 ? <Table columns={unreadColumns} data={stats.unreadMessages} keyExtractor={(m) => m.id} emptyMessage="Aucun message non lu à signaler" /> : <div className="py-8 text-center text-sm text-muted">Aucun message non lu à signaler.</div>}
      </Card>
    </div>
  );
}
