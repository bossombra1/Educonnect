import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Users, Briefcase, BookOpen, Send, Eye, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import StatCard from '@/components/ui/StatCard';
import Card from '@/components/ui/Card';
import { statisticsService } from '@/services/statistics.service';
import { formatDateTime, getPriorityLabel, getPriorityColor, formatNumber, formatPercentage } from '@/utils/formatters';
import type { DashboardStats } from '@/types';
import { cn } from '@/utils/cn';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      setStats(await statisticsService.getDashboard());
    } catch (err) {
      setStats(null);
      setError(err instanceof Error ? err.message : 'Impossible de charger les statistiques.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadDashboard(); }, []);

  if (loading) return <LoadingSpinner />;

  if (error || !stats) {
    return (
      <Card title="Tableau de bord">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-red-600">{error ?? 'Aucune donnée de tableau de bord disponible.'}</p>
          <button type="button" onClick={() => void loadDashboard()} className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
            Réessayer
          </button>
        </div>
      </Card>
    );
  }

  const s = stats;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<GraduationCap className="h-5 w-5" />} label="Élèves" value={formatNumber(s.totalStudents)} color="blue" />
        <StatCard icon={<Users className="h-5 w-5" />} label="Parents" value={formatNumber(s.totalParents)} color="green" />
        <StatCard icon={<Briefcase className="h-5 w-5" />} label="Personnel" value={formatNumber(s.totalStaff)} color="purple" />
        <StatCard icon={<BookOpen className="h-5 w-5" />} label="Classes" value={formatNumber(s.totalClasses)} color="amber" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard icon={<Send className="h-5 w-5" />} label="Messages envoyés" value={formatNumber(s.totalMessagesSent)} color="blue" />
        <StatCard icon={<Eye className="h-5 w-5" />} label="Taux de lecture" value={formatPercentage(s.readRate)} color="green" />
        <StatCard icon={<Clock className="h-5 w-5" />} label="Messages programmés" value={formatNumber(s.scheduledMessages)} color="amber" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Messages par jour cette semaine">
          {s.messagesPerDay?.length ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={s.messagesPerDay} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value: number) => [`${value} messages`, 'Envois']} />
                  <Bar dataKey="count" fill="#1E40AF" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-muted">Aucune donnée pour cette période.</div>
          )}
        </Card>

        <Card title="Messages récents" action={<Link to="/historique" className="text-xs font-medium text-primary hover:text-primary-dark">Voir tout</Link>}>
          {s.recentMessages?.length ? (
            <div className="divide-y divide-line">
              {s.recentMessages.slice(0, 5).map((msg) => (
                <div key={msg.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{msg.title || msg.content.slice(0, 50)}</p>
                    <p className="mt-1 text-xs text-muted">{formatDateTime(msg.sentAt || msg.createdAt)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold', getPriorityColor(msg.priority))}>{getPriorityLabel(msg.priority)}</span>
                    <span className="hidden text-xs text-muted sm:inline">{msg.totalRecipients} dest.</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted"><Send className="mb-2 h-7 w-7" /><p className="text-sm">Aucun message récent</p></div>
          )}
        </Card>
      </div>
    </div>
  );
}
