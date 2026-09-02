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
          <button type="button" onClick={() => void loadDashboard()} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white">
            Réessayer
          </button>
        </div>
      </Card>
    );
  }

  const s = stats;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<GraduationCap className="h-6 w-6" />} label="Élèves" value={formatNumber(s.totalStudents)} color="blue" />
        <StatCard icon={<Users className="h-6 w-6" />} label="Parents" value={formatNumber(s.totalParents)} color="green" />
        <StatCard icon={<Briefcase className="h-6 w-6" />} label="Personnel" value={formatNumber(s.totalStaff)} color="purple" />
        <StatCard icon={<BookOpen className="h-6 w-6" />} label="Classes" value={formatNumber(s.totalClasses)} color="amber" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={<Send className="h-6 w-6" />} label="Messages envoyés" value={formatNumber(s.totalMessagesSent)} color="blue" />
        <StatCard icon={<Eye className="h-6 w-6" />} label="Taux de lecture" value={formatPercentage(s.readRate)} color="green" />
        <StatCard icon={<Clock className="h-6 w-6" />} label="Messages programmés" value={formatNumber(s.scheduledMessages)} color="amber" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Messages par jour cette semaine">
          {s.messagesPerDay?.length ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={s.messagesPerDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => [`${value} messages`, 'Envois']} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-72 items-center justify-center text-sm text-gray-400">Aucune donnée pour cette période.</div>
          )}
        </Card>

        <Card title="Messages récents" action={<Link to="/historique" className="text-sm font-medium text-primary hover:text-primary-dark">Voir tout</Link>}>
          {s.recentMessages?.length ? (
            <div className="space-y-3">
              {s.recentMessages.slice(0, 5).map((msg) => (
                <div key={msg.id} className="flex items-start justify-between rounded-lg border border-gray-50 p-3 transition-colors hover:bg-gray-50">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{msg.title || msg.content.slice(0, 50)}</p>
                    <p className="mt-0.5 text-xs text-gray-400">{formatDateTime(msg.sentAt || msg.createdAt)}</p>
                  </div>
                  <div className="ml-3 flex items-center gap-2">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getPriorityColor(msg.priority))}>{getPriorityLabel(msg.priority)}</span>
                    <span className="text-xs text-gray-400">{msg.totalRecipients} dest.</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400"><Send className="mb-2 h-8 w-8" /><p className="text-sm">Aucun message récent</p></div>
          )}
        </Card>
      </div>
    </div>
  );
}
