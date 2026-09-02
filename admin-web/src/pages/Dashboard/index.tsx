import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Users, Briefcase, BookOpen, Send, Eye, Clock, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import StatCard from '@/components/ui/StatCard';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { statisticsService } from '@/services/statistics.service';
import { formatDateTime, getPriorityLabel, getPriorityColor, formatNumber, formatPercentage } from '@/utils/formatters';
import type { DashboardStats } from '@/types';
import { cn } from '@/utils/cn';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const fallbackStats: DashboardStats = {
  totalStudents: 1247,
  totalParents: 983,
  totalStaff: 86,
  totalClasses: 42,
  totalMessagesSent: 3842,
  readRate: 73.5,
  scheduledMessages: 15,
  recentMessages: [],
  messagesPerDay: [
    { date: 'Lun', count: 45 },
    { date: 'Mar', count: 62 },
    { date: 'Mer', count: 38 },
    { date: 'Jeu', count: 71 },
    { date: 'Ven', count: 54 },
    { date: 'Sam', count: 22 },
    { date: 'Dim', count: 15 },
  ],
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    statisticsService.getDashboard().then((data) => {
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

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<GraduationCap className="h-6 w-6" />} label="Élèves" value={formatNumber(s.totalStudents)} color="blue" change={12} />
        <StatCard icon={<Users className="h-6 w-6" />} label="Parents" value={formatNumber(s.totalParents)} color="green" change={8} />
        <StatCard icon={<Briefcase className="h-6 w-6" />} label="Personnel" value={formatNumber(s.totalStaff)} color="purple" change={2} />
        <StatCard icon={<BookOpen className="h-6 w-6" />} label="Classes" value={formatNumber(s.totalClasses)} color="amber" change={0} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={<Send className="h-6 w-6" />} label="Messages envoyés" value={formatNumber(s.totalMessagesSent)} color="blue" change={18} />
        <StatCard icon={<Eye className="h-6 w-6" />} label="Taux de lecture" value={formatPercentage(s.readRate)} color="green" change={5} />
        <StatCard icon={<Clock className="h-6 w-6" />} label="Messages programmés" value={formatNumber(s.scheduledMessages)} color="amber" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Chart */}
        <Card title="Messages par jour cette semaine">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={s.messagesPerDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e5e7eb', fontSize: '0.8rem' }}
                  formatter={(value: number) => [`${value} messages`, 'Envois']}
                />
                <Bar dataKey="count" fill="#1E40AF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Recent messages */}
        <Card title="Messages récents" action={
          <Link to="/historique" className="text-sm font-medium text-primary hover:text-primary-dark">
            Voir tout
          </Link>
        }>
          {s.recentMessages.length > 0 ? (
            <div className="space-y-3">
              {s.recentMessages.slice(0, 5).map((msg) => (
                <div key={msg.id} className="flex items-start justify-between rounded-lg border border-gray-50 p-3 transition-colors hover:bg-gray-50">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{msg.title || msg.content.slice(0, 50)}</p>
                    <p className="mt-0.5 text-xs text-gray-400">{formatDateTime(msg.sentAt || msg.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getPriorityColor(msg.priority))}>
                      {getPriorityLabel(msg.priority)}
                    </span>
                    <span className="text-xs text-gray-400">{msg.totalRecipients} dest.</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <Send className="mb-2 h-8 w-8" />
              <p className="text-sm">Aucun message récent</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
